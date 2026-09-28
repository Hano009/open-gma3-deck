/* Open grandMA3 Deck – session manager. Used by the popup (sessions.html) and inline in the
 * property inspector when popups are blocked. Plain JS, no dependencies.
 *
 * `api` is window.ogd from pi.js: getGlobals, saveGlobals, activateSession, syncNames, test,
 * onChange, offChange.
 */
"use strict";

// eslint-disable-next-line no-unused-vars
function mountSessions(root, api) {
	const CONNECTION = ["host", "port", "prefix", "listenPort", "feedbackLine"];
	const FIELDS = [
		{ key: "name", label: "Name", type: "text", placeholder: "FOH console" },
		{ key: "host", label: "MA3 IP", type: "text", placeholder: "192.168.1.10" },
		{ key: "port", label: "OSC port", type: "number", placeholder: "8000" },
		{ key: "prefix", label: "Prefix", type: "text", placeholder: "gma3" },
		{ key: "listenPort", label: "Feedback port", type: "number", placeholder: "8001" },
		{ key: "feedbackLine", label: "Feedback line", type: "number", placeholder: "2" },
	];
	const DEFAULTS = { host: "127.0.0.1", port: 8000, prefix: "gma3", listenPort: 8001, feedbackLine: 2 };

	let editing = null; // session id, or "new"
	let draft = {};
	let confirmDelete = null;

	const h = (tag, attrs = {}, ...children) => {
		const e = document.createElement(tag);
		for (const [k, v] of Object.entries(attrs)) {
			if (v === undefined || v === null || v === false) continue;
			if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
			else if (k === "text") e.textContent = v;
			else e.setAttribute(k, v === true ? "" : v);
		}
		for (const c of children) if (c !== null && c !== undefined) e.append(c);
		return e;
	};

	const sessionsOf = (g) => (Array.isArray(g.sessions) ? g.sessions : []);
	const currentConnection = (g) => Object.fromEntries(CONNECTION.map((k) => [k, g[k] ?? DEFAULTS[k]]));
	const isActive = (g, s) => s.id === g.activeSession && CONNECTION.every((k) => String(s[k]) === String(g[k] ?? DEFAULTS[k]));

	function clean(d) {
		const out = { ...d };
		out.name = String(out.name || "").trim() || "Untitled session";
		out.host = String(out.host || "").trim() || DEFAULTS.host;
		out.prefix = String(out.prefix ?? DEFAULTS.prefix).trim().replace(/^\/+|\/+$/g, "");
		for (const k of ["port", "listenPort", "feedbackLine"]) {
			const n = parseInt(out[k], 10);
			out[k] = Number.isFinite(n) && n >= 0 ? n : DEFAULTS[k];
		}
		return out;
	}

	function save() {
		const g = api.getGlobals();
		const list = sessionsOf(g).slice();
		const session = clean(draft);
		if (editing === "new") {
			session.id = "s" + Date.now().toString(36);
			list.push(session);
		} else {
			const i = list.findIndex((s) => s.id === editing);
			session.id = editing;
			if (i >= 0) list[i] = session;
		}
		const wasActive = editing !== "new" && g.activeSession === editing;
		api.saveGlobals({ ...g, sessions: list });
		// Editing the active session updates the live connection too.
		if (wasActive) api.activateSession(session.id);
		editing = null;
		render();
	}

	function remove(id) {
		const g = api.getGlobals();
		api.saveGlobals({ ...g, sessions: sessionsOf(g).filter((s) => s.id !== id), activeSession: g.activeSession === id ? "" : g.activeSession });
		confirmDelete = null;
		render();
	}

	function move(id, delta) {
		const g = api.getGlobals();
		const list = sessionsOf(g).slice();
		const i = list.findIndex((s) => s.id === id);
		const j = i + delta;
		if (i < 0 || j < 0 || j >= list.length) return;
		[list[i], list[j]] = [list[j], list[i]];
		api.saveGlobals({ ...g, sessions: list });
		render();
	}

	function startEdit(id, values) {
		editing = id;
		draft = { ...values };
		render();
		root.querySelector("input")?.focus();
	}

	function renderEditor() {
		const rows = FIELDS.map((f) =>
			h(
				"div",
				{ class: "row" },
				h("label", { class: "label", text: f.label }),
				h(
					"div",
					{ class: "field" },
					h("input", {
						type: f.type,
						placeholder: f.placeholder,
						value: draft[f.key] ?? "",
						oninput: (e) => (draft[f.key] = e.target.value),
						onkeydown: (e) => e.key === "Enter" && save(),
					}),
				),
			),
		);
		return h(
			"div",
			{ class: "session-editor" },
			h("h3", { text: editing === "new" ? "New session" : "Edit session" }),
			...rows,
			h(
				"div",
				{ class: "row" },
				h("span", { class: "label" }),
				h(
					"div",
					{ class: "field buttons" },
					h("button", { type: "button", onclick: save, text: "Save" }),
					h("button", { type: "button", class: "secondary", onclick: () => ((editing = null), render()), text: "Cancel" }),
				),
			),
		);
	}

	function render() {
		const g = api.getGlobals();
		const list = sessionsOf(g);
		root.innerHTML = "";

		if (list.length === 0) {
			root.append(h("p", { class: "empty", text: "No saved sessions yet. Save the current connection, or add one for each console or onPC you work with." }));
		}

		list.forEach((s, i) => {
			const active = isActive(g, s);
			const detail = `${s.host}:${s.port} · /${s.prefix || ""} · feedback ${s.listenPort}` + (s.feedbackLine ? ` (line ${s.feedbackLine})` : "");
			root.append(
				h(
					"div",
					{ class: "session" + (active ? " active" : "") },
					h("div", { class: "session-text" }, h("div", { class: "session-name", text: (active ? "● " : "") + s.name }), h("div", { class: "session-detail", text: detail })),
					h(
						"div",
						{ class: "session-buttons" },
						active ? h("span", { class: "tag", text: "Active" }) : h("button", { type: "button", onclick: () => api.activateSession(s.id), text: "Use" }),
						h("button", { type: "button", class: "secondary", title: "Edit", onclick: () => startEdit(s.id, s), text: "Edit" }),
						h("button", { type: "button", class: "secondary icon", title: "Move up", disabled: i === 0, onclick: () => move(s.id, -1), text: "▲" }),
						h("button", { type: "button", class: "secondary icon", title: "Move down", disabled: i === list.length - 1, onclick: () => move(s.id, 1), text: "▼" }),
						confirmDelete === s.id
							? h("button", { type: "button", class: "danger", onclick: () => remove(s.id), text: "Delete?" })
							: h("button", { type: "button", class: "secondary icon", title: "Delete", onclick: () => ((confirmDelete = s.id), render()), text: "✕" }),
					),
				),
			);
		});

		root.append(
			h(
				"div",
				{ class: "buttons session-actions" },
				h("button", { type: "button", onclick: () => startEdit("new", { name: "", ...DEFAULTS }), text: "+ New session" }),
				h("button", { type: "button", class: "secondary", onclick: () => startEdit("new", { name: "", ...currentConnection(g) }), text: "+ Save current connection" }),
			),
		);

		if (editing) root.append(renderEditor());
	}

	// Refresh when settings change elsewhere, but never while the user is typing in the editor.
	const onChange = () => {
		if (!editing) render();
	};
	api.onChange(onChange);
	window.addEventListener("unload", () => api.offChange(onChange));
	render();
}
