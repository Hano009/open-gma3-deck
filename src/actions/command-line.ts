import { action, type KeyDownEvent, type KeyUpEvent } from "@elgato/streamdeck";

import { please } from "../core/cmd";
import { state } from "../core/state";
import { DeckAction, type Instance } from "./base";

type Settings = Record<string, never>;

const HOLD_MS = 500;

/** Shows the virtual command line. Tap = Please, hold = clear. */
@action({ UUID: "org.open-gma3-deck.cmdline" })
export class CommandLine extends DeckAction<Settings> {
	private downAt = new Map<string, number>();

	constructor() {
		super(["cmdline"]);
	}

	override onKeyDown(ev: KeyDownEvent<Settings>): void {
		this.downAt.set(ev.action.id, Date.now());
	}

	override onKeyUp(ev: KeyUpEvent<Settings>): void {
		const held = Date.now() - (this.downAt.get(ev.action.id) ?? Date.now());
		this.downAt.delete(ev.action.id);
		if (held >= HOLD_MS) state.setCmdline("");
		else please();
	}

	protected render(inst: Instance<Settings>): void {
		if (state.cmdline) {
			this.drawKey(inst, { label: state.cmdline, top: "CMD", mono: true, color: "#3ddc97", active: true });
		} else {
			this.drawKey(inst, { label: state.lastSent || "—", top: "CMD", mono: true, color: "#3ddc97", dim: true });
		}
	}
}
