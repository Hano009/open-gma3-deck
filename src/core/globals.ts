import streamDeck from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import { ma3 } from "./ma3";
import { connectionKey, SESSION_FIELDS } from "./settings";
import { state } from "./state";

let lastConnection = "";

/** Applies global settings from Stream Deck: reopens the socket and re-syncs names if needed. */
export function applyGlobals(raw: Record<string, unknown>): void {
	state.setGlobals(raw);
	ma3.configure();
	const key = connectionKey(state.globals);
	if (key !== lastConnection) {
		lastConnection = key;
		if (state.globals.nameSync === "auto") ma3.syncNames(500, true);
	}
}

/** Makes a saved session the active connection, for every action at once. */
export async function activateSession(id: string): Promise<boolean> {
	const session = state.globals.sessions.find((s) => s.id === id);
	if (!session) return false;
	const raw: Record<string, unknown> = { ...state.rawGlobals, activeSession: session.id };
	for (const field of SESSION_FIELDS) raw[field] = session[field];
	// Names belong to the previous show; clear them until the new session answers.
	state.setNames(new Map());
	await streamDeck.settings.setGlobalSettings(raw as JsonObject);
	applyGlobals(raw);
	streamDeck.logger.info(`Session "${session.name}" active (${session.host}:${session.port})`);
	return true;
}

/** Cycles to the next saved session. */
export async function nextSession(): Promise<boolean> {
	const list = state.globals.sessions;
	if (list.length === 0) return false;
	const index = list.findIndex((s) => s.id === state.globals.activeSession);
	return activateSession(list[(index + 1) % list.length].id);
}

/** The active session, if the current connection came from one and still matches it. */
export function activeSession() {
	const g = state.globals;
	const s = g.sessions.find((x) => x.id === g.activeSession);
	if (!s) return undefined;
	return SESSION_FIELDS.every((f) => s[f] === g[f]) ? s : undefined;
}
