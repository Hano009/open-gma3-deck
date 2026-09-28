import { ma3 } from "./ma3";
import { state } from "./state";

/** Sends the virtual command line ("Please") and clears it. */
export function please(): void {
	const line = state.cmdline.trim();
	if (!line) return;
	ma3.cmd(line);
	state.lastSent = line;
	state.setCmdline("");
}

/**
 * Console-style object keys: when a command is being typed (e.g. "Store"), tapping a pool object
 * or executor completes the command with that object and sends it, just like on the console.
 * Returns false when the command line was empty and the caller should do its normal action.
 */
export function completeCommandLine(object: string): boolean {
	if (!state.cmdline.trim()) return false;
	state.appendCmdline(object);
	please();
	return true;
}
