import { action, type KeyDownEvent, type KeyUpEvent } from "@elgato/streamdeck";

import { activateSession, activeSession, nextSession } from "../core/globals";
import { ma3 } from "../core/ma3";
import { type Resolution, state } from "../core/state";
import { DeckAction, type Instance, int, text } from "./base";

const HOLD_MS = 600;

type BankSettings = { bank?: string; label?: string };

/**
 * Selects which attribute bank the "Follow bank" dials control (Dimmer, Position, Gobo, Color,
 * Beam, Focus, ...). Pressing the active bank again moves to its next encoder page.
 */
@action({ UUID: "org.open-gma3-deck.bank" })
export class BankKey extends DeckAction<BankSettings> {
	constructor() {
		super(["bank", "globals"]);
	}

	override onKeyDown(ev: KeyDownEvent<BankSettings>): void {
		const id = text(ev.payload.settings.bank, "position");
		// A bank the show has no attributes for (e.g. Shapers without blade fixtures): do nothing.
		if (!state.banks.some((b) => b.id === id)) {
			if (ev.action.isKey()) void ev.action.showAlert();
			return;
		}
		if (state.bankId === id) state.stepEncoderPage(1, state.dialsPerPage);
		else {
			state.selectBank(id);
			// Keep grandMA3's feature group (and its encoder bar) in step with the deck.
			if (state.globals.featureGroupSync && state.banksOrigin !== "custom") ma3.cmd(`FeatureGroup "${state.bank.name}"`);
		}
	}

	protected render(inst: Instance<BankSettings>): void {
		const id = text(inst.settings.bank, "position");
		const bank = state.banks.find((b) => b.id === id);
		const active = state.bankId === id;
		const pages = bank ? Math.max(1, Math.ceil(bank.attrs.length / state.dialsPerPage)) : 1;
		this.drawKey(inst, {
			// Without a matching bank, show the id as a name ("shapers" -> "Shapers"), not raw.
			label: text(inst.settings.label, bank?.name ?? id.charAt(0).toUpperCase() + id.slice(1)),
			color: bank?.color ?? "#9aa4b1",
			active: active && bank !== undefined,
			bottom: !bank ? "not in patch" : active && pages > 1 ? `${state.encoderPage + 1}/${pages}` : undefined,
			dim: !bank,
		});
	}
}

type EncoderPageSettings = { direction?: "next" | "prev" };

/** Scrolls the active bank to its next / previous set of attributes. */
@action({ UUID: "org.open-gma3-deck.encoder-page" })
export class EncoderPageKey extends DeckAction<EncoderPageSettings> {
	constructor() {
		super(["bank", "globals"]);
	}

	override onKeyDown(ev: KeyDownEvent<EncoderPageSettings>): void {
		state.stepEncoderPage(ev.payload.settings.direction === "prev" ? -1 : 1, state.dialsPerPage);
	}

	protected render(inst: Instance<EncoderPageSettings>): void {
		const pages = state.encoderPageCount(state.dialsPerPage);
		this.drawKey(inst, {
			top: state.bank.name,
			label: inst.settings.direction === "prev" ? "◀ Enc" : "Enc ▶",
			bottom: `${state.encoderPage + 1}/${pages}`,
			color: state.bank.color,
		});
	}
}

type ResolutionSettings = { mode?: "cycle" | Resolution; color?: string };

/** Coarse / fine / ultra encoder resolution, like the encoder resolution on the console. */
@action({ UUID: "org.open-gma3-deck.resolution" })
export class ResolutionKey extends DeckAction<ResolutionSettings> {
	constructor() {
		super(["resolution"]);
	}

	override onKeyDown(ev: KeyDownEvent<ResolutionSettings>): void {
		const mode = ev.payload.settings.mode ?? "cycle";
		if (mode === "cycle") state.cycleResolution();
		else state.setResolution(state.resolution === mode ? "coarse" : mode);
	}

	protected render(inst: Instance<ResolutionSettings>): void {
		const mode = inst.settings.mode ?? "cycle";
		const label = mode === "cycle" ? state.resolution : mode;
		this.drawKey(inst, {
			top: "Encoder",
			label: label[0].toUpperCase() + label.slice(1),
			color: text(inst.settings.color, "cyan"),
			active: mode === "cycle" ? state.resolution !== "coarse" : state.resolution === mode,
		});
	}
}

type PageSettings = { mode?: "next" | "prev" | "set"; page?: string; sync?: boolean; color?: string };

/**
 * Executor page: changes the page followed by Executor keys / dials and (optionally) the page on
 * grandMA3 itself.
 */
@action({ UUID: "org.open-gma3-deck.page" })
export class PageKey extends DeckAction<PageSettings> {
	constructor() {
		super(["page", "names"]);
	}

	override onKeyDown(ev: KeyDownEvent<PageSettings>): void {
		const s = ev.payload.settings;
		const mode = s.mode ?? "next";
		const target = mode === "set" ? int(s.page, 1) : state.page + (mode === "next" ? 1 : -1);
		state.setPage(target);
		if (s.sync !== false) ma3.cmd(`Page ${state.page}`);
	}

	protected render(inst: Instance<PageSettings>): void {
		const s = inst.settings;
		const mode = s.mode ?? "next";
		if (mode === "set") {
			const page = int(s.page, 1);
			const name = state.name(`Page ${page}`);
			this.drawKey(inst, {
				top: "Page",
				label: String(page),
				bottom: name && name !== `Page ${page}` ? name : undefined,
				color: text(s.color, "grey"),
				active: state.page === page,
			});
		} else {
			this.drawKey(inst, { top: "Page", label: mode === "next" ? "Page ▶" : "◀ Page", bottom: `now ${state.page}`, color: text(s.color, "grey") });
		}
	}
}

type StatusSettings = Record<string, never>;

/** Connection monitor: shows target and traffic. Press = test command, hold = sync names. */
@action({ UUID: "org.open-gma3-deck.status" })
export class StatusKey extends DeckAction<StatusSettings> {
	private timer: NodeJS.Timeout | undefined;

	constructor() {
		super(["connection", "globals"]);
	}

	override onWillAppear(ev: Parameters<DeckAction<StatusSettings>["onWillAppear"]>[0]): void {
		super.onWillAppear(ev);
		// Refresh "last received" ageing even when no traffic happens.
		this.timer ??= setInterval(() => this.renderAll(), 2000);
	}

	override onWillDisappear(ev: Parameters<DeckAction<StatusSettings>["onWillDisappear"]>[0]): void {
		super.onWillDisappear(ev);
		if (this.instances.size === 0 && this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	private downAt = new Map<string, number>();

	override onKeyDown(ev: KeyDownEvent<StatusSettings>): void {
		this.downAt.set(ev.action.id, Date.now());
	}

	override onKeyUp(ev: KeyUpEvent<StatusSettings>): void {
		const held = Date.now() - (this.downAt.get(ev.action.id) ?? Date.now());
		this.downAt.delete(ev.action.id);
		ma3.configure();
		if (held >= HOLD_MS) ma3.syncNames(0, true);
		else ma3.cmd(state.globals.testCommand);
	}

	protected render(inst: Instance<StatusSettings>): void {
		const st = ma3.stats;
		const rxAge = st.lastRx ? Math.round((Date.now() - st.lastRx) / 1000) : -1;
		const receiving = rxAge >= 0 && rxAge < 10;
		const lines = [`TX ${st.txCount}`, rxAge < 0 ? "RX —" : `RX ${rxAge < 60 ? rxAge + "s" : Math.floor(rxAge / 60) + "m"}`];
		this.drawKey(inst, {
			top: st.error ? "ERROR" : (activeSession()?.name ?? "grandMA3"),
			label: lines.join("\n"),
			bottom: `${state.globals.host}`,
			color: st.error ? "#ff5b5b" : receiving ? "#3ddc97" : "#f0a830",
			active: receiving,
			mono: false,
		});
	}
}

type SessionSettings = { session?: string };

/**
 * Switches every action to a saved connection (session). "Next" cycles through all sessions.
 * Hold to re-sync names from grandMA3.
 */
@action({ UUID: "org.open-gma3-deck.session" })
export class SessionKey extends DeckAction<SessionSettings> {
	private downAt = new Map<string, number>();

	constructor() {
		super(["globals", "connection"]);
	}

	override onKeyDown(ev: KeyDownEvent<SessionSettings>): void {
		this.downAt.set(ev.action.id, Date.now());
	}

	override async onKeyUp(ev: KeyUpEvent<SessionSettings>): Promise<void> {
		const held = Date.now() - (this.downAt.get(ev.action.id) ?? Date.now());
		this.downAt.delete(ev.action.id);
		if (held >= HOLD_MS) {
			ma3.syncNames(0, true);
			return;
		}
		const id = text(ev.payload.settings.session, "next");
		const ok = id === "next" ? await nextSession() : await activateSession(id);
		if (!ok && ev.action.isKey()) await ev.action.showAlert();
	}

	protected render(inst: Instance<SessionSettings>): void {
		const id = text(inst.settings.session, "next");
		const current = activeSession();
		const target = id === "next" ? current : state.globals.sessions.find((s) => s.id === id);
		const rxAge = ma3.stats.lastRx ? Date.now() - ma3.stats.lastRx : Infinity;
		const isActive = id !== "next" && current?.id === id;
		this.drawKey(inst, {
			top: id === "next" ? "Session ▶" : "Session",
			label: target?.name ?? (id === "next" ? "No sessions" : "Missing"),
			bottom: target ? target.host : undefined,
			color: isActive || id === "next" ? (rxAge < 10000 ? "#3ddc97" : "#f0a830") : "#9aa4b1",
			active: isActive,
			dim: !target,
		});
	}
}
