import { action, type DialDownEvent, type DialRotateEvent, type DidReceiveSettingsEvent, type KeyDownEvent, type TouchTapEvent } from "@elgato/streamdeck";

import { PALETTE, resolveColor } from "../core/colors";
import { formatNumber } from "../core/cmdline";
import { LAYERS, type Layer, layerInfo } from "../core/layers";
import { ma3 } from "../core/ma3";
import { matricksProperty, nextAxis } from "../core/matricks";
import { MENUS } from "../core/menus";
import { state } from "../core/state";
import { DeckAction, float, type Instance, text } from "./base";

// ---------------------------------------------------------------------------------------------
// Encoder layer
// ---------------------------------------------------------------------------------------------

type LayerSettings = { layer?: Layer | "cycle"; color?: string };

/**
 * Chooses the value layer the Attribute Encoders write to: the value itself, or its Fade, Delay,
 * Speed, Phase, Width, Accel, Decel or Transition (like the layer toggle on the console).
 * Pressing the active layer again returns to plain values.
 */
@action({ UUID: "org.open-gma3-deck.layer" })
export class LayerKey extends DeckAction<LayerSettings> {
	constructor() {
		super(["layer"]);
	}

	override onKeyDown(ev: KeyDownEvent<LayerSettings>): void {
		const target = ev.payload.settings.layer ?? "cycle";
		if (target === "cycle") {
			const i = LAYERS.findIndex((l) => l.id === state.layer);
			state.setLayer(LAYERS[(i + 1) % LAYERS.length].id);
		} else {
			state.setLayer(state.layer === target ? "" : target);
		}
	}

	protected render(inst: Instance<LayerSettings>): void {
		const target = inst.settings.layer ?? "cycle";
		const shown = target === "cycle" ? layerInfo(state.layer) : layerInfo(target);
		this.drawKey(inst, {
			top: "Layer",
			label: shown.label,
			bottom: target === "cycle" ? "cycle" : undefined,
			color: text(inst.settings.color, shown.color),
			active: target === "cycle" ? state.layer !== "" : state.layer === target,
		});
	}
}

// ---------------------------------------------------------------------------------------------
// MAtricks
// ---------------------------------------------------------------------------------------------

type MatricksSettings = {
	func?: "set" | "up" | "down" | "clear" | "reset";
	prop?: string;
	value?: string;
	label?: string;
	color?: string;
};

/**
 * MAtricks of the current selection: set a value (press again to clear it), step it up / down,
 * clear one property or reset all of them.
 */
@action({ UUID: "org.open-gma3-deck.matricks" })
export class MatricksKey extends DeckAction<MatricksSettings> {
	constructor() {
		super(["matricks"]);
	}

	override onKeyDown(ev: KeyDownEvent<MatricksSettings>): void {
		const s = ev.payload.settings;
		const p = matricksProperty(s.prop);
		const current = state.matricks.get(p.id);
		switch (s.func ?? "set") {
			case "reset":
				ma3.matricksReset();
				break;
			case "clear":
				ma3.matricks(p.id, undefined);
				break;
			case "up":
				ma3.matricks(p.id, Math.min(p.max, (current ?? p.min) + p.step));
				break;
			case "down": {
				const next = (current ?? p.min) - p.step;
				ma3.matricks(p.id, next <= p.min ? undefined : next);
				break;
			}
			default: {
				const value = float(s.value, 2);
				ma3.matricks(p.id, current === value ? undefined : value);
			}
		}
	}

	protected render(inst: Instance<MatricksSettings>): void {
		const s = inst.settings;
		const func = s.func ?? "set";
		const p = matricksProperty(s.prop);
		const current = state.matricks.get(p.id);
		const shownValue = current === undefined ? "—" : `${formatNumber(current)}${p.unit ?? ""}`;
		let label: string;
		let active = false;
		switch (func) {
			case "reset":
				label = "Reset";
				active = state.matricks.size > 0;
				break;
			case "clear":
				label = `${p.label} off`;
				break;
			case "up":
			case "down":
				label = `${p.label} ${func === "up" ? "+" : "−"}`;
				break;
			default:
				label = `${p.label} ${formatNumber(float(s.value, 2))}`;
				active = current === float(s.value, 2);
		}
		this.drawKey(inst, {
			top: "MAtricks",
			label: text(s.label, label),
			bottom: func === "reset" ? (state.matricks.size ? `${state.matricks.size} set` : undefined) : shownValue,
			color: text(s.color, "purple"),
			active,
		});
	}
}

type MatricksDialSettings = { prop?: string; label?: string };

/**
 * MAtricks on a dial. Rotate = value (down to 0 clears it), push = clear, tap = same property on
 * the next axis (X / Y / Z), long touch = reset all MAtricks.
 */
@action({ UUID: "org.open-gma3-deck.matricks-dial" })
export class MatricksDial extends DeckAction<MatricksDialSettings> {
	/** Axis chosen with a tap, per dial (the configured property is the starting point). */
	private axis = new Map<string, string>();

	constructor() {
		super(["matricks", "resolution"]);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<MatricksDialSettings>): void | Promise<void> {
		// A newly configured property replaces any axis picked with a tap.
		this.axis.delete(ev.action.id);
		return super.onDidReceiveSettings(ev);
	}

	private prop(inst: { id: string }, s: MatricksDialSettings) {
		return matricksProperty(this.axis.get(inst.id) ?? s.prop);
	}

	override onDialRotate(ev: DialRotateEvent<MatricksDialSettings>): void {
		const p = this.prop(ev.action, ev.payload.settings);
		const current = state.matricks.get(p.id) ?? p.min;
		const factor = p.step < 1 ? state.resolutionFactor() * (ev.payload.pressed ? 0.1 : 1) : 1;
		const next = Math.round((current + ev.payload.ticks * p.step * factor) * 1000) / 1000;
		ma3.matricks(p.id, next <= p.min ? undefined : Math.min(p.max, next));
	}

	override onDialDown(ev: DialDownEvent<MatricksDialSettings>): void {
		ma3.matricks(this.prop(ev.action, ev.payload.settings).id, undefined);
	}

	override onTouchTap(ev: TouchTapEvent<MatricksDialSettings>): void {
		if (ev.payload.hold) {
			ma3.matricksReset();
			return;
		}
		const p = this.prop(ev.action, ev.payload.settings);
		this.axis.set(ev.action.id, nextAxis(p.id));
		const inst = this.instance(ev.action);
		if (inst) this.render(inst);
	}

	protected render(inst: Instance<MatricksDialSettings>): void {
		const p = this.prop(inst, inst.settings);
		const v = state.matricks.get(p.id);
		const pct = v === undefined ? 0 : Math.min(100, (v / Math.min(p.max, p.step >= 1 ? 16 : 10)) * 100);
		this.drawDial(inst, {
			head: text(inst.settings.label, "MAtricks"),
			value: `${p.label}  ${v === undefined ? "—" : formatNumber(v) + (p.unit ?? "")}`,
			sub: `push: off · tap: next axis · hold: reset${state.matricks.size ? ` · ${state.matricks.size} set` : ""}`,
			bar: { value: Math.round(pct), bar_fill_c: resolveColor("purple", "purple") },
		});
	}
}

// ---------------------------------------------------------------------------------------------
// Colour picker
// ---------------------------------------------------------------------------------------------

type ColorSettings = {
	color?: string;
	white?: "keep" | "zero" | "full";
	/** Group to colour; empty = the current selection. */
	group?: string;
	label?: string;
};

/**
 * Sends the key's colour as RGB mix values (ColorRGB_R/G/B, 0..100) to the selected fixtures,
 * or to a group. No preset pool needed: pick a palette colour or any custom colour.
 *
 * With a group, the key selects it first (`Group N`), like pressing the group on the console:
 * grandMA3 2.4 answers `Group 1 Attribute "…" At 100` with "Not implemented".
 */
@action({ UUID: "org.open-gma3-deck.color" })
export class ColorKey extends DeckAction<ColorSettings> {
	constructor() {
		super(["names"]);
	}

	override onKeyDown(ev: KeyDownEvent<ColorSettings>): void {
		const s = ev.payload.settings;
		const hex = resolveColor(s.color, "red");
		const n = parseInt(hex.slice(1), 16);
		const pct = (c: number) => formatNumber(Math.round((c / 255) * 1000) / 10);
		const group = text(s.group).trim();
		if (group) ma3.cmd(`Group ${group}`);
		ma3.cmds([
			`Attribute "ColorRGB_R" At ${pct((n >> 16) & 255)}`,
			`Attribute "ColorRGB_G" At ${pct((n >> 8) & 255)}`,
			`Attribute "ColorRGB_B" At ${pct(n & 255)}`,
		]);
		if (s.white === "zero") ma3.cmd(`Attribute "ColorRGB_W" At 0`);
		if (s.white === "full") ma3.cmd(`Attribute "ColorRGB_W" At 100`);
	}

	protected render(inst: Instance<ColorSettings>): void {
		const s = inst.settings;
		const value = text(s.color, "red");
		const named = PALETTE.find(([name]) => name === value.toLowerCase());
		const label = text(s.label, named ? named[0][0].toUpperCase() + named[0].slice(1) : value.toUpperCase());
		const group = text(s.group).trim();
		// Always drawn lit, so the key shows the actual colour it sends; the top line says where.
		this.drawKey(inst, {
			top: group ? (state.name(`Group ${group}`) ?? `Group ${group}`) : "Color",
			label,
			color: value,
			active: true,
			style: "backlit",
		});
	}
}

// ---------------------------------------------------------------------------------------------
// Windows and menus
// ---------------------------------------------------------------------------------------------

type MenuSettings = { menu?: string; custom?: string; label?: string; color?: string };

/** Opens a grandMA3 menu, overlay or window by name: `Menu "<name>"` (verified on grandMA3 2.4). */
@action({ UUID: "org.open-gma3-deck.menu" })
export class MenuKey extends DeckAction<MenuSettings> {
	constructor() {
		super([]);
	}

	private menu(s: MenuSettings): { id: string; label: string } {
		const id = s.menu === "custom" ? text(s.custom, "MenuSelector").trim() : text(s.menu, "CommandControl");
		const known = MENUS.find(([m]) => m === id);
		return { id, label: text(s.label, known ? known[1] : id) };
	}

	override onKeyDown(ev: KeyDownEvent<MenuSettings>): void {
		ma3.cmd(`Menu "${this.menu(ev.payload.settings).id.replace(/"/g, "")}"`);
	}

	protected render(inst: Instance<MenuSettings>): void {
		const m = this.menu(inst.settings);
		this.drawKey(inst, { top: "Window", label: m.label, color: text(inst.settings.color, "grey") });
	}
}
