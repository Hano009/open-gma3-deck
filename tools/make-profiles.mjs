// Builds ready-made Stream Deck profiles (.streamDeckProfile) into profiles/.
// Run with: npm run profiles
//
// The format mirrors profiles exported by the Stream Deck app 7.x (FormatVersion 1, Version 3.0):
//   package.json
//   Profiles/<PROFILE-ID>.sdProfile/manifest.json              Pages: the pages you can swipe to
//   Profiles/<PROFILE-ID>.sdProfile/Profiles/<PAGE-ID>/manifest.json
//   Profiles/<PROFILE-ID>.sdProfile/Profiles/<PAGE-ID>/Images/<IMAGE>.png   (144 x 144 key images)
// A folder is an extra page that is *not* listed in Pages; the folder key is the built-in
// com.elgato.streamdeck.profile.openchild action with { ProfileUUID: <page id> }, and the folder
// page has com.elgato.streamdeck.profile.backtoparent at 0,0 (as created by the Stream Deck app).
//
// Folder / back key images are drawn by the plugin's own key renderer and turned into PNGs with a
// headless Chrome / Edge (set CHROME_PATH if needed). Without a browser the keys get text titles.
// No dependencies: the zip is written with Node's built-in zlib.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

import { KEY_PRESET_LIST } from "../src/core/keys.ts";
import { MENUS } from "../src/core/menus.ts";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "org.open-gma3-deck.sdPlugin", "manifest.json"), "utf8"));
const PLUGIN = { Name: manifest.Name, UUID: manifest.UUID, Version: manifest.Version };
const outDir = path.join(root, "profiles");

/** Stream Deck model codes as used in exported profiles (verified from real exports). */
const MODELS = {
	xl: "20GAT9902", // Stream Deck XL (8 x 4)
	plus: "20GBD9901", // Stream Deck + (4 x 2 + 4 dials)
	plusXl: "20GBX9901", // Stream Deck + XL (9 x 4 + 6 dials)
	virtual: "UI Stream Deck", // Virtual Stream Deck (size set in the Stream Deck app)
};

const actionNames = Object.fromEntries(manifest.Actions.map((a) => [a.UUID.split(".").pop(), a.Name]));
const presetIds = new Set(KEY_PRESET_LIST.map((p) => p.id));

const STATE = { FontFamily: "", FontSize: 12, FontStyle: "", FontUnderline: false, OutlineThickness: 2, ShowTitle: false, TitleAlignment: "bottom", TitleColor: "#ffffff" };

function action(id, settings = {}) {
	if (!actionNames[id]) throw new Error(`Unknown action "${id}"`);
	return {
		ActionID: crypto.randomUUID(),
		LinkedTitle: true,
		Name: actionNames[id],
		Plugin: PLUGIN,
		Resources: null,
		Settings: settings,
		State: 0,
		States: [{ ...STATE }],
		UUID: `${PLUGIN.UUID}.${id}`,
	};
}

// Shorthands for the key grid.
const k = (preset) => {
	if (!presetIds.has(preset)) throw new Error(`Unknown MA Key preset "${preset}"`);
	return action("ma-key", { preset });
};
const bank = (id) => action("bank", { bank: id });
const exec = (n) => action("executor", { exec: String(n), func: "go" });
const attrDial = () => action("attribute-dial", { mode: "bank" });
const fixedDial = (attr, label) => action("attribute-dial", { mode: "fixed", attr, label });
const pool = (type, number) => action("pool", { type, number: String(number) });
const group = (n) => pool("Group", n);
const page = (mode, n) => action("page", n ? { mode, page: String(n) } : { mode });
const menu = (id) => action("menu", { menu: id });
const mx = (func, prop, value) => action("matricks", value === undefined ? { func, prop } : { func, prop, value: String(value) });
const color = (c, groupNo) => action("color", { color: c, ...(groupNo ? { group: String(groupNo) } : {}), white: c === "white" ? "full" : "zero" });

/** A folder key; `icon` is drawn by the plugin's key renderer. */
const folder = (id, label, iconColor) => ({ folder: id, label, iconColor });

/** One row of the colour picker: every key selects the group, then sets its colour. */
const COLORS = ["white", "red", "orange", "yellow", "green", "cyan", "blue", "magenta"];
const colorRow = (groupNo) => COLORS.map((c) => color(c, groupNo));

/** Rows of actions -> { "col,row": action }. `null` leaves a key empty. */
function grid(rows) {
	const out = {};
	rows.forEach((row, r) => row.forEach((a, c) => a && (out[`${c},${r}`] = a)));
	return out;
}

function dials(list) {
	return Object.fromEntries(list.map((a, i) => [`${i},0`, a]));
}

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

// --- the touch-screen pre-programming profile (Virtual Stream Deck, 8 x 8) --------------------------

const BACK = "back"; // placeholder for the folder's back key at 0,0

// Stream Deck always shows Back at the top-left of a folder, so row 0 of every folder is a
// toolbar and the aligned grids (colours, pools, executors) start on row 1: that way column N
// means the same thing on every row.
const selectionToolbar = () => [
	BACK,
	k("modes:highlight"),
	k("immediate:select-all"),
	k("immediate:clear-selection"),
	k("immediate:previous"),
	k("immediate:next"),
	k("immediate:oops"),
	k("numpad:clear"),
];

const touchFolders = {
	colors: grid([
		selectionToolbar(),
		COLORS.map((c) => color(c)), // current selection
		...range(1, 6).map(colorRow), // groups 1-6
	]),
	matricks: grid([
		[BACK, mx("reset"), mx("set", "XWings", 2), mx("set", "XWings", 3), mx("set", "XBlock", 2), mx("set", "XGroup", 2), mx("set", "XGroup", 3), menu("MatricksOverlay")],
		...["X", "Y", "Z"].flatMap((axis) => [
			["Block", "Group", "Wings", "Width"].flatMap((p) => [mx("down", `${axis}${p}`), mx("up", `${axis}${p}`)]),
			["Shift", "Shuffle"].flatMap((p) => [mx("down", `${axis}${p}`), mx("up", `${axis}${p}`)]).concat([mx("down", `FadeTo${axis}`), mx("up", `FadeTo${axis}`), mx("down", `DelayTo${axis}`), mx("up", `DelayTo${axis}`)]),
		]),
		[k("immediate:previous"), k("immediate:next"), k("immediate:select-all"), k("immediate:clear-selection"), mx("clear", "XWings"), mx("clear", "XBlock"), mx("clear", "XGroup"), mx("clear", "XShuffle")],
	]),
	pools: grid([
		selectionToolbar(),
		range(1, 8).map(group),
		...[1, 2, 3, 4].map((pp) => range(1, 8).map((n) => pool("Preset", `${pp}.${n}`))), // dimmer, position, gobo, color
		range(1, 8).map((n) => pool("Sequence", n)),
		range(1, 8).map((n) => pool("Macro", n)),
	]),
	executors: grid([
		[BACK, page("prev"), page("next"), page("set", 1), page("set", 2), page("set", 3), page("set", 4), action("status")],
		// One executor row per 8, so 201 sits under 101 and 301 under 201.
		...[100, 200, 300].flatMap((base) => [range(base + 1, base + 8).map(exec), range(base + 9, base + 15).map(exec)]),
	]),
	windows: grid([
		[BACK, k("immediate:oops"), k("numpad:clear"), k("immediate:select-all"), k("immediate:clear-selection"), k("modes:highlight"), k("modes:blind"), k("modes:freeze")],
		...chunk(MENUS.map(([id]) => menu(id)), 8),
	]),
};

const touchMain = grid([
	[action("status"), action("session", { session: "next" }), action("cmdline"), k("immediate:oops"), k("modes:highlight"), k("modes:blind"), page("prev"), page("next")],
	["dimmer", "position", "gobo", "color", "beam", "focus", "shapers", "control"].map(bank),
	[k("objects:fixture"), k("objects:group"), k("objects:preset"), k("objects:sequence"), k("objects:cue"), k("objects:executor"), k("functions:store"), k("functions:update")],
	[k("numpad:7"), k("numpad:8"), k("numpad:9"), k("numpad:+"), k("numpad:thru"), k("numpad:full"), k("functions:delete"), k("functions:copy")],
	[k("numpad:4"), k("numpad:5"), k("numpad:6"), k("numpad:-"), k("numpad:at"), k("immediate:select-all"), k("functions:move"), k("functions:label")],
	[k("numpad:1"), k("numpad:2"), k("numpad:3"), k("numpad:0"), k("numpad:."), k("numpad:please"), k("functions:edit"), k("numpad:clear")],
	range(201, 208).map(exec),
	[
		folder("colors", "Colors", "magenta"),
		folder("matricks", "MAtricks", "purple"),
		folder("pools", "Pools", "green"),
		folder("executors", "Executors", "amber"),
		folder("windows", "Windows", "grey"),
		k("modes:freeze"),
		k("modes:solo"),
		k("modes:preview"),
	],
]);

const PROFILES = [
	{
		file: "open-gma3-deck-programmer-xl",
		name: "grandMA3 Programmer",
		model: MODELS.xl,
		keys: grid([
			[action("status"), bank("dimmer"), bank("position"), bank("gobo"), bank("color"), bank("beam"), bank("focus"), action("cmdline")],
			[k("objects:fixture"), k("objects:group"), k("numpad:7"), k("numpad:8"), k("numpad:9"), k("numpad:thru"), k("functions:store"), k("functions:update")],
			[k("objects:preset"), k("modes:highlight"), k("numpad:4"), k("numpad:5"), k("numpad:6"), k("numpad:+"), k("functions:delete"), k("immediate:oops")],
			[k("numpad:clear"), k("numpad:at"), k("numpad:1"), k("numpad:2"), k("numpad:3"), k("numpad:0"), k("numpad:."), k("numpad:please")],
		]),
	},
	{
		file: "open-gma3-deck-executors-xl",
		name: "grandMA3 Executors",
		model: MODELS.xl,
		keys: grid([
			[page("prev"), page("next"), exec(101), exec(102), exec(103), exec(104), exec(105), exec(106)],
			range(201, 208).map(exec),
			range(209, 215).map(exec).concat([action("status")]),
			range(107, 114).map(exec),
		]),
	},
	{
		file: "open-gma3-deck-color-picker-xl",
		name: "grandMA3 Color Picker",
		model: MODELS.xl,
		keys: grid(range(1, 4).map(colorRow)),
	},
	{
		file: "open-gma3-deck-color-picker-plus-xl",
		name: "grandMA3 Color Picker",
		model: MODELS.plusXl,
		keys: grid(range(1, 4).map((n) => [group(n), ...colorRow(n)])),
		dials: dials([
			fixedDial("ColorRGB_R", "Red"),
			fixedDial("ColorRGB_G", "Green"),
			fixedDial("ColorRGB_B", "Blue"),
			fixedDial("ColorRGB_W", "White"),
			fixedDial("HSB_Hue", "Hue"),
			fixedDial("HSB_Saturation", "Saturation"),
		]),
	},
	{
		file: "open-gma3-deck-encoders-plus",
		name: "grandMA3 Encoders",
		model: MODELS.plus,
		keys: grid([
			[bank("dimmer"), bank("position"), bank("color"), bank("beam")],
			[bank("gobo"), bank("focus"), action("layer", { layer: "cycle" }), action("resolution", { mode: "cycle" })],
		]),
		dials: dials([attrDial(), attrDial(), attrDial(), attrDial()]),
	},
	{
		file: "open-gma3-deck-programmer-plus-xl",
		name: "grandMA3 Programmer",
		model: MODELS.plusXl,
		keys: grid([
			[action("status"), bank("dimmer"), bank("position"), bank("gobo"), bank("color"), bank("beam"), bank("focus"), bank("shapers"), action("cmdline")],
			[k("objects:fixture"), k("objects:group"), k("numpad:7"), k("numpad:8"), k("numpad:9"), k("numpad:thru"), k("functions:store"), k("functions:update"), action("layer", { layer: "cycle" })],
			[k("objects:preset"), k("modes:highlight"), k("numpad:4"), k("numpad:5"), k("numpad:6"), k("numpad:+"), k("functions:delete"), k("immediate:oops"), action("resolution", { mode: "cycle" })],
			[k("numpad:clear"), k("numpad:at"), k("numpad:1"), k("numpad:2"), k("numpad:3"), k("numpad:0"), k("numpad:."), k("numpad:full"), k("numpad:please")],
		]),
		dials: dials([attrDial(), attrDial(), attrDial(), attrDial(), attrDial(), attrDial()]),
	},
	{
		file: "open-gma3-deck-preprogramming-touch-8x8",
		name: "grandMA3 Pre-programming (touch)",
		model: MODELS.virtual,
		keys: touchMain,
		folders: touchFolders,
	},
];

// --- key images (folder and back keys) -------------------------------------------------------------

let renderKey;
let browser;
function setupRenderer() {
	if (renderKey !== undefined) return;
	browser = [
		process.env.CHROME_PATH,
		"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
		"C:/Program Files/Google/Chrome/Application/chrome.exe",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
	]
		.filter(Boolean)
		.find((b) => fs.existsSync(b));
	if (!browser) {
		console.warn("No Chrome / Edge found: folder keys get text titles instead of images (set CHROME_PATH).");
		renderKey = null;
		return;
	}
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ogd-render-"));
	execFileSync(
		process.execPath,
		[
			path.join(root, "node_modules", "typescript", "bin", "tsc"),
			...["render", "colors", "text"].map((f) => path.join(root, "src", "core", `${f}.ts`)),
			...["--outDir", tmp, "--module", "commonjs", "--target", "es2022", "--types", "node", "--skipLibCheck"],
		],
		{ stdio: "inherit" },
	);
	fs.writeFileSync(path.join(tmp, "package.json"), '{ "type": "commonjs" }');
	renderKey = createRequire(import.meta.url)(path.join(tmp, "render.js")).renderKey;
}

const pngCache = new Map();
/** Renders a key visual to a 144 x 144 PNG (Buffer), or null without a browser. */
function keyPng(visual) {
	setupRenderer();
	if (!renderKey) return null;
	const key = JSON.stringify(visual);
	if (pngCache.has(key)) return pngCache.get(key);
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ogd-png-"));
	const html = path.join(dir, "key.html");
	const out = path.join(dir, "key.png");
	fs.writeFileSync(html, `<html><body style="margin:0;background:#000"><img width="144" height="144" src="${renderKey(visual)}"></body></html>`);
	execFileSync(browser, ["--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=144,144", `--screenshot=${out}`, "file:///" + html.replace(/\\/g, "/")], { stdio: "ignore" });
	const png = fs.readFileSync(out);
	fs.rmSync(dir, { recursive: true, force: true });
	pngCache.set(key, png);
	return png;
}

/** A built-in Stream Deck action (folder / back), optionally with a key image. */
function builtin(uuid, name, pluginName, settings, image, title) {
	const state = image ? { Image: `Images/${image}.png`, ShowTitle: false } : title ? { Title: title, ShowTitle: true, TitleAlignment: "middle" } : {};
	return {
		ActionID: crypto.randomUUID(),
		LinkedTitle: true,
		Name: name,
		Plugin: { Name: pluginName, UUID: uuid, Version: "1.0" },
		Resources: null,
		Settings: settings,
		State: 0,
		States: [state],
		UUID: uuid,
	};
}

// --- minimal zip writer (deflate + stored directories) ------------------------------------------

function zip(entries) {
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const { name, data } of entries) {
		const nameBuf = Buffer.from(name, "utf8");
		const isDir = name.endsWith("/");
		const raw = isDir ? Buffer.alloc(0) : Buffer.from(data);
		const body = isDir ? raw : zlib.deflateRawSync(raw);
		const crc = isDir ? 0 : zlib.crc32(raw);
		const method = isDir ? 0 : 8;
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(0x0800, 6); // UTF-8 names
		local.writeUInt16LE(method, 8);
		local.writeUInt32LE(crc >>> 0, 14);
		local.writeUInt32LE(body.length, 18);
		local.writeUInt32LE(raw.length, 22);
		local.writeUInt16LE(nameBuf.length, 26);
		locals.push(local, nameBuf, body);

		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt16LE(0x0800, 8);
		central.writeUInt16LE(method, 10);
		central.writeUInt32LE(crc >>> 0, 16);
		central.writeUInt32LE(body.length, 20);
		central.writeUInt32LE(raw.length, 24);
		central.writeUInt16LE(nameBuf.length, 28);
		central.writeUInt32LE(isDir ? 0x10 : 0, 38);
		central.writeUInt32LE(offset, 42);
		centrals.push(central, nameBuf);
		offset += 30 + nameBuf.length + body.length;
	}
	const centralSize = centrals.reduce((n, b) => n + b.length, 0);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(centralSize, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, ...centrals, end]);
}

// --- profile builder ------------------------------------------------------------------------------

function buildProfile(p) {
	const profileId = crypto.randomUUID().toUpperCase();
	const pageId = crypto.randomUUID();
	const defaultPageId = crypto.randomUUID();
	const base = `Profiles/${profileId}.sdProfile/`;
	const json = (o) => JSON.stringify(o);
	const folderIds = Object.fromEntries(Object.keys(p.folders ?? {}).map((id) => [id, crypto.randomUUID()]));
	const entries = [];

	/** Turns folder / back placeholders into Stream Deck actions and collects their images. */
	function resolve(keys) {
		const images = [];
		const out = {};
		for (const [pos, a] of Object.entries(keys)) {
			if (a === BACK) {
				const png = keyPng({ label: "◀ Back", color: "white", style: "outline" });
				if (png) images.push(["OGDBACK", png]);
				out[pos] = builtin("com.elgato.streamdeck.profile.backtoparent", "Parent Folder", "Open Parent Folder", {}, png && "OGDBACK", png ? undefined : "Back");
			} else if (a && a.folder) {
				const name = `OGDFOLDER${a.folder.toUpperCase()}`;
				const png = keyPng({ top: "Folder", label: a.label, color: a.iconColor, active: true, style: "backlit" });
				if (png) images.push([name, png]);
				out[pos] = builtin("com.elgato.streamdeck.profile.openchild", "Create Folder", "Create Folder", { ProfileUUID: folderIds[a.folder] }, png && name, png ? undefined : a.label);
			} else {
				out[pos] = a;
			}
		}
		return { actions: out, images };
	}

	function page(id, keys, dialActions, name) {
		const dir = `${base}Profiles/${id.toUpperCase()}/`;
		const { actions, images } = resolve(keys ?? {});
		const controllers = [{ Actions: Object.keys(actions).length ? actions : null, Type: "Keypad" }];
		if (p.dials) controllers.push({ Actions: dialActions ?? null, Type: "Encoder" });
		entries.push({ name: dir }, { name: `${dir}Images/` });
		for (const [img, png] of images) entries.push({ name: `${dir}Images/${img}.png`, data: png });
		entries.push({ name: `${dir}manifest.json`, data: json({ Controllers: controllers, Icon: "", Name: name }) });
	}

	entries.push(
		{
			name: "package.json",
			data: json({
				AppVersion: "7.1.0.0",
				DeviceModel: p.model,
				DeviceSettings: null,
				FormatVersion: 1,
				OSType: "Windows",
				OSVersion: "10.0",
				RequiredPlugins: [PLUGIN.UUID],
			}),
		},
		{ name: "Profiles/" },
		{ name: base },
		{ name: `${base}Images/` },
		{
			name: `${base}manifest.json`,
			data: json({
				Device: { Model: p.model, UUID: "" },
				Name: p.name,
				Pages: { Current: "00000000-0000-0000-0000-000000000000", Default: defaultPageId, Pages: [pageId] },
				Version: "3.0",
			}),
		},
		{ name: `${base}Profiles/` },
	);
	page(pageId, p.keys, p.dials, p.name);
	for (const [id, keys] of Object.entries(p.folders ?? {})) page(folderIds[id], keys, null, "");
	page(defaultPageId, {}, null, "");
	return zip(entries);
}

fs.mkdirSync(outDir, { recursive: true });
const only = process.argv[2];
for (const p of PROFILES) {
	if (only && !p.file.includes(only)) continue;
	const file = path.join(outDir, `${p.file}.streamDeckProfile`);
	fs.writeFileSync(file, buildProfile(p));
	console.log("wrote", path.relative(root, file));
}
