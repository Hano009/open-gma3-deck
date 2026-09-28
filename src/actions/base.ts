import streamDeck, {
	type Action,
	DeviceType,
	type DidReceiveSettingsEvent,
	type FeedbackPayload,
	type PropertyInspectorDidAppearEvent,
	type SendToPluginEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";

import { PALETTE } from "../core/colors";
import { activateSession, activeSession, applyGlobals } from "../core/globals";
import { KEY_PRESET_LIST } from "../core/keys";
import { LAYERS } from "../core/layers";
import { MATRICKS_PROPERTIES } from "../core/matricks";
import { MENUS } from "../core/menus";
import { ma3 } from "../core/ma3";
import { renderKey, type KeyVisual } from "../core/render";
import { state, type Topic } from "../core/state";

export type Instance<S extends JsonObject> = {
	id: string;
	action: Action<S>;
	settings: S;
	/** Dial / key column, used by bank-following dials to pick their attribute. */
	column: number;
};

/**
 * Base for every action: tracks visible instances, re-renders them when shared state changes and
 * answers the property inspector's requests.
 */
export abstract class DeckAction<S extends JsonObject> extends SingletonAction<S> {
	protected readonly instances = new Map<string, Instance<S>>();
	private readonly lastVisual = new Map<string, string>();

	constructor(topics: Topic[]) {
		super();
		state.on("change", (topic: Topic) => {
			// Every key redraws on global changes (key style, brightness, banks).
			if (topic === "globals" || topics.includes(topic)) this.renderAll();
		});
	}

	protected abstract render(inst: Instance<S>): void;

	protected renderAll(): void {
		for (const inst of this.instances.values()) this.safeRender(inst);
	}

	private safeRender(inst: Instance<S>): void {
		try {
			this.render(inst);
		} catch (err) {
			streamDeck.logger.error(`render failed: ${err instanceof Error ? err.stack : err}`);
		}
	}

	override onWillAppear(ev: WillAppearEvent<S>): void | Promise<void> {
		const coords = ev.action.isKey() || ev.action.isDial() ? ev.action.coordinates : undefined;
		const inst: Instance<S> = { id: ev.action.id, action: ev.action, settings: ev.payload.settings, column: coords?.column ?? 0 };
		this.instances.set(inst.id, inst);
		this.lastVisual.delete(inst.id);
		this.safeRender(inst);
	}

	override onWillDisappear(ev: WillDisappearEvent<S>): void | Promise<void> {
		this.instances.delete(ev.action.id);
		state.pageRefs.delete(ev.action.id);
		this.lastVisual.delete(ev.action.id);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<S>): void | Promise<void> {
		const inst = this.instances.get(ev.action.id);
		if (!inst) return;
		inst.settings = ev.payload.settings;
		this.lastVisual.delete(inst.id);
		this.safeRender(inst);
	}

	protected instance(action: { id: string }): Instance<S> | undefined {
		return this.instances.get(action.id);
	}

	/** Sets a key image, skipping identical updates to keep USB traffic low. */
	protected drawKey(inst: Instance<S>, visual: KeyVisual): void {
		if (!inst.action.isKey()) return;
		// Per-key style overrides the global default.
		const own = (inst.settings as { keyStyle?: string }).keyStyle;
		const style = own === "backlit" || own === "outline" ? own : state.globals.keyStyle;
		const image = renderKey({ style, idle: state.globals.keyIdle, ...visual });
		if (this.lastVisual.get(inst.id) === image) return;
		this.lastVisual.set(inst.id, image);
		void inst.action.setImage(image);
	}

	/** Updates the touch strip layout of a dial, skipping identical updates. */
	protected drawDial(inst: Instance<S>, feedback: FeedbackPayload): void {
		if (!inst.action.isDial()) return;
		const key = JSON.stringify(feedback);
		if (this.lastVisual.get(inst.id) === key) return;
		this.lastVisual.set(inst.id, key);
		void inst.action.setFeedback(feedback);
	}

	/**
	 * Registers the fixed page an executor key / dial uses (undefined = follows the current page),
	 * so name sync includes it. A page not seen before triggers a sync.
	 */
	protected usePage(inst: Instance<S>, page: number | undefined): void {
		if (page === undefined) {
			state.pageRefs.delete(inst.id);
			return;
		}
		const known = state.pagesInUse().includes(page);
		state.pageRefs.set(inst.id, page);
		if (!known && state.globals.nameSync === "auto") ma3.syncNames(800);
	}

	/** Number of dials on the device an instance lives on (used for encoder paging). */
	protected dialCount(inst: Instance<S>): number {
		const type = inst.action.device.type;
		if (type === DeviceType.StreamDeckPlus) return 4;
		if (type === DeviceType.StreamDeckPlusXL) return 6;
		// Unknown / future devices: count dials of this device that are currently visible.
		let max = 0;
		for (const a of inst.action.device.actions) {
			if (a.isDial()) max = Math.max(max, a.coordinates.column + 1);
		}
		return Math.max(1, max);
	}

	override onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<S>): void | Promise<void> {
		void this.sendCatalog();
	}

	/** Messages from the shared property inspector (ui/pi.html). */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, S>): Promise<void> {
		const msg = ev.payload as { type?: string } | null;
		switch (msg?.type) {
			case "hello":
				await this.sendCatalog();
				break;
			case "globalsChanged": {
				const globals = await streamDeck.settings.getGlobalSettings();
				applyGlobals(globals);
				await this.sendCatalog();
				break;
			}
			case "test":
				ma3.configure();
				ma3.cmd(state.globals.testCommand);
				await this.sendCatalog();
				break;
			case "status":
				await this.sendCatalog();
				break;
			case "syncNames":
				ma3.syncNames(0, true);
				await this.sendCatalog();
				break;
			case "activateSession": {
				const id = (msg as { id?: string }).id;
				if (id) await activateSession(id);
				await this.sendCatalog();
				break;
			}
		}
	}

	/** Sends everything the property inspector needs to populate its dropdowns and status line. */
	protected async sendCatalog(): Promise<void> {
		await streamDeck.ui.sendToPropertyInspector({
			type: "catalog",
			keys: KEY_PRESET_LIST.map((k) => ({ id: k.id, label: k.label, group: k.group, behavior: k.behavior })),
			banks: state.banks.map((b) => ({ id: b.id, name: b.name, attrs: b.attrs.map((a) => a.attr) })),
			banksError: state.banksError ?? "",
			palette: PALETTE,
			banksOrigin: state.banksOrigin,
			layers: LAYERS.map((l) => [l.id, l.label]),
			matricks: MATRICKS_PROPERTIES.map((m) => [m.id, m.label]),
			menus: MENUS,
			status: { ...ma3.stats, now: Date.now(), namesCount: state.names.size, namesSyncedAt: state.namesSyncedAt },
			activeSession: activeSession()?.id ?? "",
		} as unknown as JsonValue);
	}
}

/** Parses a positive integer setting (stored as string by the property inspector). */
export function int(value: unknown, fallback: number): number {
	const n = parseInt(String(value ?? ""), 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function float(value: unknown, fallback: number): number {
	const n = parseFloat(String(value ?? ""));
	return Number.isFinite(n) ? n : fallback;
}

export function text(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.trim() !== "" ? value : fallback;
}
