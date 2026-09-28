/**
 * Presets for the "MA Key" action: the hard keys of a grandMA3 command wing.
 *
 * Behaviours:
 * - append:    add the token to the virtual command line (like typing on the console)
 * - exec:      send the token immediately as its own command
 * - toggle:    like exec, but the key shows a latched on/off state
 * - please:    send the virtual command line ("Please" / Enter)
 * - clear:     clear the virtual command line; when it is empty, send "Clear" to grandMA3
 * - backspace: delete the last character of the virtual command line
 * - escape:    discard the virtual command line without sending anything
 */
export type KeyBehavior = "append" | "exec" | "toggle" | "please" | "clear" | "backspace" | "escape";

export type KeyPreset = {
	id: string;
	label: string;
	token: string;
	behavior: KeyBehavior;
	group: string;
};

function p(group: string, behavior: KeyBehavior, list: Array<string | [label: string, token: string]>): KeyPreset[] {
	return list.map((item) => {
		const [label, token] = typeof item === "string" ? [item, item] : item;
		return { id: `${group}:${label}`.toLowerCase().replace(/\s+/g, "-"), label, token, behavior, group };
	});
}

export const KEY_PRESETS: KeyPreset[] = [
	...p("Numpad", "append", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", [".", "."]]),
	...p("Numpad", "append", ["Thru", "+", "-", "At", "Full", "If", "Fade", "Delay", "Time"]),
	...p("Numpad", "please", ["Please"]),
	...p("Numpad", "clear", ["Clear"]),
	...p("Numpad", "backspace", [["Backspace", ""]]),
	...p("Numpad", "escape", [["Esc", ""]]),
	...p("Functions", "append", [
		"Store",
		"Update",
		"Delete",
		"Copy",
		"Move",
		"Assign",
		"Label",
		"Edit",
		"Set",
		"Cut",
		"Paste",
		"Insert",
		"Select",
		"Load",
		"Goto",
		"Release",
		"Invert",
		"Knockout",
		"On",
		"Off",
		"Go+",
		"Go-",
		"Pause",
		"Top",
		"Temp",
		"Flash",
		"Toggle",
		"Swap",
		"Learn",
		"Call",
	]),
	...p("Objects", "append", [
		"Fixture",
		"Group",
		"Preset",
		"Sequence",
		"Cue",
		"Part",
		"Executor",
		"Page",
		"Macro",
		"View",
		"World",
		"Filter",
		"MAtricks",
		"Layout",
		"Timecode",
		"Timer",
		"Plugin",
		"Attribute",
		"Feature",
		"FeatureGroup",
		"Appearance",
		"DataPool",
		"Selection",
	]),
	...p("Immediate", "exec", [
		"Oops",
		"Next",
		"Previous",
		["Select All", "Fixture Thru"],
		["Clear Selection", "ClearSelection"],
		["Clear Active", "ClearActive"],
		["Clear All", "ClearAll"],
		["Save Show", "SaveShow"],
		["Go+ Selected", "Go+"],
		["Go- Selected", "Go-"],
		["Pause Selected", "Pause"],
		["Off Selected", "Off"],
	]),
	...p("Modes", "toggle", ["Highlight", "Solo", "Blind", "Freeze", "Preview"]),
];

// Remove accidental duplicates (keeps first occurrence) so ids stay unique.
const seen = new Set<string>();
export const KEY_PRESET_LIST: KeyPreset[] = KEY_PRESETS.filter((k) => (seen.has(k.id) ? false : (seen.add(k.id), true)));

export function findKeyPreset(id: string | undefined): KeyPreset | undefined {
	return KEY_PRESET_LIST.find((k) => k.id === id);
}
