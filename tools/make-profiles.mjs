// Builds ready-made Stream Deck profiles (.streamDeckProfile) into profiles/.
// Run with: node tools/make-profiles.mjs
//
// The format mirrors profiles exported by the Stream Deck app 7.x (FormatVersion 1, Version 3.0):
//   package.json
//   Profiles/<PROFILE-ID>.sdProfile/manifest.json
//   Profiles/<PROFILE-ID>.sdProfile/Profiles/<PAGE-ID>/manifest.json
// No dependencies: the zip is written with Node's built-in zlib.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "org.open-gma3-deck.sdPlugin", "manifest.json"), "utf8"));
const PLUGIN = { Name: manifest.Name, UUID: manifest.UUID, Version: manifest.Version };
const outDir = path.join(root, "profiles");

/** Stream Deck hardware model codes as used in exported profiles. */
const MODELS = {
	xl: "20GAT9902", // Stream Deck XL (8 x 4)
	plus: "20GBD9901", // Stream Deck + (4 x 2 + 4 dials)
	plusXl: "20GBX9901", // Stream Deck + XL (9 x 4 + 6 dials)
};

const actionNames = Object.fromEntries(manifest.Actions.map((a) => [a.UUID.split(".").pop(), a.Name]));

function action(id, settings = {}) {
	return {
		ActionID: crypto.randomUUID(),
		LinkedTitle: true,
		Name: actionNames[id],
		Plugin: PLUGIN,
		Resources: null,
		Settings: settings,
		State: 0,
		States: [{ FontFamily: "", FontSize: 12, FontStyle: "", FontUnderline: false, OutlineThickness: 2, ShowTitle: false, TitleAlignment: "bottom", TitleColor: "#ffffff" }],
		UUID: `${PLUGIN.UUID}.${id}`,
	};
}

// Shorthands for the key grid.
const k = (preset) => action("ma-key", { preset });
const bank = (id) => action("bank", { bank: id });
const exec = (n) => action("executor", { exec: String(n), func: "go" });
const attrDial = () => action("attribute-dial", { mode: "bank" });
const fixedDial = (attr, label) => action("attribute-dial", { mode: "fixed", attr, label });
const group = (n) => action("pool", { type: "Group", number: String(n) });

/** One row of the colour picker: every key selects the group, then sets its colour. */
const COLORS = ["white", "red", "orange", "yellow", "green", "cyan", "blue", "magenta"];
const colorRow = (groupNo) => COLORS.map((c) => action("color", { color: c, group: String(groupNo), white: c === "white" ? "full" : "zero" }));

/** Rows of actions -> { "col,row": action }. `null` leaves a key empty. */
function grid(rows) {
	const out = {};
	rows.forEach((row, r) => row.forEach((a, c) => a && (out[`${c},${r}`] = a)));
	return out;
}

function dials(list) {
	return Object.fromEntries(list.map((a, i) => [`${i},0`, a]));
}

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
			[action("page", { mode: "prev" }), action("page", { mode: "next" }), exec(101), exec(102), exec(103), exec(104), exec(105), exec(106)],
			[201, 202, 203, 204, 205, 206, 207, 208].map(exec),
			[209, 210, 211, 212, 213, 214, 215].map(exec).concat([action("status")]),
			[107, 108, 109, 110, 111, 112, 113, 114].map(exec),
		]),
	},
	{
		file: "open-gma3-deck-color-picker-xl",
		name: "grandMA3 Color Picker",
		model: MODELS.xl,
		keys: grid([1, 2, 3, 4].map(colorRow)),
	},
	{
		file: "open-gma3-deck-color-picker-plus-xl",
		name: "grandMA3 Color Picker",
		model: MODELS.plusXl,
		keys: grid([1, 2, 3, 4].map((n) => [group(n), ...colorRow(n)])),
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
];

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

	const controllers = [{ Actions: p.keys, Type: "Keypad" }];
	if (p.dials) controllers.push({ Actions: p.dials, Type: "Encoder" });
	const emptyControllers = [{ Actions: null, Type: "Keypad" }];
	if (p.dials) emptyControllers.push({ Actions: null, Type: "Encoder" });

	return zip([
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
		{ name: `${base}Profiles/${pageId.toUpperCase()}/` },
		{ name: `${base}Profiles/${pageId.toUpperCase()}/Images/` },
		{ name: `${base}Profiles/${pageId.toUpperCase()}/manifest.json`, data: json({ Controllers: controllers, Icon: "", Name: p.name }) },
		{ name: `${base}Profiles/${defaultPageId.toUpperCase()}/` },
		{ name: `${base}Profiles/${defaultPageId.toUpperCase()}/manifest.json`, data: json({ Controllers: emptyControllers, Icon: "", Name: "" }) },
	]);
}

fs.mkdirSync(outDir, { recursive: true });
for (const p of PROFILES) {
	const file = path.join(outDir, `${p.file}.streamDeckProfile`);
	fs.writeFileSync(file, buildProfile(p));
	console.log("wrote", path.relative(root, file));
}
