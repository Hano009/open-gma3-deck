/* Open grandMA3 Deck – property inspector. Plain JS, no dependencies. */
"use strict";

const PREFIX = "org.open-gma3-deck.";

let ws;
let uuid;
let actionUUID;
let settings = {};
let globals = {};
let catalog = { keys: [], banks: [], banksError: "", status: null };

// ---------------------------------------------------------------------------------------------
// Field schemas. `show(s)` decides visibility from the current settings.
// ---------------------------------------------------------------------------------------------

const COLOR = { key: "color", label: "Color", type: "palette" };
const STYLE = {
	key: "keyStyle",
	label: "Style",
	type: "select",
	options: [
		["", "Default (from connection settings)"],
		["backlit", "Backlit (filled with colour)"],
		["outline", "Outline (coloured frame)"],
	],
	default: "",
};
const LABEL = { key: "label", label: "Label", type: "text", placeholder: "automatic" };

const EXEC_FUNCTIONS = [
	["key", "Button as assigned in grandMA3 (OSC key)"],
	["go", "Go+"],
	["goback", "Go-"],
	["pause", "Pause"],
	["toggle", "Toggle"],
	["on", "On"],
	["off", "Off"],
	["top", "Top"],
	["flash", "Flash (momentary)"],
	["temp", "Temp (momentary)"],
	["swap", "Swap (momentary)"],
	["select", "Select"],
	["custom", "Custom commands"],
];

const POOL_TYPES = ["Group", "Preset", "Sequence", "Macro", "View", "World", "Filter", "MAtricks", "Page", "Timecode", "Timer", "Plugin", "Layout", "Appearance", "Fixture"];
const POOL_VERBS = [
	["default", "Default for pool"],
	["", "None (call / select)"],
	["Go+", "Go+"],
	["Go-", "Go-"],
	["Off", "Off"],
	["On", "On"],
	["Toggle", "Toggle"],
	["Top", "Top"],
	["Select", "Select"],
	["Call", "Call"],
	["Edit", "Edit"],
	["Label", "Label"],
	["Store", "Store"],
	["Update", "Update"],
	["Delete", "Delete"],
];

const FADERS = ["Master", "X", "XA", "XB", "Temp", "Rate", "Speed", "Time"];

const bankOptions = () => catalog.banks.map((b) => [b.id, b.name]);

const SCHEMAS = {
	"ma-key": {
		info: "Most keys type into the command line, just like on the console. Press <b>Please</b> or the <b>Command Line</b> key to send it. Mode keys such as Highlight and Blind act immediately.",
		fields: [
			{ key: "preset", label: "Key", type: "select", options: () => keyOptions(), default: "functions:store" },
			{ key: "token", label: "Text", type: "text", placeholder: "e.g. Store", show: (s) => s.preset === "custom" },
			{
				key: "behavior",
				label: "Behaviour",
				type: "select",
				options: [
					["append", "Append to command line"],
					["exec", "Send immediately"],
					["toggle", "Send + show latched state"],
					["please", "Please (send command line)"],
					["clear", "Clear"],
					["backspace", "Backspace"],
					["escape", "Escape (discard)"],
				],
				default: "append",
				show: (s) => s.preset === "custom",
			},
			LABEL,
			COLOR,
			STYLE,
		],
	},
	cmdline: {
		info: "Shows the command you are typing with the MA Keys. <b>Tap</b> to send it (Please), <b>hold</b> to clear it.<br>Tip: type <i>Store</i>, then press a Pool Object or Executor key to store straight into it.",
		fields: [STYLE],
	},
	command: {
		fields: [
			{
				key: "mode",
				label: "Mode",
				type: "select",
				options: [
					["momentary", "Press / release"],
					["toggle", "Toggle (alternate)"],
					["append", "Type into command line"],
				],
				default: "momentary",
			},
			{ key: "press", label: "On press", type: "textarea", placeholder: "Go+ Sequence 1\nOne command per line", hint: "One command per line, or separate commands with ;;" },
			{ key: "release", label: "On release", type: "textarea", placeholder: "optional", show: (s) => (s.mode || "momentary") === "momentary" },
			{ key: "pressOff", label: "Toggle off", type: "textarea", placeholder: "Off Sequence 1", show: (s) => s.mode === "toggle" },
			LABEL,
			COLOR,
			STYLE,
		],
	},
	executor: {
		fields: [
			{ key: "page", label: "Page", type: "number", placeholder: "follow Page keys", min: 1 },
			{ key: "exec", label: "Executor", type: "number", placeholder: "201", min: 1, hint: "Executor number as shown in grandMA3, e.g. 201." },
			{ key: "func", label: "Function", type: "select", options: EXEC_FUNCTIONS, default: "key" },
			{ key: "press", label: "On press", type: "textarea", placeholder: "Go+ Page {p}.{e}", hint: "Use {p} for the page and {e} for the executor number.", show: (s) => s.func === "custom" },
			{ key: "release", label: "On release", type: "textarea", placeholder: "optional", show: (s) => s.func === "custom" },
			LABEL,
			COLOR,
			STYLE,
		],
	},
	pool: {
		fields: [
			{ key: "type", label: "Pool", type: "select", options: POOL_TYPES.map((t) => [t, t]), default: "Group" },
			{ key: "number", label: "Number", type: "text", placeholder: "1  (presets: 4.12)" },
			{ key: "verb", label: "Action", type: "select", options: POOL_VERBS, default: "default" },
			LABEL,
			COLOR,
			STYLE,
		],
	},
	bank: {
		info: "Chooses which attributes the <b>Attribute Encoder</b> dials control when they are set to <i>Follow bank</i>. Press the active bank again to show its next page of attributes.",
		fields: [{ key: "bank", label: "Bank", type: "select", options: bankOptions, default: "position" }, LABEL, STYLE],
	},
	"encoder-page": {
		fields: [
			{
				key: "direction",
				label: "Direction",
				type: "select",
				options: [
					["next", "Next"],
					["prev", "Previous"],
				],
				default: "next",
			},
			STYLE,
		],
	},
	resolution: {
		fields: [
			{
				key: "mode",
				label: "Mode",
				type: "select",
				options: [
					["cycle", "Cycle coarse → fine → ultra"],
					["fine", "Fine (latching)"],
					["ultra", "Ultra (latching)"],
				],
				default: "cycle",
			},
			COLOR, STYLE,
		],
	},
	page: {
		fields: [
			{
				key: "mode",
				label: "Mode",
				type: "select",
				options: [
					["next", "Page +"],
					["prev", "Page -"],
					["set", "Go to page"],
				],
				default: "next",
			},
			{ key: "page", label: "Page", type: "number", min: 1, placeholder: "1", show: (s) => s.mode === "set" },
			{ key: "sync", label: "Also on MA3", type: "checkbox", default: true, hint: "Also change the executor page on grandMA3." },
			COLOR, STYLE,
		],
	},
	status: {
		info: "Shows how many OSC messages have been sent (TX) and how long ago grandMA3 last sent feedback (RX). Press the key to send the test command.",
		fields: [STYLE],
	},
	session: {
		info: "Switches every action to a saved connection. <b>Hold</b> the key to sync names from grandMA3. Create sessions with <b>Manage sessions…</b> in the grandMA3 connection section below.",
		fields: [
			{
				key: "session",
				label: "Session",
				type: "select",
				options: () => [["next", "Next session (cycle through all)"], ...(globals.sessions || []).map((x) => [x.id, x.name])],
				default: "next",
			},
			STYLE,
		],
	},
	layer: {
		info: "Chooses what the <b>Attribute Encoders</b> change: the value itself, or its Fade, Delay, Speed, Phase, Width, Accel, Decel or Transition. Press the active layer again to go back to values.",
		fields: [
			{
				key: "layer",
				label: "Layer",
				type: "select",
				options: () => [["cycle", "Cycle through all layers"], ...(catalog.layers || []).map(([id, label]) => [id, id ? label : "Value (absolute)"])],
				default: "cycle",
			},
			COLOR,
			STYLE,
		],
	},
	matricks: {
		info: "MAtricks of the current selection. <b>Set</b> keys toggle a value on and off; <b>+ / −</b> step it; <b>Reset</b> clears every MAtricks setting.",
		fields: [
			{
				key: "func",
				label: "Function",
				type: "select",
				options: [
					["set", "Set value (press again to clear)"],
					["up", "Step up (+)"],
					["down", "Step down (−)"],
					["clear", "Clear this property"],
					["reset", "Reset all MAtricks"],
				],
				default: "set",
			},
			{ key: "prop", label: "Property", type: "select", options: () => catalog.matricks || [], default: "XWings", show: (s) => s.func !== "reset" },
			{ key: "value", label: "Value", type: "number", step: "any", placeholder: "2", show: (s) => (s.func || "set") === "set" },
			LABEL,
			COLOR,
			STYLE,
		],
	},
	color: {
		info: "Sends this colour to the selected fixtures as RGB mix values (ColorRGB_R / G / B). No preset pool needed.",
		fields: [
			{ key: "color", label: "Color", type: "palette" },
			{
				key: "white",
				label: "White",
				type: "select",
				options: [
					["keep", "Leave white as it is"],
					["zero", "Set white to 0"],
					["full", "Set white to 100"],
				],
				default: "keep",
			},
			LABEL,
		],
	},
	menu: {
		info: "Opens a grandMA3 menu, overlay or window, the same as tapping it on screen.",
		fields: [
			{ key: "menu", label: "Window", type: "select", options: () => [...(catalog.menus || []), ["custom", "Other (type the name)…"]], default: "CommandControl" },
			{ key: "custom", label: "Menu name", type: "text", placeholder: "WindowPhaserEditor", show: (s) => s.menu === "custom", hint: "Any grandMA3 menu name, as used by the Menu keyword." },
			LABEL,
			COLOR,
			STYLE,
		],
	},
	"matricks-dial": {
		info: "<b>Turn</b> to set the value (turn down to 0 to clear it). <b>Push</b> clears it, <b>tap</b> the strip for the same property on the next axis (X / Y / Z), <b>long-press</b> the strip to reset all MAtricks.",
		fields: [{ key: "prop", label: "Property", type: "select", options: () => catalog.matricks || [], default: "XWings" }, LABEL],
	},
	"attribute-dial": {
		info: "<b>Turn</b> to adjust the selected fixtures, or <b>press and turn</b> for fine control. <b>Push</b> for the next encoder page, <b>tap</b> the strip for the next bank, <b>long-press</b> the strip to switch coarse / fine / ultra.",
		fields: [
			{
				key: "mode",
				label: "Mode",
				type: "select",
				options: [
					["bank", "Follow bank (by dial position)"],
					["fixed", "Fixed attribute"],
				],
				default: "bank",
			},
			{ key: "slot", label: "Slot", type: "number", min: 1, placeholder: "auto (dial position)", show: (s) => s.mode !== "fixed" },
			{ key: "attr", label: "Attribute", type: "text", list: "attrs", placeholder: "Pan", show: (s) => s.mode === "fixed", hint: "The grandMA3 attribute name, for example Dimmer, Pan, ColorRGB_R or Gobo1_Pos." },
			{ key: "step", label: "Step", type: "number", step: "any", placeholder: "bank default (1)" },
			{ key: "invert", label: "Invert", type: "checkbox" },
			{ key: "push", label: "Push cmd", type: "text", placeholder: "default behaviour" },
			{ key: "touch", label: "Touch cmd", type: "text", placeholder: "default behaviour" },
			LABEL,
		],
	},
	"executor-dial": {
		info: "<b>Turn</b> to move the fader and <b>push</b> to press the executor button. <b>Tap</b> the strip to toggle between 0 and the last level, <b>long-press</b> it to pull the fader to 0.",
		fields: [
			{ key: "page", label: "Page", type: "number", min: 1, placeholder: "follow Page keys" },
			{ key: "exec", label: "Executor", type: "number", min: 1, placeholder: "201" },
			{ key: "fader", label: "Fader", type: "select", options: FADERS.map((f) => [f, f]), default: "Master" },
			{ key: "step", label: "Step %", type: "number", step: "any", placeholder: "2" },
			{
				key: "push",
				label: "Push",
				type: "select",
				options: [
					["key", "Press executor button"],
					["toggle", "Toggle 0 / last"],
					["none", "Nothing"],
				],
				default: "key",
			},
			LABEL,
			COLOR,
		],
	},
	"command-dial": {
		fields: [
			{
				key: "preset",
				label: "Function",
				type: "select",
				options: [
					["selection", "Selection Next / Previous"],
					["page", "Executor page"],
					["cue", "Go+ / Go- selected executor"],
					["value", "Absolute value (template)"],
					["custom", "Custom commands"],
				],
				default: "selection",
			},
			{ key: "cw", label: "Clockwise", type: "text", placeholder: "Next", show: (s) => s.preset === "custom", hint: "You can use {ticks}, {abs} and {sign}." },
			{ key: "ccw", label: "Counter-cw", type: "text", placeholder: "Previous", show: (s) => s.preset === "custom" },
			{ key: "batch", label: "Once per event", type: "checkbox", show: (s) => s.preset === "custom", hint: "Send the command once per movement using {abs}, instead of once per tick." },
			{ key: "template", label: "Template", type: "text", placeholder: "Master 3.1 At {value}", show: (s) => s.preset === "value", hint: "Sent with the current value in place of {value}, for example to control a speed master." },
			{ key: "min", label: "Min", type: "number", step: "any", placeholder: "0", show: (s) => s.preset === "value" },
			{ key: "max", label: "Max", type: "number", step: "any", placeholder: "100", show: (s) => s.preset === "value" },
			{ key: "step", label: "Step", type: "number", step: "any", placeholder: "1", show: (s) => s.preset === "value" },
			{ key: "push", label: "Push cmd", type: "text", placeholder: "optional" },
			{ key: "touch", label: "Touch cmd", type: "text", placeholder: "optional" },
			{ key: "longTouch", label: "Long touch", type: "text", placeholder: "optional" },
			LABEL,
			COLOR,
		],
	},
};

const GLOBAL_FIELDS = [
	{ key: "host", label: "MA3 IP", type: "text", placeholder: "127.0.0.1" },
	{ key: "port", label: "OSC port", type: "number", placeholder: "8000", min: 1, max: 65535 },
	{ key: "prefix", label: "Prefix", type: "text", placeholder: "gma3" },
	{ key: "listenPort", label: "Feedback port", type: "number", placeholder: "8001", min: 0, max: 65535, hint: "The port this plugin listens on for feedback from grandMA3. Set it to 0 to turn feedback off." },
	{ heading: "Names from grandMA3" },
	{
		key: "feedbackLine",
		label: "Feedback line",
		type: "number",
		placeholder: "2",
		min: 0,
		hint: "The number (No) of the grandMA3 OSC line that sends to this plugin. It needs Send and Send Command set to Yes. Set it to 0 to turn name sync off.",
	},
	{
		key: "nameSync",
		label: "Sync names",
		type: "select",
		options: [
			["auto", "Automatically (start, session and page change)"],
			["manual", "Only when I ask"],
		],
		default: "auto",
	},
	{ heading: "Encoder banks" },
	{
		key: "bankSource",
		label: "Banks from",
		type: "select",
		options: [
			["show", "The grandMA3 patch (recommended)"],
			["builtin", "Built-in defaults"],
		],
		default: "show",
		hint: "“The grandMA3 patch” builds one bank per feature group from the attributes your fixtures actually have. It needs the feedback line.",
	},
	{ key: "featureGroupSync", label: "Feature group", type: "checkbox", default: true, hint: "Also select the feature group in grandMA3 when an Encoder Bank key is pressed." },
	{ heading: "Key look" },
	{
		key: "keyStyle",
		label: "Key style",
		type: "select",
		options: [
			["backlit", "Backlit: keys filled with their colour"],
			["outline", "Outline: dark keys with a coloured frame"],
		],
		default: "backlit",
		hint: "Default for all keys. Each key can override it.",
	},
	{
		key: "keyIdle",
		label: "Idle brightness",
		type: "select",
		options: [
			["0.25", "Dark: active keys stand out most"],
			["0.38", "Medium"],
			["0.55", "Bright: best in daylight"],
		],
		default: "0.38",
		hint: "How bright backlit keys are when not active. Active keys are always full brightness.",
	},
	{ heading: "Advanced" },
	{
		key: "execTransport",
		label: "Executors via",
		type: "select",
		options: [
			["osc", "Native OSC (/PageX/KeyY, /FaderY)"],
			["cmd", "Commands (Go+ / FaderMaster)"],
		],
		default: "osc",
	},
	{
		key: "faderArgType",
		label: "Fader type",
		type: "select",
		options: [
			["i", "Integer 0–100"],
			["f", "Float 0–100"],
		],
		default: "i",
	},
	{ key: "attributeTemplate", label: "Encoder cmd", type: "text", placeholder: 'Attribute "{attr}" At {sign} {abs}', hint: "Command sent when an encoder turns. You can use {attr}, {sign}, {abs} and {delta}." },
	{ key: "fineFactor", label: "Fine factor", type: "number", step: "any", placeholder: "0.1" },
	{ key: "ultraFactor", label: "Ultra factor", type: "number", step: "any", placeholder: "0.01" },
	{ key: "acceleration", label: "Acceleration", type: "checkbox", default: true },
	{ key: "throttleMs", label: "Rate limit ms", type: "number", placeholder: "30", min: 0, max: 500 },
	{ key: "testCommand", label: "Test command", type: "text", placeholder: 'Echo "Open grandMA3 Deck: OSC OK"' },
	{
		key: "banksJson",
		label: "Custom banks",
		type: "textarea",
		placeholder: '[{"name":"Position","color":"#4aa3ff","attrs":["Pan","Tilt",{"attr":"XYZ_X","step":0.05}]}]',
		hint: "Optional. JSON that replaces the built-in encoder banks; see the README for the format.",
		rows: 5,
	},
];

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------

function keyOptions() {
	const groups = {};
	for (const k of catalog.keys) (groups[k.group] ||= []).push([k.id, k.label]);
	const out = Object.entries(groups).map(([group, options]) => ({ group, options }));
	out.push({ group: "Custom", options: [["custom", "Custom text…"]] });
	return out;
}

function el(tag, attrs = {}, children = []) {
	const e = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (v === undefined || v === null) continue;
		if (k === "html") e.innerHTML = v;
		else if (k === "text") e.textContent = v;
		else e.setAttribute(k, v);
	}
	for (const c of children) e.append(c);
	return e;
}

function fillSelect(select, options, value) {
	select.innerHTML = "";
	const list = typeof options === "function" ? options() : options;
	const addOption = (parent, [v, l]) => parent.append(el("option", { value: v, text: l }));
	for (const o of list) {
		if (o && o.group) {
			const g = el("optgroup", { label: o.group });
			o.options.forEach((opt) => addOption(g, opt));
			select.append(g);
		} else addOption(select, o);
	}
	if (value !== undefined && [...select.options].some((o) => o.value === String(value))) select.value = String(value);
	else if (value !== undefined && value !== "") {
		// Keep unknown values (e.g. before the catalog arrived) selectable.
		select.append(el("option", { value: String(value), text: String(value) }));
		select.value = String(value);
	}
}

/**
 * Colour picker: "Auto" (the key's own default colour), the plugin palette, and a custom colour.
 * Stores a palette name ("red") or a hex value in the hidden `input`.
 */
function buildPalette(input, commit) {
	const wrap = el("div");
	const grid = el("div", { class: "palette" });
	const swatches = [];
	const select = (value) => {
		input.value = value;
		for (const s of swatches) s.classList.toggle("selected", s.dataset.value === value);
		custom.value = /^#[0-9a-f]{6}$/i.test(value) ? value : "#f0a830";
		commit();
	};
	const add = (value, title, background, text) => {
		const b = el("button", { type: "button", class: "swatch" + (value ? "" : " auto"), title, text });
		b.dataset.value = value;
		if (background) b.style.background = background;
		b.addEventListener("click", () => select(value));
		swatches.push(b);
		grid.append(b);
	};
	add("", "Automatic (the key's default colour)", null, "AUTO");
	for (const [name, hex] of catalog.palette || []) add(name, name[0].toUpperCase() + name.slice(1), hex, "");

	const custom = el("input", { type: "color" });
	custom.value = /^#[0-9a-f]{6}$/i.test(input.value) ? input.value : "#f0a830";
	custom.addEventListener("change", () => select(custom.value));

	for (const s of swatches) s.classList.toggle("selected", s.dataset.value === input.value);
	wrap.append(grid, el("label", { class: "palette-custom" }, [custom, "Custom colour"]));
	return wrap;
}

function buildForm(form, fields, getValues, onChange) {
	form.innerHTML = "";
	const rows = [];
	for (const f of fields) {
		if (f.heading) {
			form.append(el("h3", { text: f.heading }));
			continue;
		}
		const values = getValues();
		const value = values[f.key] ?? f.default;
		let input;
		if (f.type === "select") {
			input = el("select", { id: f.key });
			fillSelect(input, f.options, value);
		} else if (f.type === "textarea") {
			input = el("textarea", { id: f.key, placeholder: f.placeholder, rows: f.rows ?? 3 });
			input.value = value ?? "";
		} else if (f.type === "checkbox") {
			input = el("input", { id: f.key, type: "checkbox" });
			input.checked = value === true || value === "true";
		} else if (f.type === "palette") {
			input = el("input", { id: f.key, type: "hidden" });
			input.value = value ?? "";
		} else {
			input = el("input", {
				id: f.key,
				type: f.type === "number" ? "number" : "text",
				placeholder: f.placeholder,
				min: f.min,
				max: f.max,
				step: f.step,
				list: f.list,
			});
			input.value = value ?? "";
		}

		const read = () => (f.type === "checkbox" ? input.checked : input.value);
		let timer;
		const commit = () => {
			clearTimeout(timer);
			onChange(f.key, read());
			updateVisibility();
		};
		if (f.type === "text" || f.type === "number" || f.type === "textarea") {
			input.addEventListener("input", () => {
				clearTimeout(timer);
				timer = setTimeout(commit, 300);
			});
			input.addEventListener("change", commit);
		} else {
			input.addEventListener("change", commit);
		}

		const field = el("div", { class: f.type === "checkbox" ? "field checkbox" : "field" }, [input]);
		if (f.type === "palette") field.append(buildPalette(input, commit));
		if (f.hint) field.append(el("div", { class: "hint", text: f.hint }));
		const row = el("div", { class: "row" }, [el("label", { class: "label", for: f.key, text: f.label }), field]);
		rows.push({ row, f, input });
		form.append(row);
	}

	function updateVisibility() {
		const values = getValues();
		for (const { row, f } of rows) row.classList.toggle("hidden", f.show ? !f.show(values) : false);
	}
	updateVisibility();
	return { rows, updateVisibility };
}

let actionForm;
let globalForm;

function schemaFor(action) {
	return SCHEMAS[action.replace(PREFIX, "")] ?? { fields: [] };
}

function renderAction() {
	const schema = schemaFor(actionUUID);
	const form = document.getElementById("action");
	actionForm = buildForm(
		form,
		schema.fields,
		() => settings,
		(key, value) => {
			settings[key] = value;
			send({ event: "setSettings", context: uuid, payload: settings });
		},
	);
	if (schema.info) form.prepend(el("div", { class: "info", html: schema.info }));

	// Attribute suggestions for fixed encoders.
	const list = el("datalist", { id: "attrs" });
	const attrs = new Set(catalog.banks.flatMap((b) => b.attrs));
	for (const a of attrs) list.append(el("option", { value: a }));
	form.append(list);

	// Open the connection section the first time, when nothing is configured yet.
	if (!globals.host) document.getElementById("connection").open = true;
}

/** The session picker at the top of the connection section. */
function renderSessionPicker() {
	const select = document.getElementById("session-select");
	const list = globals.sessions || [];
	const matches = (x) => ["host", "port", "prefix", "listenPort", "feedbackLine"].every((k) => String(x[k] ?? "") === String(globals[k] ?? ""));
	const active = list.find((x) => x.id === globals.activeSession && matches(x));
	fillSelect(select, [["", list.length ? "Unsaved connection" : "No saved sessions yet"], ...list.map((x) => [x.id, `${x.name}  (${x.host})`])], active ? active.id : "");
}

function renderGlobals() {
	renderSessionPicker();
	for (const listener of listeners) {
		try {
			listener(globals);
		} catch {
			listeners.delete(listener); // popup was closed
		}
	}
	globalForm = buildForm(
		document.getElementById("globals"),
		GLOBAL_FIELDS,
		() => globals,
		(key, value) => {
			globals[key] = value;
			send({ event: "setGlobalSettings", context: uuid, payload: globals });
			sendToPlugin({ type: "globalsChanged" });
		},
	);
	renderBanksError();
}

function renderBanksError() {
	document.getElementById("banks-error")?.remove();
	if (catalog.banksError && globalForm) {
		const row = globalForm.rows.find((r) => r.f.key === "banksJson");
		row?.input.parentElement.append(el("div", { id: "banks-error", class: "hint error", text: "Custom banks ignored: " + catalog.banksError }));
	}
}

function renderStatus() {
	const s = catalog.status;
	const pre = document.getElementById("status");
	const dot = document.getElementById("status-dot");
	if (!s) return;
	const ago = (t) => (t ? `${Math.round((s.now - t) / 100) / 10}s ago` : "never");
	pre.textContent =
		`Sent: ${s.txCount} (last ${ago(s.lastTx)})\n` +
		`Received: ${s.rxCount} (last ${ago(s.lastRx)})` +
		(s.lastRxAddress ? `\nLast RX: ${s.lastRxAddress}` : "") +
		(s.lastCommand ? `\nLast cmd: ${s.lastCommand}` : "") +
		(s.namesSyncedAt ? `\nNames: ${s.namesCount} (synced ${ago(s.namesSyncedAt)})` : s.syncRequested ? "\nNames: no answer yet. Check the feedback line." : "") +
		(s.listening ? "" : "\nFeedback listener: off") +
		(s.error ? `\nError: ${s.error}` : "");
	dot.className = "dot " + (s.error ? "bad" : s.lastRx && s.now - s.lastRx < 10000 ? "ok" : s.txCount ? "tx" : "");
}

// ---------------------------------------------------------------------------------------------
// Stream Deck connection
// ---------------------------------------------------------------------------------------------

function send(msg) {
	if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function sendToPlugin(payload) {
	send({ action: actionUUID, event: "sendToPlugin", context: uuid, payload });
}

// Called by Stream Deck when the property inspector loads.
// eslint-disable-next-line no-unused-vars
function connectElgatoStreamDeckSocket(port, inUUID, registerEvent, _info, actionInfo) {
	uuid = inUUID;
	const info = JSON.parse(actionInfo);
	actionUUID = info.action;
	settings = info.payload?.settings ?? {};

	ws = new WebSocket("ws://127.0.0.1:" + port);
	ws.onopen = () => {
		send({ event: registerEvent, uuid });
		send({ event: "getGlobalSettings", context: uuid });
		sendToPlugin({ type: "hello" });
	};
	ws.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		switch (msg.event) {
			case "didReceiveSettings":
				settings = msg.payload?.settings ?? {};
				renderAction();
				break;
			case "didReceiveGlobalSettings":
				globals = msg.payload?.settings ?? {};
				renderGlobals();
				if (/\.session$/.test(actionUUID)) renderAction();
				break;
			case "sendToPropertyInspector": {
				const p = msg.payload;
				if (p?.type === "catalog") {
					const firstCatalog = catalog.keys.length === 0;
					const banksChanged = JSON.stringify(p.banks) !== JSON.stringify(catalog.banks) || p.banksError !== catalog.banksError;
					catalog = p;
					// Rebuild only what depends on the catalog, so typing in a field is not interrupted.
					if (firstCatalog || (banksChanged && /\.(ma-key|bank|attribute-dial)$/.test(actionUUID))) renderAction();
					if (firstCatalog || banksChanged) renderBanksError();
					renderStatus();
				}
				break;
			}
		}
	};

	renderAction();
	renderGlobals();
}

// ---------------------------------------------------------------------------------------------
// Sessions (shared with the session manager popup through window.ogd)
// ---------------------------------------------------------------------------------------------

const listeners = new Set();

function saveGlobals(next) {
	globals = next;
	send({ event: "setGlobalSettings", context: uuid, payload: globals });
	sendToPlugin({ type: "globalsChanged" });
	renderGlobals();
}

function activateSession(id) {
	sendToPlugin({ type: "activateSession", id });
	// The plugin writes the new connection to the global settings; fetch them back.
	setTimeout(() => send({ event: "getGlobalSettings", context: uuid }), 400);
}

window.ogd = {
	getGlobals: () => JSON.parse(JSON.stringify(globals)),
	saveGlobals,
	activateSession,
	syncNames: () => sendToPlugin({ type: "syncNames" }),
	test: () => sendToPlugin({ type: "test" }),
	onChange: (cb) => listeners.add(cb),
	offChange: (cb) => listeners.delete(cb),
};

document.getElementById("session-select").addEventListener("change", (e) => {
	if (e.target.value) activateSession(e.target.value);
});

document.getElementById("manage-sessions").addEventListener("click", () => {
	const popup = window.open("sessions.html", "ogd-sessions", "width=620,height=660");
	if (!popup) {
		// Popups blocked: show the manager inline instead.
		const inline = document.getElementById("sessions-inline");
		inline.hidden = false;
		if (!inline.dataset.mounted) {
			inline.dataset.mounted = "1";
			mountSessions(inline, window.ogd);
		}
	}
});

document.getElementById("test").addEventListener("click", () => sendToPlugin({ type: "test" }));
document.getElementById("sync-names").addEventListener("click", () => sendToPlugin({ type: "syncNames" }));

// Poll the plugin for connection status while the inspector is open.
setInterval(() => {
	if (document.getElementById("connection").open) sendToPlugin({ type: "status" });
}, 1000);
