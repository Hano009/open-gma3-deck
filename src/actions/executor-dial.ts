import { action, type DialDownEvent, type DialRotateEvent, type DialUpEvent, type TouchTapEvent } from "@elgato/streamdeck";

import { formatNumber } from "../core/cmdline";
import { resolveColor, shade } from "../core/colors";
import { ma3 } from "../core/ma3";
import { state } from "../core/state";
import { DeckAction, float, type Instance, int, text } from "./base";

type Settings = {
	/** Empty = follow the page selected with the Page keys. */
	page?: string;
	exec?: string;
	/** Fader function: Master, X, XA, XB, Temp, Rate, Speed, Time. */
	fader?: string;
	/** Percent per tick in coarse resolution. */
	step?: string;
	label?: string;
	/** Push: press the executor button ("key"), toggle 0 / 100 ("toggle") or nothing. */
	push?: "key" | "toggle" | "none";
	color?: string;
};

/**
 * Executor fader on a dial. Shows the level on the touch strip; follows grandMA3 when OSC feedback
 * is enabled so moving the fader on the console updates the strip.
 */
@action({ UUID: "org.open-gma3-deck.executor-dial" })
export class ExecutorDial extends DeckAction<Settings> {
	/** Values of non-master fader functions, which grandMA3 does not echo back. */
	private local = new Map<string, number>();
	private lastNonZero = new Map<string, number>();

	constructor() {
		super(["page", "executors", "resolution", "names"]);
	}

	private target(s: Settings): { page: number; exec: number; fader: string; key: string } {
		const page = text(s.page) ? int(s.page, 1) : state.page;
		const exec = int(s.exec, 201);
		const fader = text(s.fader, "Master");
		return { page, exec, fader, key: `${page}.${exec}.${fader}` };
	}

	private value(t: ReturnType<ExecutorDial["target"]>): number {
		if (t.fader === "Master") return state.executors.get(`${t.page}.${t.exec}`)?.fader ?? this.local.get(t.key) ?? 0;
		return this.local.get(t.key) ?? 0;
	}

	private set(t: ReturnType<ExecutorDial["target"]>, value: number): void {
		const v = Math.max(0, Math.min(100, value));
		this.local.set(t.key, v);
		if (v > 0) this.lastNonZero.set(t.key, v);
		ma3.executorFader(t.page, t.exec, v, t.fader);
		if (t.fader === "Master") state.updateExecutor(t.page, t.exec, { fader: v });
		else this.renderAll();
	}

	override onDialRotate(ev: DialRotateEvent<Settings>): void {
		const s = ev.payload.settings;
		const t = this.target(s);
		const step = float(s.step, 2);
		const accel = state.globals.acceleration && Math.abs(ev.payload.ticks) > 2 ? Math.abs(ev.payload.ticks) / 2 : 1;
		this.set(t, this.value(t) + ev.payload.ticks * step * state.resolutionFactor() * accel);
	}

	override onDialDown(ev: DialDownEvent<Settings>): void {
		const s = ev.payload.settings;
		const t = this.target(s);
		const push = s.push ?? "key";
		if (push === "key") ma3.executorKey(t.page, t.exec, true);
		else if (push === "toggle") this.toggle(t);
	}

	override onDialUp(ev: DialUpEvent<Settings>): void {
		const s = ev.payload.settings;
		if ((s.push ?? "key") !== "key") return;
		const t = this.target(s);
		ma3.executorKey(t.page, t.exec, false);
	}

	override onTouchTap(ev: TouchTapEvent<Settings>): void {
		const t = this.target(ev.payload.settings);
		if (ev.payload.hold) this.set(t, 0);
		else this.toggle(t);
	}

	private toggle(t: ReturnType<ExecutorDial["target"]>): void {
		this.set(t, this.value(t) > 0 ? 0 : (this.lastNonZero.get(t.key) ?? 100));
	}

	protected render(inst: Instance<Settings>): void {
		const s = inst.settings;
		const t = this.target(s);
		this.usePage(inst, text(s.page) ? t.page : undefined);
		const v = this.value(t);
		const keyOn = state.executors.get(`${t.page}.${t.exec}`)?.key === true;
		this.drawDial(inst, {
			head: text(s.label) || state.name(`Exec ${t.page}.${t.exec}`) || `Exec ${t.page}.${t.exec}`,
			value: `${formatNumber(Math.round(v * 10) / 10)}%`,
			sub: `${t.fader === "Master" ? "Fader" : t.fader}${keyOn ? " · ON" : ""}${text(s.page) ? "" : " · follows page"}`,
			bar: { value: Math.round(v), bar_fill_c: keyOn || v > 0 ? resolveColor(s.color, "amber") : shade(resolveColor(s.color, "amber"), 0.45) },
		});
	}
}
