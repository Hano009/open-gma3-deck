import { action, type KeyDownEvent, type KeyUpEvent } from "@elgato/streamdeck";

import { splitCommands } from "../core/cmdline";
import { ma3 } from "../core/ma3";
import { state } from "../core/state";
import { DeckAction, type Instance, text } from "./base";

type Settings = {
	/** Commands sent on press (one per line). */
	press?: string;
	/** Commands sent on release (one per line). */
	release?: string;
	/** "toggle": alternate between `press` and `pressOff` on each press. */
	mode?: "momentary" | "toggle" | "append";
	pressOff?: string;
	label?: string;
	color?: string;
};

/**
 * Sends any grandMA3 command(s): macros, "Go+ Sequence 5", "Store Cue 1 /merge", Lua calls, etc.
 * "append" mode types the text into the virtual command line instead.
 */
@action({ UUID: "org.open-gma3-deck.command" })
export class Command extends DeckAction<Settings> {
	private latched = new Map<string, boolean>();

	constructor() {
		super(["cmdline"]);
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		const s = ev.payload.settings;
		if (s.mode === "append") {
			for (const c of splitCommands(s.press)) state.appendCmdline(c);
			return;
		}
		if (s.mode === "toggle") {
			const on = !this.latched.get(ev.action.id);
			this.latched.set(ev.action.id, on);
			ma3.cmds(splitCommands(on ? s.press : s.pressOff || s.press));
			const inst = this.instance(ev.action);
			if (inst) this.render(inst);
			return;
		}
		ma3.cmds(splitCommands(s.press));
	}

	override onKeyUp(ev: KeyUpEvent<Settings>): void {
		const s = ev.payload.settings;
		if (s.mode === "toggle" || s.mode === "append") return;
		ma3.cmds(splitCommands(s.release));
	}

	protected render(inst: Instance<Settings>): void {
		const s = inst.settings;
		const first = splitCommands(s.press)[0] ?? "Command";
		this.drawKey(inst, {
			label: text(s.label, first),
			color: text(s.color, "#f0a830"),
			active: s.mode === "toggle" && this.latched.get(inst.id) === true,
		});
	}
}
