import { action, type KeyDownEvent } from "@elgato/streamdeck";

import { completeCommandLine } from "../core/cmd";
import { ma3 } from "../core/ma3";
import { poolKey } from "../core/names";
import { state } from "../core/state";
import { DeckAction, type Instance, text } from "./base";

type Settings = {
	type?: string;
	/** Pool number; presets use "<type>.<number>", e.g. "4.12". */
	number?: string;
	/** Keyword placed in front, e.g. "Go+", "Off", "Edit". Empty = the pool's default action. */
	verb?: string;
	label?: string;
	color?: string;
};

/** Default action and colour per pool, matching what tapping the pool object on a console does. */
const POOLS: Record<string, { verb: string; color: string }> = {
	Group: { verb: "", color: "green" },
	Preset: { verb: "", color: "cyan" },
	Sequence: { verb: "Go+", color: "orange" },
	Macro: { verb: "Go+", color: "brown" },
	View: { verb: "", color: "grey" },
	World: { verb: "", color: "indigo" },
	Filter: { verb: "", color: "indigo" },
	MAtricks: { verb: "", color: "purple" },
	Page: { verb: "", color: "grey" },
	Timecode: { verb: "Go+", color: "red" },
	Timer: { verb: "Go+", color: "red" },
	Plugin: { verb: "Go+", color: "brown" },
	Layout: { verb: "", color: "grey" },
	Appearance: { verb: "", color: "pink" },
	Fixture: { verb: "", color: "lime" },
};

/**
 * Pool object key: groups, presets, macros, sequences, views, ... While a command is typed
 * (e.g. "Store"), pressing it stores into / targets that object instead.
 */
@action({ UUID: "org.open-gma3-deck.pool" })
export class Pool extends DeckAction<Settings> {
	constructor() {
		super(["names"]);
	}

	private object(s: Settings): string {
		return `${text(s.type, "Group")} ${text(s.number, "1").trim()}`;
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		const s = ev.payload.settings;
		const obj = this.object(s);
		if (completeCommandLine(obj)) return;
		const verb = s.verb === undefined || s.verb === "default" ? (POOLS[text(s.type, "Group")]?.verb ?? "") : s.verb.trim();
		ma3.cmd(verb ? `${verb} ${obj}` : obj);
	}

	protected render(inst: Instance<Settings>): void {
		const s = inst.settings;
		const type = text(s.type, "Group");
		const number = text(s.number, "1").trim();
		// Label from the key settings, else the object's name synced from grandMA3.
		const name = text(s.label) || state.name(poolKey(type, number));
		this.drawKey(inst, {
			top: type,
			label: name ?? number,
			bottom: name ? number : undefined,
			color: text(s.color, POOLS[type]?.color ?? "grey"),
		});
	}
}
