/**
 * Plugin-wide (global) settings, shared by every action and edited from any property inspector.
 */

/** A saved connection, e.g. "Local onPC", "FOH console", "Backup onPC". */
export type Session = {
	id: string;
	name: string;
	host: string;
	port: number;
	prefix: string;
	listenPort: number;
	feedbackLine: number;
};

/** The connection fields a session stores; switching session copies these into the globals. */
export const SESSION_FIELDS = ["host", "port", "prefix", "listenPort", "feedbackLine"] as const;

export type GlobalSettings = {
	/** IP address of the grandMA3 console / onPC station. */
	host: string;
	/** UDP port grandMA3 listens on (In & Out > OSC > Port). */
	port: number;
	/** OSC prefix configured in grandMA3 (without slashes). */
	prefix: string;
	/** Local UDP port to receive feedback from grandMA3 on. 0 disables feedback. */
	listenPort: number;
	/**
	 * Number ("No") of the grandMA3 OSC line that sends back to this plugin. Needed for name sync,
	 * which uses SendOSC through that line. 0 disables name sync.
	 */
	feedbackLine: number;
	/** "auto": sync names on start, session change and page change. "manual": only on request. */
	nameSync: "auto" | "manual";
	/** How executor keys / faders are sent: native OSC paths or grandMA3 commands. */
	execTransport: "osc" | "cmd";
	/** OSC type tag used for executor fader values when execTransport is "osc". */
	faderArgType: "i" | "f";
	/** Template for relative attribute changes from the encoders. */
	attributeTemplate: string;
	/** Multiplier applied in "fine" resolution. */
	fineFactor: number;
	/** Multiplier applied in "ultra" resolution. */
	ultraFactor: number;
	/** Speed up large dial movements. */
	acceleration: boolean;
	/** Minimum milliseconds between two commands for the same dial (rate limit). */
	throttleMs: number;
	/** Optional JSON array overriding the encoder banks. */
	banksJson: string;
	/** "show": build encoder banks from the patched fixtures in grandMA3 (falls back to built-in). */
	bankSource: "show" | "builtin";
	/** Also select the matching feature group in grandMA3 when an Encoder Bank key is pressed. */
	featureGroupSync: boolean;
	/** Command sent by the "Test connection" button. */
	testCommand: string;
	/** Default key look: "backlit" (filled colour) or "outline" (coloured frame). */
	keyStyle: "backlit" | "outline";
	/** Brightness of idle backlit keys, 0.15..0.9 (active keys are always full brightness). */
	keyIdle: number;
	/** Saved connections. */
	sessions: Session[];
	/** Id of the session the current connection came from ("" = not saved). */
	activeSession: string;
};

export const DEFAULT_GLOBALS: GlobalSettings = {
	host: "127.0.0.1",
	port: 8000,
	prefix: "gma3",
	listenPort: 8001,
	feedbackLine: 2,
	nameSync: "auto",
	execTransport: "cmd",
	faderArgType: "i",
	attributeTemplate: 'Attribute "{attr}" At {layer}{sign} {abs}',
	fineFactor: 0.1,
	ultraFactor: 0.01,
	acceleration: true,
	throttleMs: 30,
	banksJson: "",
	bankSource: "show",
	featureGroupSync: true,
	testCommand: 'Echo "Open grandMA3 Deck: OSC OK"',
	keyStyle: "backlit",
	keyIdle: 0.38,
	sessions: [],
	activeSession: "",
};

function num(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
	const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
	if (!Number.isFinite(n)) return fallback;
	return Math.min(max, Math.max(min, n));
}

function str(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function cleanPrefix(value: unknown, fallback: string): string {
	// An explicitly empty prefix is valid in grandMA3 (messages are then just "/cmd").
	if (value === "") return "";
	return str(value, fallback).replace(/^\/+|\/+$/g, "");
}

export function normalizeSession(raw: Record<string, unknown>, index: number): Session {
	const d = DEFAULT_GLOBALS;
	return {
		id: str(raw.id, `s${index + 1}`),
		name: str(raw.name, `Session ${index + 1}`),
		host: str(raw.host, d.host),
		port: num(raw.port, d.port, 1, 65535),
		prefix: cleanPrefix(raw.prefix, d.prefix),
		listenPort: num(raw.listenPort, d.listenPort, 0, 65535),
		feedbackLine: num(raw.feedbackLine, d.feedbackLine, 0, 9999),
	};
}

/** Fills in defaults and coerces types (the property inspector stores everything as strings). */
export function normalizeGlobals(raw: Record<string, unknown> | undefined): GlobalSettings {
	const r = raw ?? {};
	const d = DEFAULT_GLOBALS;
	const sessions = Array.isArray(r.sessions)
		? r.sessions.filter((s): s is Record<string, unknown> => !!s && typeof s === "object").map(normalizeSession)
		: [];
	return {
		host: str(r.host, d.host),
		port: num(r.port, d.port, 1, 65535),
		prefix: cleanPrefix(r.prefix, d.prefix),
		listenPort: num(r.listenPort, d.listenPort, 0, 65535),
		feedbackLine: num(r.feedbackLine, d.feedbackLine, 0, 9999),
		nameSync: r.nameSync === "manual" ? "manual" : "auto",
		// Native OSC executor paths got no reaction from grandMA3 2.4.2.2 in testing; commands work.
		execTransport: r.execTransport === "osc" ? "osc" : "cmd",
		faderArgType: r.faderArgType === "f" ? "f" : "i",
		attributeTemplate: str(r.attributeTemplate, d.attributeTemplate),
		fineFactor: num(r.fineFactor, d.fineFactor, 0.0001, 1),
		ultraFactor: num(r.ultraFactor, d.ultraFactor, 0.0001, 1),
		acceleration: r.acceleration === undefined ? d.acceleration : r.acceleration === true || r.acceleration === "true",
		throttleMs: num(r.throttleMs, d.throttleMs, 0, 500),
		banksJson: typeof r.banksJson === "string" ? r.banksJson : "",
		bankSource: r.bankSource === "builtin" ? "builtin" : "show",
		featureGroupSync: r.featureGroupSync === undefined ? d.featureGroupSync : r.featureGroupSync === true || r.featureGroupSync === "true",
		testCommand: str(r.testCommand, d.testCommand),
		keyStyle: r.keyStyle === "outline" ? "outline" : "backlit",
		keyIdle: num(r.keyIdle, d.keyIdle, 0.15, 0.9),
		sessions,
		activeSession: typeof r.activeSession === "string" ? r.activeSession : "",
	};
}

/** Connection identity: when this changes the socket is reopened and names are re-synced. */
export function connectionKey(g: GlobalSettings): string {
	return [g.host, g.port, g.prefix, g.listenPort, g.feedbackLine].join("|");
}

/** Reads a numeric action setting that may have been stored as a string. */
export function settingNumber(value: unknown, fallback: number): number {
	return num(value, fallback);
}
