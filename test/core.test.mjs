// Unit tests for the dependency-free core modules. Run with: npm test (Node >= 22.18 / 24).
import assert from "node:assert/strict";
import dgram from "node:dgram";
import { test } from "node:test";

import { banksFromShow, DEFAULT_BANKS, parseBanks } from "../src/core/banks.ts";
import { LAYERS, layerInfo } from "../src/core/layers.ts";
import { MATRICKS_PROPERTIES, matricksProperty, nextAxis } from "../src/core/matricks.ts";
import { appendToken, backspace, fillTemplate, formatNumber, removeLastToken, splitCommands } from "../src/core/cmdline.ts";
import { KEY_PRESET_LIST } from "../src/core/keys.ts";
import { decodePacket, encodeMessage } from "../src/core/osc.ts";
import { luminance, resolveColor, shade, textOn } from "../src/core/colors.ts";
import {
	buildAttributeSyncLua,
	buildSyncCommand,
	buildSyncLua,
	friendlyAttribute,
	parseAttributeChunk,
	parseExecChunk,
	parseNamesChunk,
	parseObjectFeedback,
	poolKey,
} from "../src/core/names.ts";
import { normalizeGlobals } from "../src/core/settings.ts";
import { fitLabel, wrap } from "../src/core/text.ts";

test("OSC: /cmd string message matches the byte layout grandMA3 expects", () => {
	const buf = encodeMessage("/gma3/cmd", [{ type: "s", value: "Go+ Sequence 1" }]);
	// address "/gma3/cmd" (9 chars + null -> 12 bytes), ",s" (-> 4 bytes), string (14 + null -> 16 bytes)
	assert.equal(buf.length, 12 + 4 + 16);
	assert.equal(buf.toString("ascii", 0, 9), "/gma3/cmd");
	assert.equal(buf.toString("ascii", 12, 14), ",s");
	assert.equal(buf.length % 4, 0);
});

test("OSC: encode / decode round trip with all argument types", () => {
	const buf = encodeMessage("/gma3/Page1/Fader201", [100, 0.5, "FaderMaster", true, false, null]);
	const [msg] = decodePacket(buf);
	assert.equal(msg.address, "/gma3/Page1/Fader201");
	assert.equal(msg.args[0], 100);
	assert.ok(Math.abs(msg.args[1] - 0.5) < 1e-6);
	assert.deepEqual(msg.args.slice(2), ["FaderMaster", true, false, null]);
});

test("OSC: bundles are flattened", () => {
	const a = encodeMessage("/a", [1]);
	const b = encodeMessage("/b", ["x"]);
	const size = (m) => {
		const s = Buffer.alloc(4);
		s.writeInt32BE(m.length);
		return s;
	};
	const bundle = Buffer.concat([Buffer.from("#bundle\0", "ascii"), Buffer.alloc(8), size(a), a, size(b), b]);
	const msgs = decodePacket(bundle);
	assert.deepEqual(
		msgs.map((m) => m.address),
		["/a", "/b"],
	);
});

test("OSC: real UDP round trip on localhost", async () => {
	const server = dgram.createSocket("udp4");
	await new Promise((r) => server.bind(0, "127.0.0.1", r));
	const received = new Promise((resolve) => server.once("message", (m) => resolve(decodePacket(m)[0])));
	const client = dgram.createSocket("udp4");
	client.send(encodeMessage("/gma3/cmd", ["Clear"]), server.address().port, "127.0.0.1");
	const msg = await received;
	assert.equal(msg.address, "/gma3/cmd");
	assert.deepEqual(msg.args, ["Clear"]);
	client.close();
	server.close();
});

test("command line: numbers glue, keywords get spaces", () => {
	let line = "";
	for (const t of ["Preset", "4", ".", "1", "2"]) line = appendToken(line, t);
	assert.equal(line, "Preset 4.12");
	assert.equal(["Fixture", "1", "Thru", "10", "At", "5", "0"].reduce(appendToken, ""), "Fixture 1 Thru 10 At 50");
	assert.equal(["Store", "Group", "3"].reduce(appendToken, ""), "Store Group 3");
});

test("command line: backspace and remove token", () => {
	assert.equal(backspace("Fixture 12"), "Fixture 1");
	assert.equal(backspace("Fixture 1"), "Fixture");
	assert.equal(removeLastToken("Store Group 3"), "Store Group");
});

test("templates and formatting", () => {
	assert.equal(fillTemplate('Attribute "{attr}" At {sign} {abs}', { attr: "Pan", sign: "-", abs: "2.5" }), 'Attribute "Pan" At - 2.5');
	assert.equal(fillTemplate("Go+ Page {p}.{e} {unknown}", { p: 1, e: 201 }), "Go+ Page 1.201 {unknown}");
	assert.equal(formatNumber(10), "10");
	assert.equal(formatNumber(100), "100");
	assert.equal(formatNumber(0.1 + 0.2), "0.3");
	assert.equal(formatNumber(-0.05), "-0.05");
	assert.deepEqual(splitCommands("Go+ Sequence 1\n\n// comment\nOff Sequence 2;;Clear"), ["Go+ Sequence 1", "Off Sequence 2", "Clear"]);
});

test("banks: defaults and custom JSON", () => {
	assert.equal(parseBanks("").banks, DEFAULT_BANKS);
	const { banks, error } = parseBanks('[{"name":"Mine","attrs":["Pan",{"attr":"Tilt","step":0.5}]}]');
	assert.equal(error, undefined);
	assert.equal(banks[0].id, "mine");
	assert.deepEqual(banks[0].attrs[1], { attr: "Tilt", label: "Tilt", step: 0.5 });
	const bad = parseBanks("{nope");
	assert.equal(bad.banks, DEFAULT_BANKS);
	assert.ok(bad.error);
});

test("key presets have unique ids", () => {
	const ids = KEY_PRESET_LIST.map((k) => k.id);
	assert.equal(new Set(ids).size, ids.length);
	assert.ok(ids.includes("functions:store"));
	assert.ok(ids.includes("numpad:please"));
});

test("render: word wrap", () => {
	assert.deepEqual(wrap("Clear Selection", 8, 3), ["Clear", "Selectio", "n"]);
	assert.deepEqual(wrap("Go+", 5, 3), ["Go+"]);
	assert.equal(wrap("a b c d e f g h", 1, 3).length, 3);
});

test("render: labels shrink instead of breaking words", () => {
	const store = fitLabel("Store", 118, 90);
	assert.deepEqual(store.lines, ["Store"]);
	const long = fitLabel("OW Viper Odd", 118, 60);
	assert.ok(long.lines.every((l) => !l.endsWith("…")));
	assert.ok(long.lines.join(" ").includes("Viper"));
});

test("colors: palette names, hex and contrast", () => {
	assert.equal(resolveColor("red", "grey"), "#ff3b30");
	assert.equal(resolveColor("#ABC", "grey"), "#aabbcc");
	assert.equal(resolveColor("", "cyan"), "#22d3ee");
	assert.equal(resolveColor("nonsense", "#123456"), "#123456");
	assert.equal(textOn(resolveColor("yellow", "")), "#101114");
	assert.equal(textOn(resolveColor("red", "")), "#ffffff");
	assert.ok(luminance(shade("#ffffff", 0.3)) < luminance("#ffffff"));
});

test("names: sync Lua is a single command line without double quotes", () => {
	const lua = buildSyncLua(2, [1, 3, 3, 0, -1]);
	assert.ok(!lua.includes('"'));
	assert.ok(!lua.includes("\n"));
	assert.ok(lua.includes("{1,3}"));
	assert.match(buildSyncCommand(2, [1]), /^Lua ".*"$/);
});

test("names: reply chunks become command line keys", () => {
	assert.deepEqual(parseNamesChunk("Groups|1=Vipers|3=Auras"), [
		["Group 1", "Vipers"],
		["Group 3", "Auras"],
	]);
	assert.deepEqual(parseNamesChunk("Preset4|1=Open White"), [["Preset 4.1", "Open White"]]);
	assert.deepEqual(parseNamesChunk("Exec1|101=Master|204=Move Speed"), [
		["Exec 1.101", "Master"],
		["Exec 1.204", "Move Speed"],
	]);
	assert.deepEqual(parseNamesChunk("Macros|"), []);
	assert.deepEqual(parseNamesChunk("Unknown|1=x"), []);
	assert.equal(poolKey("Preset", " 4.1 "), "Preset 4.1");
});

test("settings: sessions and key look are normalised", () => {
	const g = normalizeGlobals({ sessions: [{ name: "FOH", host: "10.0.0.5", port: "9000" }, null], keyStyle: "outline", keyIdle: "5" });
	assert.equal(g.sessions.length, 1);
	assert.equal(g.sessions[0].port, 9000);
	assert.equal(g.sessions[0].prefix, "gma3");
	assert.equal(g.keyStyle, "outline");
	assert.equal(g.keyIdle, 0.9);
	assert.equal(normalizeGlobals({ prefix: "" }).prefix, "");
});

test("banks: built from the grandMA3 patch", () => {
	const banks = banksFromShow(
		[
			{ group: "Position", attrs: ["Pan", "Tilt", "XYZ_X"] },
			{ group: "Video", attrs: [] },
		],
		friendlyAttribute,
	);
	assert.equal(banks.length, 1);
	assert.equal(banks[0].id, "position");
	assert.equal(banks[0].attrs[2].step, 0.05);
	assert.equal(banks[0].color, "#4aa3ff");
});

test("names: attribute sync Lua and replies", () => {
	const lua = buildAttributeSyncLua(2);
	assert.ok(!lua.includes('"'));
	assert.deepEqual(parseAttributeChunk("Color|ColorRGB_R=R|CTO=CTO"), { group: "Color", attrs: ["ColorRGB_R", "CTO"] });
	assert.equal(parseAttributeChunk(""), undefined);
	assert.equal(friendlyAttribute("Gobo1Pos"), "Gobo 1 Pos");
	assert.equal(friendlyAttribute("ColorRGB_WW"), "Warm White");
	assert.equal(friendlyAttribute("HSB_Hue"), "Hue");
	assert.equal(friendlyAttribute("CTO"), "CTO");
	assert.equal(friendlyAttribute("Effects1Rate"), "Effects 1 Rate");
});

test("layers: absolute first, timing layers have their own step", () => {
	assert.equal(LAYERS[0].id, "");
	assert.equal(layerInfo("Fade").step, 0.1);
	assert.equal(layerInfo("nonsense").id, "");
});

test("matricks: properties and axis cycling", () => {
	assert.ok(MATRICKS_PROPERTIES.some((p) => p.id === "XWings"));
	assert.ok(MATRICKS_PROPERTIES.some((p) => p.id === "FadeFromZ"));
	assert.equal(matricksProperty("nope").id, "XWings");
	assert.equal(nextAxis("XWings"), "YWings");
	assert.equal(nextAxis("ZBlock"), "XBlock");
	assert.equal(nextAxis("FadeFromX"), "FadeFromY");
	assert.equal(nextAxis("DelayToZ"), "DelayToX");
});

test("executors: sync entries carry object path, running state and fader", () => {
	const payload = "Exec1|104=OW Viper Odd~.14.14.1.6.2~1~100.0|204=Move Speed~.14.14.1.9.3~~50.0";
	assert.deepEqual(parseNamesChunk(payload), [
		["Exec 1.104", "OW Viper Odd"],
		["Exec 1.204", "Move Speed"],
	]);
	assert.deepEqual(parseExecChunk(payload), [
		{ page: 1, exec: 104, path: "14.14.1.6.2", running: true, fader: 100 },
		{ page: 1, exec: 204, path: "14.14.1.9.3", running: undefined, fader: 50 },
	]);
	assert.deepEqual(parseExecChunk("Groups|1=Vipers"), []);
});

test("executors: object feedback as sent by grandMA3 2.4", () => {
	// Captured from grandMA3 onPC 2.4.2.2 with Send enabled.
	assert.deepEqual(parseObjectFeedback("/gma3/14.14.1.6.2", ["Go+", 1, "OW Viper Odd 1 [100%/Open White]"]), { path: "14.14.1.6.2", running: true });
	assert.deepEqual(parseObjectFeedback("/gma3/14.14.1.6.2", ["FaderMaster", 1, 50]), { path: "14.14.1.6.2", fader: 50 });
	assert.deepEqual(parseObjectFeedback("/gma3/14.14.1.6.2", ["Off", 1]), { path: "14.14.1.6.2", running: false });
	assert.equal(parseObjectFeedback("/gma3/Page1/Fader201", [100]), undefined);
	assert.equal(parseObjectFeedback("/gma3/deck/names", ["x"]), undefined);
});
