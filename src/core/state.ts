import { EventEmitter } from "node:events";

import { type Bank, DEFAULT_BANKS, parseBanks } from "./banks";
import { LAYERS, type Layer } from "./layers";
import { appendToken, backspace } from "./cmdline";
import { DEFAULT_GLOBALS, type GlobalSettings, normalizeGlobals } from "./settings";

export type Resolution = "coarse" | "fine" | "ultra";

export type Topic = "globals" | "page" | "bank" | "resolution" | "cmdline" | "toggles" | "executors" | "connection" | "names" | "layer" | "matricks";

/** Live value of an executor, fed by OSC feedback from grandMA3 or by our own dials. */
export type ExecutorState = {
	fader?: number;
	key?: boolean;
	name?: string;
	updated: number;
};

/**
 * Shared "console" state: everything that must stay consistent across keys, dials and devices,
 * so an XL and a + XL behave like one command wing.
 */
class DeckState extends EventEmitter {
	globals: GlobalSettings = DEFAULT_GLOBALS;
	/** Global settings exactly as stored by Stream Deck (needed to write them back). */
	rawGlobals: Record<string, unknown> = {};
	banks: Bank[] = DEFAULT_BANKS;
	banksError: string | undefined;
	/** Banks built from the patched fixtures in grandMA3 (empty until synced). */
	showBanks: Bank[] = [];
	/** Where the active banks come from, for the property inspector. */
	banksOrigin: "custom" | "show" | "builtin" = "builtin";
	/** Encoder layer: "" = absolute values, else Fade, Delay, Speed, Phase, Width, ... */
	layer: Layer = "";
	/** MAtricks values we have set on the grandMA3 selection (property -> value). */
	matricks = new Map<string, number>();

	page = 1;
	bankId = DEFAULT_BANKS[1].id;
	/** Encoder page within the active bank (0 based). */
	encoderPage = 0;
	resolution: Resolution = "coarse";
	cmdline = "";
	/** Last command line sent with Please, shown dimmed on the command line key. */
	lastSent = "";
	/** Dials per encoder page; the largest dial count of any connected Stream Deck +. */
	dialsPerPage = 4;
	/** Latched state of mode keys such as Highlight or Blind. */
	toggles = new Map<string, boolean>();
	executors = new Map<string, ExecutorState>();
	/** Names synced from grandMA3, keyed like "Group 3", "Preset 4.12", "Exec 1.201", "Page 2". */
	names = new Map<string, string>();
	namesSyncedAt = 0;
	/** Pages used by fixed-page executor keys / dials (instance id -> page), for name sync. */
	pageRefs = new Map<string, number>();

	constructor() {
		super();
		this.setMaxListeners(100);
	}

	notify(topic: Topic): void {
		this.emit("change", topic);
	}

	setGlobals(raw: Record<string, unknown> | undefined): void {
		this.rawGlobals = { ...(raw ?? {}) };
		this.globals = normalizeGlobals(raw);
		this.refreshBanks();
		this.notify("globals");
	}

	setShowBanks(banks: Bank[]): void {
		this.showBanks = banks;
		this.refreshBanks();
	}

	/** Custom JSON wins, then the banks from the show, then the built-in ones. */
	refreshBanks(): void {
		const custom = this.globals.banksJson.trim();
		const parsed = parseBanks(custom);
		this.banksError = parsed.error;
		if (custom && !parsed.error) {
			this.banks = parsed.banks;
			this.banksOrigin = "custom";
		} else if (this.globals.bankSource === "show" && this.showBanks.length > 0) {
			this.banks = this.showBanks;
			this.banksOrigin = "show";
		} else {
			this.banks = DEFAULT_BANKS;
			this.banksOrigin = "builtin";
		}
		if (!this.banks.some((b) => b.id === this.bankId)) {
			this.bankId = (this.banks.find((b) => b.id === "position") ?? this.banks[0]).id;
			this.encoderPage = 0;
		}
		this.notify("bank");
	}

	setLayer(layer: Layer): void {
		this.layer = LAYERS.some((l) => l.id === layer) ? layer : "";
		this.notify("layer");
	}

	setMatricks(property: string, value: number | undefined): void {
		if (value === undefined) this.matricks.delete(property);
		else this.matricks.set(property, value);
		this.notify("matricks");
	}

	get bank(): Bank {
		return this.banks.find((b) => b.id === this.bankId) ?? this.banks[0];
	}

	setPage(page: number): void {
		const next = Math.max(1, Math.min(9999, Math.round(page)));
		if (next === this.page) return;
		this.page = next;
		this.notify("page");
	}

	selectBank(id: string): void {
		if (this.bankId === id) return;
		this.bankId = id;
		this.encoderPage = 0;
		this.notify("bank");
	}

	cycleBank(direction: 1 | -1): void {
		const index = this.banks.findIndex((b) => b.id === this.bankId);
		const next = (index + direction + this.banks.length) % this.banks.length;
		this.selectBank(this.banks[next].id);
	}

	/** Number of encoder pages the active bank needs for the given number of dials. */
	encoderPageCount(dials: number): number {
		return Math.max(1, Math.ceil(this.bank.attrs.length / Math.max(1, dials)));
	}

	stepEncoderPage(direction: 1 | -1, dials: number): void {
		const count = this.encoderPageCount(dials);
		this.encoderPage = (this.encoderPage + direction + count) % count;
		this.notify("bank");
	}

	setResolution(res: Resolution): void {
		this.resolution = res;
		this.notify("resolution");
	}

	cycleResolution(): void {
		const order: Resolution[] = ["coarse", "fine", "ultra"];
		this.setResolution(order[(order.indexOf(this.resolution) + 1) % order.length]);
	}

	resolutionFactor(): number {
		if (this.resolution === "fine") return this.globals.fineFactor;
		if (this.resolution === "ultra") return this.globals.ultraFactor;
		return 1;
	}

	setCmdline(text: string): void {
		this.cmdline = text;
		this.notify("cmdline");
	}

	appendCmdline(token: string): void {
		this.setCmdline(appendToken(this.cmdline, token));
	}

	backspaceCmdline(): void {
		this.setCmdline(backspace(this.cmdline));
	}

	setToggle(key: string, on: boolean): void {
		this.toggles.set(key, on);
		this.notify("toggles");
	}

	setNames(names: Map<string, string>): void {
		this.names = names;
		this.namesSyncedAt = Date.now();
		this.notify("names");
	}

	/** Name from grandMA3 for an object key such as "Group 3", or undefined. */
	name(key: string): string | undefined {
		return this.names.get(key);
	}

	/** Pages whose executor names should be synced: the current page plus fixed pages in use. */
	pagesInUse(): number[] {
		return [...new Set([this.page, ...this.pageRefs.values()])].sort((a, b) => a - b);
	}

	executor(page: number, exec: number): ExecutorState {
		const key = `${page}.${exec}`;
		let s = this.executors.get(key);
		if (!s) {
			s = { updated: 0 };
			this.executors.set(key, s);
		}
		return s;
	}

	updateExecutor(page: number, exec: number, patch: Partial<ExecutorState>): void {
		Object.assign(this.executor(page, exec), patch, { updated: Date.now() });
		this.notify("executors");
	}
}

export const state = new DeckState();
