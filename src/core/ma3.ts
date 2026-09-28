import dgram from "node:dgram";
import os from "node:os";

import streamDeck from "@elgato/streamdeck";

import { fillTemplate, formatNumber } from "./cmdline";
import { banksFromShow } from "./banks";
import { MATRICKS_PROPERTIES } from "./matricks";
import {
	buildAttributeSyncCommand,
	buildSyncCommand,
	type ExecInfo,
	friendlyAttribute,
	parseAttributeChunk,
	parseExecChunk,
	parseNamesChunk,
	parseObjectFeedback,
} from "./names";
import { decodePacket, encodeMessage, type OscArg, type OscMessage } from "./osc";
import { state } from "./state";

export type ConnectionStats = {
	txCount: number;
	rxCount: number;
	lastTx: number;
	lastRx: number;
	lastRxAddress: string;
	lastCommand: string;
	listening: boolean;
	error: string;
	/** When a name sync was last requested, and how many names grandMA3 returned. */
	syncRequested: number;
	namesCount: number;
};

/**
 * grandMA3 OSC client. One UDP socket is used for both sending and receiving.
 *
 * grandMA3 setup (Menu > In & Out > OSC), see the README for details:
 * - line 1: port = OSC port, Receive + Receive Command = Yes (commands from the deck)
 * - line 2: destination = this computer, port = feedback port, Send + Send Command = Yes
 *   (executor feedback and name sync)
 */
class MA3Client {
	readonly stats: ConnectionStats = {
		txCount: 0,
		rxCount: 0,
		lastTx: 0,
		lastRx: 0,
		lastRxAddress: "",
		lastCommand: "",
		listening: false,
		error: "",
		syncRequested: 0,
		namesCount: 0,
	};

	private socket: dgram.Socket | undefined;
	private boundKey = "";
	private pendingAttr = new Map<string, number>();
	private attrTimer: NodeJS.Timeout | undefined;
	private pendingLatest = new Map<string, () => void>();
	private latestTimers = new Map<string, NodeJS.Timeout>();
	private lastLatestSend = new Map<string, number>();
	private staging: Map<string, string> | undefined;
	private stagingTimer: NodeJS.Timeout | undefined;
	private syncTimer: NodeJS.Timeout | undefined;
	private syncFull = false;
	private attrStaging: Array<{ group: string; attrs: string[] }> | undefined;
	private execStaging: ExecInfo[] = [];

	/**
	 * Local address to listen on. grandMA3 binds the port of every OSC line (even send-only
	 * ones) on all interfaces, so when it runs on this computer we must bind the exact address
	 * it sends to: the more specific binding receives the packets.
	 */
	private bindAddress(): string {
		const host = state.globals.host;
		if (host === "localhost" || host.startsWith("127.")) return "127.0.0.1";
		for (const list of Object.values(os.networkInterfaces())) {
			for (const a of list ?? []) {
				if (a.family === "IPv4" && a.address === host) return host;
			}
		}
		return "0.0.0.0";
	}

	/** (Re)opens the UDP socket when the listen address or port changed. */
	configure(): void {
		const port = state.globals.listenPort;
		const address = this.bindAddress();
		const key = `${address}:${port}`;
		if (this.socket && this.boundKey === key) return;
		this.close();

		const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
		this.socket = socket;
		this.boundKey = key;
		this.stats.error = "";

		socket.on("error", (err) => {
			streamDeck.logger.error(`OSC socket error: ${err.message}`);
			this.stats.error = err.message;
			this.stats.listening = false;
			state.notify("connection");
			// Port in use etc.: fall back to an ephemeral port so sending still works.
			if (this.socket === socket && port !== 0) {
				this.close();
				this.socket = dgram.createSocket("udp4");
				this.boundKey = `${address}:0`;
				this.socket.on("message", (msg) => this.onPacket(msg));
				this.socket.bind(0);
			}
		});
		socket.on("message", (msg) => this.onPacket(msg));
		socket.on("listening", () => {
			this.stats.listening = port !== 0;
			const a = socket.address();
			streamDeck.logger.info(`OSC socket bound to ${a.address}:${a.port}`);
			state.notify("connection");
		});
		socket.bind(port, address);
	}

	close(): void {
		try {
			this.socket?.close();
		} catch {
			// already closed
		}
		this.socket = undefined;
		this.boundKey = "";
		this.stats.listening = false;
	}

	/**
	 * Asks grandMA3 for pool and executor names (see core/names.ts). With `full`, also for the
	 * patched attributes that build the encoder banks. Debounced, so page changes and settings
	 * edits in quick succession produce one request.
	 */
	syncNames(delay = 250, full = false): void {
		if (state.globals.feedbackLine <= 0 || state.globals.listenPort <= 0) return;
		this.syncFull ||= full;
		clearTimeout(this.syncTimer);
		this.syncTimer = setTimeout(() => {
			this.configure();
			this.stats.syncRequested = Date.now();
			this.cmd(buildSyncCommand(state.globals.feedbackLine, state.pagesInUse()));
			if (this.syncFull && state.globals.bankSource === "show") this.cmd(buildAttributeSyncCommand(state.globals.feedbackLine));
			this.syncFull = false;
		}, delay);
	}

	/** Handles the replies of the name sync Lua (`/<prefix>/deck/...`). */
	private handleNames(m: OscMessage): boolean {
		const match = /\/deck\/(begin|names|done|attrbegin|attrs|attrdone)$/.exec(m.address);
		if (!match) return false;
		const payload = typeof m.args[0] === "string" ? m.args[0] : "";
		switch (match[1]) {
			case "attrbegin":
				this.attrStaging = [];
				return true;
			case "attrs": {
				const chunk = parseAttributeChunk(payload);
				if (!chunk) return true;
				const list = (this.attrStaging ??= []);
				const existing = list.find((g) => g.group === chunk.group);
				if (existing) existing.attrs.push(...chunk.attrs);
				else list.push(chunk);
				return true;
			}
			case "attrdone":
				if (this.attrStaging) {
					state.setShowBanks(banksFromShow(this.attrStaging, friendlyAttribute));
					streamDeck.logger.info(`Built ${state.showBanks.length} encoder banks from the grandMA3 patch`);
				}
				this.attrStaging = undefined;
				return true;
			case "begin":
				this.staging = new Map();
				this.execStaging = [];
				break;
			case "names":
				for (const [key, name] of parseNamesChunk(payload)) (this.staging ?? state.names).set(key, name);
				this.execStaging.push(...parseExecChunk(payload));
				break;
			case "done":
				this.applyExecInfo(this.execStaging);
				if (this.staging) state.setNames(this.staging);
				else state.notify("names");
				this.staging = undefined;
				this.stats.namesCount = state.names.size;
				streamDeck.logger.info(`Synced ${state.names.size} names from grandMA3`);
				break;
		}
		// If "done" never arrives (script error), apply what we have after a moment.
		clearTimeout(this.stagingTimer);
		if (this.staging) {
			this.stagingTimer = setTimeout(() => {
				if (this.staging) state.setNames(this.staging);
				this.staging = undefined;
			}, 3000);
		}
		return true;
	}

	private path(...parts: string[]): string {
		const prefix = state.globals.prefix;
		return "/" + [prefix, ...parts].filter(Boolean).join("/");
	}

	send(address: string, args: Array<OscArg | number | string | boolean | null> = []): void {
		if (!this.socket) this.configure();
		const { host, port } = state.globals;
		try {
			const packet = encodeMessage(address, args);
			this.socket!.send(packet, port, host, (err) => {
				if (err) {
					this.stats.error = err.message;
					state.notify("connection");
				}
			});
			this.stats.txCount++;
			this.stats.lastTx = Date.now();
		} catch (err) {
			this.stats.error = err instanceof Error ? err.message : String(err);
			streamDeck.logger.error(`OSC send failed: ${this.stats.error}`);
		}
		state.notify("connection");
	}

	/** Executes a command line on grandMA3 (`/<prefix>/cmd ,s "<command>"`). */
	cmd(command: string): void {
		const c = command.trim();
		if (!c) return;
		this.stats.lastCommand = c;
		const shown = c.startsWith("Lua ") ? "Lua (sync)" : c;
		streamDeck.logger.info(`cmd -> ${state.globals.host}:${state.globals.port} /${state.globals.prefix}/cmd "${shown}"`);
		this.send(this.path("cmd"), [{ type: "s", value: c }]);
	}

	cmds(commands: string[]): void {
		for (const c of commands) this.cmd(c);
	}

	/** Presses / releases an executor button using the button's function configured in grandMA3. */
	executorKey(page: number, exec: number, down: boolean): void {
		if (state.globals.execTransport === "cmd") {
			// Without native OSC keys the closest equivalent of a press is Go+ / Flash.
			if (down) this.cmd(`Go+ Page ${page}.${exec}`);
			return;
		}
		streamDeck.logger.info(`key -> /Page${page}/Key${exec} ${down ? 1 : 0}`);
		this.send(this.path(`Page${page}`, `Key${exec}`), [{ type: "i", value: down ? 1 : 0 }]);
	}

	/** Sets an executor fader (0-100). Rate limited: only the latest value is sent. */
	executorFader(page: number, exec: number, value: number, fader = "Master"): void {
		const v = Math.max(0, Math.min(100, value));
		this.latest(`fader:${page}.${exec}.${fader}`, () => {
			if (state.globals.execTransport === "cmd" || fader !== "Master") {
				this.cmd(`Fader${fader} Page ${page}.${exec} At ${formatNumber(v)}`);
			} else {
				const arg: OscArg = state.globals.faderArgType === "f" ? { type: "f", value: v } : { type: "i", value: Math.round(v) };
				this.send(this.path(`Page${page}`, `Fader${exec}`), [arg]);
			}
		});
	}

	/**
	 * Queues a relative attribute change. Changes are summed and flushed every `throttleMs`, so a
	 * fast spin produces a few larger commands instead of flooding the console.
	 */
	attributeDelta(attr: string, delta: number, layer = ""): void {
		if (!attr || !delta) return;
		const key = `${attr}\u0001${layer}`;
		this.pendingAttr.set(key, (this.pendingAttr.get(key) ?? 0) + delta);
		if (!this.attrTimer) {
			this.attrTimer = setTimeout(() => this.flushAttributes(), state.globals.throttleMs);
		}
	}

	private flushAttributes(): void {
		this.attrTimer = undefined;
		const template = state.globals.attributeTemplate;
		for (const [key, delta] of this.pendingAttr) {
			const [attr, layer] = key.split("\u0001");
			const rounded = Math.round(delta * 1000) / 1000;
			if (rounded === 0) continue;
			this.cmd(
				fillTemplate(template, {
					attr,
					layer: layer ? `${layer} ` : "",
					delta: formatNumber(rounded),
					sign: rounded < 0 ? "-" : "+",
					abs: formatNumber(Math.abs(rounded)),
				}),
			);
		}
		this.pendingAttr.clear();
	}

	/**
	 * Sets (or with undefined clears) a MAtricks property of the current grandMA3 selection.
	 * Verified on grandMA3 2.4: `Set Selection Property "XWings" 2` / `... "None"`.
	 */
	matricks(property: string, value: number | undefined): void {
		state.setMatricks(property, value);
		this.latest(`matricks:${property}`, () =>
			this.cmd(`Set Selection Property "${property}" ${value === undefined ? '"None"' : formatNumber(value)}`),
		);
	}

	/** Clears every MAtricks property of the selection with one command line. */
	matricksReset(): void {
		state.matricks.clear();
		state.notify("matricks");
		const list = MATRICKS_PROPERTIES.map((p) => `'${p.id}'`).join(",");
		this.cmd(`Lua "local q=string.char(34) for _,p in ipairs({${list}}) do Cmd('Set Selection Property '..q..p..q..' '..q..'None'..q) end"`);
	}

	/** Runs `fn` now or after the throttle window; newer calls with the same key replace older. */
	latest(key: string, fn: () => void): void {
		const wait = state.globals.throttleMs - (Date.now() - (this.lastLatestSend.get(key) ?? 0));
		if (wait <= 0 && !this.latestTimers.has(key)) {
			this.lastLatestSend.set(key, Date.now());
			fn();
			return;
		}
		this.pendingLatest.set(key, fn);
		if (!this.latestTimers.has(key)) {
			this.latestTimers.set(
				key,
				setTimeout(() => {
					this.latestTimers.delete(key);
					const pending = this.pendingLatest.get(key);
					this.pendingLatest.delete(key);
					if (pending) {
						this.lastLatestSend.set(key, Date.now());
						pending();
					}
				}, Math.max(1, wait)),
			);
		}
	}

	private onPacket(buf: Buffer): void {
		let messages: OscMessage[];
		try {
			messages = decodePacket(buf);
		} catch (err) {
			streamDeck.logger.warn(`Bad OSC packet: ${err instanceof Error ? err.message : err}`);
			return;
		}
		this.stats.rxCount += messages.length;
		this.stats.lastRx = Date.now();
		for (const m of messages) {
			this.stats.lastRxAddress = m.address;
			if (!this.handleNames(m)) this.handleFeedback(m);
		}
		state.notify("connection");
	}

	/** Stores which object path belongs to which executor, and the executors' current state. */
	private applyExecInfo(list: ExecInfo[]): void {
		if (list.length === 0) return;
		const byPath = new Map<string, string[]>();
		for (const e of list) {
			if (e.path) byPath.set(e.path, [...(byPath.get(e.path) ?? []), `${e.page}.${e.exec}`]);
			const patch: { key?: boolean; fader?: number } = {};
			if (e.running !== undefined) patch.key = e.running;
			if (e.fader !== undefined) patch.fader = e.fader;
			Object.assign(state.executor(e.page, e.exec), patch, { updated: Date.now() });
		}
		state.execByPath = byPath;
		state.notify("executors");
		streamDeck.logger.info(`Mapped ${list.length} executors for feedback`);
	}

	/**
	 * Understands the executor feedback grandMA3 sends when "Send" is enabled, e.g.
	 * `/gma3/Page1/Fader201 ,i 100` or `/gma3/Page1/Key201 ,i 1`. Extra string arguments
	 * (such as the fader type) are ignored; the last numeric argument is taken as the value.
	 */
	handleFeedback(m: OscMessage): void {
		// grandMA3 2.4: feedback addressed by object path (see parseObjectFeedback).
		const obj = parseObjectFeedback(m.address, m.args);
		if (obj) {
			for (const key of state.execByPath.get(obj.path) ?? []) {
				const [page, exec] = key.split(".").map(Number);
				const patch: { key?: boolean; fader?: number } = {};
				if (obj.running !== undefined && obj.running !== state.executors.get(key)?.key) {
					streamDeck.logger.info(`feedback: executor ${key} ${obj.running ? "running" : "off"}`);
				}
				if (obj.running !== undefined) patch.key = obj.running;
				if (obj.fader !== undefined) patch.fader = obj.fader;
				state.updateExecutor(page, exec, patch);
			}
			return;
		}
		const match = /\/Page(\d+)\/(Fader|Key|Button)(\d+)$/i.exec(m.address);
		if (!match) return;
		const page = parseInt(match[1], 10);
		const exec = parseInt(match[3], 10);
		const numeric = m.args.filter((a): a is number | boolean => typeof a === "number" || typeof a === "boolean");
		const last = numeric[numeric.length - 1];
		if (last === undefined) return;
		const value = typeof last === "boolean" ? (last ? 1 : 0) : last;
		if (match[2].toLowerCase() === "fader") {
			// Some versions send 0..1, others 0..100.
			const percent = value <= 1 && !Number.isInteger(value) ? value * 100 : value;
			state.updateExecutor(page, exec, { fader: percent });
		} else {
			state.updateExecutor(page, exec, { key: value > 0 });
		}
	}
}

export const ma3 = new MA3Client();
