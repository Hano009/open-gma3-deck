import { action, type KeyDownEvent } from "@elgato/streamdeck";

import { please } from "../core/cmd";
import { findKeyPreset, type KeyBehavior } from "../core/keys";
import { ma3 } from "../core/ma3";
import { state } from "../core/state";
import { DeckAction, type Instance, text } from "./base";

type Settings = {
	preset?: string;
	/** Used when preset is "custom". */
	token?: string;
	behavior?: KeyBehavior;
	label?: string;
	color?: string;
};

/** Default colour per preset group; see TOKEN_COLORS for keys that get their own. */
const GROUP_COLORS: Record<string, string> = {
	Numpad: "grey",
	Functions: "amber",
	Objects: "teal",
	Immediate: "orange",
	Modes: "magenta",
	Custom: "amber",
};

/**
 * Keys you must find instantly get distinct colours: destructive / recording keys are warm,
 * editing keys cool, the command line terminators green and red.
 */
const TOKEN_COLORS: Record<string, string> = {
	Store: "red",
	Update: "orange",
	Delete: "pink",
	Copy: "purple",
	Move: "purple",
	Cut: "purple",
	Paste: "purple",
	Insert: "purple",
	Label: "blue",
	Edit: "blue",
	Assign: "indigo",
	Set: "indigo",
	At: "white",
	Thru: "white",
	"+": "white",
	"-": "white",
	Full: "yellow",
	Oops: "amber",
	Highlight: "yellow",
	Solo: "yellow",
	Blind: "cyan",
	Preview: "cyan",
	Freeze: "blue",
	Fixture: "lime",
	Group: "green",
	Preset: "cyan",
	Sequence: "orange",
	Cue: "orange",
	Executor: "amber",
	Macro: "brown",
};

/** A single grandMA3 hard key: numbers, Store, Update, At, Thru, Please, Highlight, ... */
@action({ UUID: "org.open-gma3-deck.ma-key" })
export class MaKey extends DeckAction<Settings> {
	constructor() {
		super(["toggles", "cmdline"]);
	}

	private resolve(s: Settings): { label: string; token: string; behavior: KeyBehavior; color: string } {
		const preset = findKeyPreset(s.preset ?? "functions:store");
		if (!preset || s.preset === "custom") {
			const token = text(s.token, "");
			return { label: text(s.label, token || "Custom"), token, behavior: s.behavior ?? "append", color: text(s.color, GROUP_COLORS.Custom) };
		}
		let color = TOKEN_COLORS[preset.token] ?? GROUP_COLORS[preset.group] ?? "grey";
		if (preset.behavior === "please") color = "green";
		if (preset.behavior === "clear" || preset.behavior === "escape") color = "red";
		if (preset.behavior === "backspace") color = "grey";
		return { label: text(s.label, preset.label), token: preset.token, behavior: preset.behavior, color: text(s.color, color) };
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		const k = this.resolve(ev.payload.settings);
		switch (k.behavior) {
			case "append":
				state.appendCmdline(k.token);
				break;
			case "exec":
				ma3.cmd(k.token);
				// Keep the lit Group / Preset keys in step with what the clear keys do.
				if (k.token === "ClearSelection" || k.token === "Fixture Thru") state.clearCalled("selection");
				if (k.token === "ClearActive" || k.token === "ClearAll") state.clearCalled("all");
				break;
			case "toggle": {
				ma3.cmd(k.token);
				state.setToggle(k.token, !state.toggles.get(k.token));
				break;
			}
			case "please":
				please();
				break;
			case "clear":
				if (state.cmdline) state.setCmdline("");
				else {
					ma3.cmd("Clear");
					state.clearCalled("selection");
				}
				break;
			case "backspace":
				state.backspaceCmdline();
				break;
			case "escape":
				state.setCmdline("");
				break;
		}
	}

	protected render(inst: Instance<Settings>): void {
		const k = this.resolve(inst.settings);
		const active = k.behavior === "toggle" ? state.toggles.get(k.token) === true : k.behavior === "please" && state.cmdline.length > 0;
		this.drawKey(inst, { label: k.label, color: k.color, active });
	}
}
