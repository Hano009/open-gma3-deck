import { action, type KeyDownEvent, type KeyUpEvent } from "@elgato/streamdeck";

import { completeCommandLine } from "../core/cmd";
import { fillTemplate, splitCommands } from "../core/cmdline";
import { ma3 } from "../core/ma3";
import { state } from "../core/state";
import { DeckAction, type Instance, int, text } from "./base";

type Settings = {
	/** Empty = follow the page selected with the Page keys. */
	page?: string;
	exec?: string;
	func?: ExecFunction;
	press?: string;
	release?: string;
	label?: string;
	color?: string;
};

type ExecFunction = "key" | "go" | "goback" | "pause" | "toggle" | "on" | "off" | "top" | "flash" | "temp" | "swap" | "select" | "custom";

/**
 * Command templates for each button function. `{p}` = page, `{e}` = executor.
 * "key" uses grandMA3's native OSC key path so the button does whatever it is assigned to in the show.
 */
const FUNCTIONS: Record<Exclude<ExecFunction, "key" | "custom">, { press: string; release?: string }> = {
	go: { press: "Go+ Page {p}.{e}" },
	goback: { press: "Go- Page {p}.{e}" },
	pause: { press: "Pause Page {p}.{e}" },
	toggle: { press: "Toggle Page {p}.{e}" },
	on: { press: "On Page {p}.{e}" },
	off: { press: "Off Page {p}.{e}" },
	top: { press: "Top Page {p}.{e}" },
	flash: { press: "Flash On Page {p}.{e}", release: "Flash Off Page {p}.{e}" },
	temp: { press: "Temp On Page {p}.{e}", release: "Temp Off Page {p}.{e}" },
	// grandMA3 2.4 spells it "Swap"; "Swop" is read as a fixture name.
	swap: { press: "Swap On Page {p}.{e}", release: "Swap Off Page {p}.{e}" },
	select: { press: "Select Page {p}.{e}" },
};

/**
 * Executor button (executor extension). Shows live fader level / running state when grandMA3 OSC
 * feedback is enabled. While a command is typed ("Store", "Delete", ...), pressing the key
 * completes it with this executor instead.
 */
@action({ UUID: "org.open-gma3-deck.executor" })
export class Executor extends DeckAction<Settings> {
	/** Keys whose press was used to complete the command line; their release must be ignored. */
	private swallowed = new Set<string>();

	constructor() {
		super(["page", "executors", "names"]);
	}

	private target(s: Settings): { page: number; exec: number; follows: boolean } {
		const follows = !text(s.page);
		return { page: follows ? state.page : int(s.page, 1), exec: int(s.exec, 201), follows };
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		const s = ev.payload.settings;
		const { page, exec } = this.target(s);
		if (completeCommandLine(`Page ${page}.${exec}`)) {
			this.swallowed.add(ev.action.id);
			return;
		}
		const func = s.func ?? "key";
		if (func === "key") return ma3.executorKey(page, exec, true);
		const template = func === "custom" ? s.press : FUNCTIONS[func]?.press;
		ma3.cmds(splitCommands(fillTemplate(template ?? "", { p: page, e: exec, page, exec })));
	}

	override onKeyUp(ev: KeyUpEvent<Settings>): void {
		if (this.swallowed.delete(ev.action.id)) return;
		const s = ev.payload.settings;
		const { page, exec } = this.target(s);
		const func = s.func ?? "key";
		if (func === "key") return ma3.executorKey(page, exec, false);
		const template = func === "custom" ? s.release : FUNCTIONS[func]?.release;
		ma3.cmds(splitCommands(fillTemplate(template ?? "", { p: page, e: exec, page, exec })));
	}

	protected render(inst: Instance<Settings>): void {
		const s = inst.settings;
		const { page, exec, follows } = this.target(s);
		this.usePage(inst, follows ? undefined : page);
		const live = state.executors.get(`${page}.${exec}`);
		const fader = live?.fader;
		this.drawKey(inst, {
			top: `${follows ? "P" : "Page "}${page}`,
			label: text(s.label) || state.name(`Exec ${page}.${exec}`) || `Exec ${exec}`,
			bottom: `${page}.${exec}`,
			color: text(s.color, "#f0a830"),
			active: live?.key === true || (fader ?? 0) > 0,
			bar: fader,
		});
	}
}
