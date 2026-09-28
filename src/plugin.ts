import streamDeck from "@elgato/streamdeck";

import { AttributeDial } from "./actions/attribute-dial";
import { Command } from "./actions/command";
import { CommandDial } from "./actions/command-dial";
import { CommandLine } from "./actions/command-line";
import { Executor } from "./actions/executor";
import { ExecutorDial } from "./actions/executor-dial";
import { MaKey } from "./actions/ma-key";
import { BankKey, EncoderPageKey, PageKey, ResolutionKey, SessionKey, StatusKey } from "./actions/navigation";
import { Pool } from "./actions/pool";
import { ColorKey, LayerKey, MatricksDial, MatricksKey, MenuKey } from "./actions/programming";
import { applyGlobals } from "./core/globals";
import { ma3 } from "./core/ma3";
import { state } from "./core/state";

streamDeck.logger.setLevel("info");

// Keys
streamDeck.actions.registerAction(new MaKey());
streamDeck.actions.registerAction(new CommandLine());
streamDeck.actions.registerAction(new Command());
streamDeck.actions.registerAction(new Executor());
streamDeck.actions.registerAction(new Pool());
streamDeck.actions.registerAction(new BankKey());
streamDeck.actions.registerAction(new EncoderPageKey());
streamDeck.actions.registerAction(new ResolutionKey());
streamDeck.actions.registerAction(new PageKey());
streamDeck.actions.registerAction(new StatusKey());
streamDeck.actions.registerAction(new SessionKey());
streamDeck.actions.registerAction(new LayerKey());
streamDeck.actions.registerAction(new MatricksKey());
streamDeck.actions.registerAction(new ColorKey());
streamDeck.actions.registerAction(new MenuKey());

// Dials
streamDeck.actions.registerAction(new AttributeDial());
streamDeck.actions.registerAction(new ExecutorDial());
streamDeck.actions.registerAction(new CommandDial());
streamDeck.actions.registerAction(new MatricksDial());

// Global settings (connection, banks, ...) are edited from any property inspector.
streamDeck.settings.onDidReceiveGlobalSettings((ev) => applyGlobals(ev.settings));

await streamDeck.connect();
applyGlobals(await streamDeck.settings.getGlobalSettings());

// Executor names depend on the page: re-sync when it changes.
state.on("change", (topic: string) => {
	if (topic === "page" && state.globals.nameSync === "auto") ma3.syncNames(600);
});

process.on("exit", () => ma3.close());
