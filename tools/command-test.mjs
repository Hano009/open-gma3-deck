// Sends every kind of command the plugin generates to grandMA3, section by section, so the
// grandMA3 command line history shows which ones are accepted. Use a TEST SHOW: commands change
// the selection, programmer, pages and executors (all put back / cleared at the end).
// Commands that change show data (Store, Update, Delete, Copy, Move, Label, Assign, SaveShow)
// are never sent.
//
//   npm run command-test                         127.0.0.1:8000, prefix gma3
//   npm run command-test -- 192.168.1.10 8000 gma3
//   npm run command-test -- --dry                only print the commands
import dgram from "node:dgram";

import { LAYERS } from "../src/core/layers.ts";
import { MATRICKS_PROPERTIES } from "../src/core/matricks.ts";
import { MENUS } from "../src/core/menus.ts";
import { buildAttributeSyncCommand, buildSyncCommand } from "../src/core/names.ts";
import { encodeMessage } from "../src/core/osc.ts";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry");
const host = args[0] ?? "127.0.0.1";
const port = Number(args[1] ?? 8000);
const prefix = args[2] ?? "gma3";
const feedbackLine = 2;
const exec = "Page 1.104"; // an existing sequence executor in the test show
const DELAY_MS = 350;

const sections = [
	["Connection", ['Echo "Open grandMA3 Deck: OSC OK"']],
	["Name and bank sync (Lua)", [buildSyncCommand(feedbackLine, [1, 2]), buildAttributeSyncCommand(feedbackLine)]],
	[
		"Feature groups (Encoder Bank keys)",
		["Dimmer", "Gobo", "Color", "Beam", "Focus", "Control", "Shapers", "Video", "Position"].map((g) => `FeatureGroup "${g}"`),
	],
	["Pools (default actions)", ["Group 1", "Preset 4.1", "World 1", "Filter 1", "Page 1", "Go+ Macro 99", "Off Sequence 99", "Go+ Timer 99"]],
	[
		"Attribute encoders (value and layers, + then -)",
		LAYERS.flatMap((l) => {
			const layer = l.id ? `${l.id} ` : "";
			const step = l.step ?? 1;
			return [`Attribute "Dimmer" At ${layer}+ ${step}`, `Attribute "Dimmer" At ${layer}- ${step}`];
		}),
	],
	["Color Picker", ['Attribute "ColorRGB_R" At 100', 'Attribute "ColorRGB_G" At 0', 'Attribute "ColorRGB_B" At 0', 'Attribute "ColorRGB_W" At 0']],
	[
		"MAtricks (set, then None)",
		[
			...MATRICKS_PROPERTIES.filter((p) => p.id.includes("X")).flatMap((p) => [
				`Set Selection Property "${p.id}" ${p.step < 1 ? 1 : 2}`,
				`Set Selection Property "${p.id}" "None"`,
			]),
			`Lua "local q=string.char(34) for _,p in ipairs({${MATRICKS_PROPERTIES.map((p) => `'${p.id}'`).join(",")}}) do Cmd('Set Selection Property '..q..p..q..' '..q..'None'..q) end"`,
		],
	],
	[
		"Executor key functions (each followed by Off)",
		[
			`Go+ ${exec}`,
			`Go- ${exec}`,
			`Pause ${exec}`,
			`Top ${exec}`,
			`Off ${exec}`,
			`Toggle ${exec}`,
			`Toggle ${exec}`,
			`On ${exec}`,
			`Off ${exec}`,
			`Flash On ${exec}`,
			`Flash Off ${exec}`,
			`Temp On ${exec}`,
			`Temp Off ${exec}`,
			`Swap On ${exec}`,
			`Swap Off ${exec}`,
			`Select ${exec}`,
			`FaderMaster ${exec} At 100`,
			`FaderTemp ${exec} At 0`,
			`Off ${exec}`,
		],
	],
	["Executor page", ["Page 2", "Page 1"]],
	[
		"MA Keys: immediate",
		["Next", "Previous", "Fixture Thru", "Oops"],
	],
	[
		"MA Keys: modes (on, then off)",
		["Highlight", "Highlight", "Solo", "Solo", "Blind", "Blind", "Freeze", "Freeze", "Preview", "Preview"],
	],
	["Windows and menus", MENUS.map(([id]) => `Menu "${id}"`)],
	["Clean up (MA Keys: ClearSelection, ClearActive, ClearAll)", ["ClearSelection", "ClearActive", "ClearAll"]],
];

const address = `/${prefix}/cmd`;
const socket = dgram.createSocket("udp4");
const send = (c) =>
	new Promise((resolve, reject) => socket.send(encodeMessage(address, [{ type: "s", value: c }]), port, host, (e) => (e ? reject(e) : resolve())));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let count = 0;
for (const [title, commands] of sections) {
	const header = `Echo "=== ${title} ==="`;
	console.log(`\n${header}`);
	if (!dry) await send(header);
	for (const c of commands) {
		console.log("  " + (c.length > 110 ? c.slice(0, 107) + "…" : c));
		count++;
		if (!dry) {
			await send(c);
			await sleep(DELAY_MS);
		}
	}
	if (!dry) await sleep(DELAY_MS);
}
if (!dry) await send('Echo "=== Open grandMA3 Deck command test done ==="');
socket.close();
console.log(`\n${count} commands ${dry ? "listed" : `sent to ${host}:${port}`}.`);
