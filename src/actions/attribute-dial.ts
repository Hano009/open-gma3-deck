import {
	action,
	type DialDownEvent,
	type DialRotateEvent,
	type DialUpEvent,
	type TouchTapEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { formatNumber, splitCommands } from "../core/cmdline";
import { resolveColor } from "../core/colors";
import { layerInfo } from "../core/layers";
import { ma3 } from "../core/ma3";
import { state } from "../core/state";
import { DeckAction, float, type Instance, int, text } from "./base";

type Settings = {
	/** "bank": follow the active bank, by dial position. "fixed": always the attribute below. */
	mode?: "bank" | "fixed";
	/** Optional fixed slot (1 based) inside the bank; empty = the dial's own position. */
	slot?: string;
	attr?: string;
	label?: string;
	/** Coarse step per tick; empty = bank default. */
	step?: string;
	invert?: boolean;
	/** Optional command(s) on push / touch instead of the default behaviour. */
	push?: string;
	touch?: string;
};

type Resolved = { attr: string; label: string; step: number; color: string; head: string } | undefined;

/**
 * The main encoder: turns a Stream Deck + dial into a grandMA3 attribute encoder.
 *
 * - Rotate: change the attribute of the current selection (relative)
 * - Rotate while pressed: fine (x fine factor)
 * - Push: next encoder page of the bank (or custom command)
 * - Touch: next bank (or custom command); long touch: cycle coarse / fine / ultra
 */
@action({ UUID: "org.open-gma3-deck.attribute-dial" })
export class AttributeDial extends DeckAction<Settings> {
	private pressed = new Map<string, boolean>();
	private rotatedWhilePressed = new Set<string>();
	/** Movement since the attribute was last changed, drawn as a centre bar for visual feedback. */
	private travel = new Map<string, { attr: string; value: number }>();

	constructor() {
		super(["bank", "resolution", "globals", "layer"]);
	}

	override onWillAppear(ev: WillAppearEvent<Settings>): void {
		super.onWillAppear(ev);
		this.updateDialsPerPage();
	}

	override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
		super.onWillDisappear(ev);
		this.updateDialsPerPage();
	}

	/** Encoder paging uses the widest Stream Deck + in use (4 dials on +, 6 on + XL). */
	private updateDialsPerPage(): void {
		let max = 0;
		for (const inst of this.instances.values()) {
			if (inst.settings.mode !== "fixed") max = Math.max(max, this.dialCount(inst));
		}
		const next = max || 4;
		if (next !== state.dialsPerPage) {
			state.dialsPerPage = next;
			state.notify("bank");
		}
	}

	private resolve(inst: Instance<Settings>): Resolved {
		const s = inst.settings;
		const stepOverride = float(s.step, NaN);
		if (s.mode === "fixed") {
			const attr = text(s.attr);
			if (!attr) return undefined;
			return { attr, label: text(s.label, attr), step: Number.isFinite(stepOverride) ? stepOverride : 1, color: "#f0a830", head: "Attribute" };
		}
		const bank = state.bank;
		const pageSize = state.dialsPerPage;
		const slot = (text(s.slot) ? int(s.slot, 1) - 1 : inst.column) % pageSize;
		const index = state.encoderPage * pageSize + slot;
		const a = bank.attrs[index];
		const pages = state.encoderPageCount(pageSize);
		const head = pages > 1 ? `${bank.name} ${state.encoderPage + 1}/${pages}` : bank.name;
		if (!a) return { attr: "", label: "—", step: 0, color: bank.color, head };
		return {
			attr: a.attr,
			label: text(s.label, a.label ?? a.attr),
			step: Number.isFinite(stepOverride) ? stepOverride : (a.step ?? 1),
			color: bank.color,
			head,
		};
	}

	override onDialRotate(ev: DialRotateEvent<Settings>): void {
		const inst = this.instance(ev.action);
		if (!inst) return;
		const r = this.resolve(inst);
		if (!r || !r.attr) return;

		const { ticks, pressed } = ev.payload;
		if (pressed) this.rotatedWhilePressed.add(inst.id);

		let factor = state.resolutionFactor();
		if (pressed) factor *= state.globals.fineFactor;
		// Acceleration: fast spins (several ticks per event) grow quadratically.
		const accel = state.globals.acceleration && Math.abs(ticks) > 2 ? Math.abs(ticks) / 2 : 1;
		// Timing / phaser layers have their own natural step (seconds, degrees, percent).
		const step = layerInfo(state.layer).step ?? r.step;
		const delta = ticks * step * factor * accel * (inst.settings.invert ? -1 : 1);

		ma3.attributeDelta(r.attr, delta, state.layer);

		const t = this.travel.get(inst.id);
		const value = (t && t.attr === r.attr ? t.value : 0) + delta;
		this.travel.set(inst.id, { attr: r.attr, value });
		this.render(inst);
	}

	override onDialDown(ev: DialDownEvent<Settings>): void {
		this.pressed.set(ev.action.id, true);
		this.rotatedWhilePressed.delete(ev.action.id);
	}

	override onDialUp(ev: DialUpEvent<Settings>): void {
		this.pressed.delete(ev.action.id);
		// A press used for fine adjustment is not a click.
		if (this.rotatedWhilePressed.delete(ev.action.id)) return;
		const s = ev.payload.settings;
		const custom = splitCommands(s.push);
		if (custom.length) ma3.cmds(custom);
		else if (s.mode === "fixed") state.cycleResolution();
		else state.stepEncoderPage(1, state.dialsPerPage);
	}

	override onTouchTap(ev: TouchTapEvent<Settings>): void {
		if (ev.payload.hold) {
			state.cycleResolution();
			return;
		}
		const custom = splitCommands(ev.payload.settings.touch);
		if (custom.length) ma3.cmds(custom);
		else if (ev.payload.settings.mode !== "fixed") state.cycleBank(1);
	}

	protected render(inst: Instance<Settings>): void {
		const r = this.resolve(inst);
		if (!r || !r.attr) {
			this.drawDial(inst, {
				head: r?.head ?? "Attribute",
				value: r ? "—" : "Set attribute",
				sub: "",
				bar: { value: 50, bar_fill_c: "#3a3d42" },
			});
			return;
		}
		const factor = state.resolutionFactor();
		const t = this.travel.get(inst.id);
		const moved = t && t.attr === r.attr ? t.value : 0;
		// Show travel relative to one "turn" worth of coarse steps so small moves are still visible.
		const layer = layerInfo(state.layer);
		const step = layer.step ?? r.step;
		const span = Math.max(step * 50, 1e-6);
		const bar = 50 + Math.max(-50, Math.min(50, (moved / span) * 50));
		const res = state.resolution === "coarse" ? "" : ` · ${state.resolution}`;
		this.drawDial(inst, {
			head: layer.id ? `${r.head} · ${layer.label}` : r.head,
			value: r.label,
			sub: `Δ ${moved >= 0 ? "+" : ""}${formatNumber(moved)}${layer.unit}  ±${formatNumber(step * factor)}${res}`,
			bar: { value: Math.round(bar), bar_fill_c: layer.id ? resolveColor(layer.color, "amber") : r.color },
		});
	}
}
