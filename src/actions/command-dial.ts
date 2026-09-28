import { action, type DialDownEvent, type DialRotateEvent, type TouchTapEvent } from "@elgato/streamdeck";

import { fillTemplate, formatNumber, splitCommands } from "../core/cmdline";
import { resolveColor } from "../core/colors";
import { ma3 } from "../core/ma3";
import { state } from "../core/state";
import { DeckAction, float, type Instance, text } from "./base";

type Preset = "selection" | "page" | "cue" | "value" | "custom";

type Settings = {
	preset?: Preset;
	label?: string;
	/** Relative mode: command(s) per clockwise / counter-clockwise tick. */
	cw?: string;
	ccw?: string;
	/** Relative mode: send once per event with {ticks} / {abs} instead of once per tick. */
	batch?: boolean;
	/** Value mode: absolute command template using {value}. */
	template?: string;
	min?: string;
	max?: string;
	step?: string;
	push?: string;
	touch?: string;
	longTouch?: string;
	color?: string;
};

type Definition = { cw: string; ccw: string; push: string; touch: string; longTouch: string; head: string };

const PRESETS: Record<Exclude<Preset, "value" | "custom" | "page">, Definition> = {
	selection: { cw: "Next", ccw: "Previous", push: "", touch: "Highlight", longTouch: "ClearSelection", head: "Selection" },
	cue: { cw: "Go+", ccw: "Go-", push: "Pause", touch: "", longTouch: "", head: "Selected Exec" },
};

/**
 * Anything else on a dial:
 * - selection: step through the selection (Next / Previous), touch = Highlight
 * - page: executor page up / down, push = page 1
 * - cue: Go+ / Go- on the selected executor
 * - value: absolute value with a template, e.g. a speed master or programmer time
 * - custom: your own commands per tick, push and touch
 */
@action({ UUID: "org.open-gma3-deck.command-dial" })
export class CommandDial extends DeckAction<Settings> {
	private values = new Map<string, number>();
	private last = new Map<string, string>();

	constructor() {
		super(["page", "resolution"]);
	}

	private definition(s: Settings): Definition {
		const preset = s.preset ?? "selection";
		if (preset === "selection" || preset === "cue") {
			const d = PRESETS[preset];
			return { ...d, push: s.push ?? d.push, touch: s.touch ?? d.touch, longTouch: s.longTouch ?? d.longTouch };
		}
		return { cw: s.cw ?? "", ccw: s.ccw ?? "", push: s.push ?? "", touch: s.touch ?? "", longTouch: s.longTouch ?? "", head: "Command" };
	}

	private range(s: Settings): { min: number; max: number; step: number } {
		return { min: float(s.min, 0), max: float(s.max, 100), step: float(s.step, 1) };
	}

	override onDialRotate(ev: DialRotateEvent<Settings>): void {
		const s = ev.payload.settings;
		const { ticks } = ev.payload;
		const preset = s.preset ?? "selection";

		if (preset === "page") {
			state.setPage(state.page + ticks);
			ma3.latest("page", () => ma3.cmd(`Page ${state.page}`));
			return;
		}

		if (preset === "value") {
			const { min, max, step } = this.range(s);
			const current = this.values.get(ev.action.id) ?? min;
			const factor = state.resolutionFactor() * (ev.payload.pressed ? state.globals.fineFactor : 1);
			const next = Math.max(min, Math.min(max, current + ticks * step * factor));
			this.values.set(ev.action.id, next);
			const template = text(s.template);
			if (template) {
				const command = fillTemplate(template, { value: formatNumber(next) });
				ma3.latest(`value:${ev.action.id}`, () => ma3.cmd(command));
			}
		} else {
			const d = this.definition(s);
			const template = ticks > 0 ? d.cw : d.ccw;
			const values = { ticks: String(ticks), abs: String(Math.abs(ticks)), sign: ticks < 0 ? "-" : "+" };
			const commands = splitCommands(fillTemplate(template, values));
			const repeat = s.batch ? 1 : Math.abs(ticks);
			for (let i = 0; i < repeat; i++) ma3.cmds(commands);
			if (commands.length) this.last.set(ev.action.id, commands.join(" ; "));
		}
		const inst = this.instance(ev.action);
		if (inst) this.render(inst);
	}

	override onDialDown(ev: DialDownEvent<Settings>): void {
		const s = ev.payload.settings;
		if ((s.preset ?? "selection") === "page" && !text(s.push)) {
			state.setPage(1);
			ma3.cmd("Page 1");
			return;
		}
		ma3.cmds(splitCommands(this.definition(s).push));
	}

	override onTouchTap(ev: TouchTapEvent<Settings>): void {
		const d = this.definition(ev.payload.settings);
		ma3.cmds(splitCommands(ev.payload.hold ? d.longTouch : d.touch));
	}

	protected render(inst: Instance<Settings>): void {
		const s = inst.settings;
		const preset = s.preset ?? "selection";
		if (preset === "page") {
			this.drawDial(inst, { head: text(s.label, "Executor Page"), value: `Page ${state.page}`, sub: "push: page 1", bar: { value: 0, bar_fill_c: resolveColor(s.color, "grey") } });
			return;
		}
		if (preset === "value") {
			const { min, max } = this.range(s);
			const v = this.values.get(inst.id) ?? min;
			const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
			this.drawDial(inst, {
				head: text(s.label, "Value"),
				value: formatNumber(v),
				sub: text(s.template, "Master 3.1 At {value}").replace("{value}", "…"),
				bar: { value: Math.round(pct), bar_fill_c: resolveColor(s.color, "cyan") },
			});
			return;
		}
		const d = this.definition(s);
		this.drawDial(inst, {
			head: text(s.label, d.head),
			value: `${splitCommands(d.ccw)[0] ?? "—"} / ${splitCommands(d.cw)[0] ?? "—"}`,
			sub: this.last.get(inst.id) ?? (d.push ? `push: ${d.push}` : ""),
			bar: { value: 0, bar_fill_c: resolveColor(s.color, "amber") },
		});
	}
}
