/**
 * Encoder banks: the equivalent of the feature / attribute encoder bar on a grandMA3 console.
 * Dials in "Follow bank" mode map to attributes of the active bank by their position.
 *
 * By default the banks are built from the patched fixtures in grandMA3 (see names.ts,
 * buildAttributeSyncLua). The built-in banks below are the fallback until that sync has run;
 * their attribute names are verified against the grandMA3 2.4 attribute definitions. Any bank
 * can be replaced via the global "Custom banks (JSON)" setting.
 */

export type BankAttribute = {
	/** grandMA3 attribute name, e.g. "Pan". */
	attr: string;
	/** Short label shown on the touch strip. */
	label?: string;
	/** Value change per dial tick in coarse resolution. */
	step?: number;
};

export type Bank = {
	id: string;
	name: string;
	/** Accent colour used on keys and the touch strip. */
	color: string;
	attrs: BankAttribute[];
};

export const DEFAULT_BANKS: Bank[] = [
	{
		id: "dimmer",
		name: "Dimmer",
		color: "#f5c542",
		attrs: [
			{ attr: "Dimmer", label: "Dimmer", step: 1 },
			{ attr: "DimmerCurve", label: "Curve", step: 1 },
		],
	},
	{
		id: "position",
		name: "Position",
		color: "#4aa3ff",
		attrs: [
			{ attr: "Pan", label: "Pan", step: 1 },
			{ attr: "Tilt", label: "Tilt", step: 1 },
			{ attr: "XYZ_X", label: "X", step: 0.05 },
			{ attr: "XYZ_Y", label: "Y", step: 0.05 },
			{ attr: "XYZ_Z", label: "Z", step: 0.05 },
			{ attr: "PositionMSpeed", label: "Pos Speed", step: 1 },
		],
	},
	{
		id: "gobo",
		name: "Gobo",
		color: "#3ddc97",
		attrs: [
			{ attr: "Gobo1", label: "Gobo 1", step: 1 },
			{ attr: "Gobo1Pos", label: "Gobo 1 Pos", step: 1 },
			{ attr: "Gobo2", label: "Gobo 2", step: 1 },
			{ attr: "Gobo2Pos", label: "Gobo 2 Pos", step: 1 },
			{ attr: "Gobo3", label: "Gobo 3", step: 1 },
			{ attr: "AnimationWheel1", label: "Anim", step: 1 },
			{ attr: "AnimationWheel1Pos", label: "Anim Pos", step: 1 },
		],
	},
	{
		id: "color",
		name: "Color",
		color: "#ff5ca8",
		attrs: [
			{ attr: "ColorRGB_R", label: "Red", step: 1 },
			{ attr: "ColorRGB_G", label: "Green", step: 1 },
			{ attr: "ColorRGB_B", label: "Blue", step: 1 },
			{ attr: "ColorRGB_W", label: "White", step: 1 },
			{ attr: "Color1", label: "Wheel", step: 1 },
			{ attr: "CTO", label: "CTO", step: 1 },
			{ attr: "ColorRGB_RY", label: "Amber", step: 1 },
			{ attr: "ColorRGB_UV", label: "UV", step: 1 },
			{ attr: "HSB_Hue", label: "Hue", step: 1 },
			{ attr: "HSB_Saturation", label: "Saturation", step: 1 },
			{ attr: "CTC", label: "CTC", step: 1 },
			{ attr: "Color2", label: "Wheel 2", step: 1 },
		],
	},
	{
		id: "beam",
		name: "Beam",
		color: "#b388ff",
		attrs: [
			{ attr: "Shutter1", label: "Shutter", step: 1 },
			{ attr: "Shutter1Strobe", label: "Strobe", step: 1 },
			{ attr: "Iris", label: "Iris", step: 1 },
			{ attr: "Prism1", label: "Prism", step: 1 },
			{ attr: "Prism1Pos", label: "Prism Rot", step: 1 },
			{ attr: "Frost1", label: "Frost", step: 1 },
			{ attr: "Effects1", label: "Effect", step: 1 },
			{ attr: "Effects1Rate", label: "FX Rate", step: 1 },
		],
	},
	{
		id: "focus",
		name: "Focus",
		color: "#48d1e0",
		attrs: [
			{ attr: "Zoom", label: "Zoom", step: 1 },
			{ attr: "Focus1", label: "Focus", step: 1 },
			{ attr: "Focus2", label: "Focus 2", step: 1 },
			{ attr: "Focus1Adjust", label: "Focus Adjust", step: 1 },
		],
	},
	{
		id: "shapers",
		name: "Shapers",
		color: "#ff8a3d",
		attrs: [
			{ attr: "Blade1A", label: "Blade 1A", step: 1 },
			{ attr: "Blade1B", label: "Blade 1B", step: 1 },
			{ attr: "Blade2A", label: "Blade 2A", step: 1 },
			{ attr: "Blade2B", label: "Blade 2B", step: 1 },
			{ attr: "Blade3A", label: "Blade 3A", step: 1 },
			{ attr: "Blade3B", label: "Blade 3B", step: 1 },
			{ attr: "Blade4A", label: "Blade 4A", step: 1 },
			{ attr: "Blade4B", label: "Blade 4B", step: 1 },
			{ attr: "Blade1Rot", label: "Blade 1 Rot", step: 1 },
			{ attr: "Blade2Rot", label: "Blade 2 Rot", step: 1 },
			{ attr: "Blade3Rot", label: "Blade 3 Rot", step: 1 },
			{ attr: "Blade4Rot", label: "Blade 4 Rot", step: 1 },
			{ attr: "ShaperRot", label: "Shaper Rot", step: 1 },
		],
	},
	{
		id: "control",
		name: "Control",
		color: "#9aa4b1",
		attrs: [
			{ attr: "Control1", label: "Control", step: 1 },
		],
	},
];

/** Accent colour per grandMA3 feature group, matching the Encoder Bank keys. */
const GROUP_COLORS: Record<string, string> = {
	dimmer: "#f5c542",
	position: "#4aa3ff",
	gobo: "#3ddc97",
	color: "#ff5ca8",
	beam: "#b388ff",
	focus: "#48d1e0",
	control: "#9aa4b1",
	shapers: "#ff8a3d",
	video: "#6d6af8",
};

/** Sensible per-tick steps for attributes that are not 0..100 style. */
const STEP_OVERRIDES: Array<[RegExp, number]> = [
	[/^XYZ_/, 0.05],
	[/^(Scale|Rot)_/, 1],
];

/** Builds banks from the feature groups / attributes reported by grandMA3. */
export function banksFromShow(groups: Array<{ group: string; attrs: string[] }>, label: (attr: string) => string): Bank[] {
	return groups
		.filter((g) => g.attrs.length > 0)
		.map((g) => ({
			id: g.group.toLowerCase(),
			name: g.group,
			color: GROUP_COLORS[g.group.toLowerCase()] ?? "#9aa4b1",
			attrs: g.attrs.map((attr) => ({ attr, label: label(attr), step: STEP_OVERRIDES.find(([re]) => re.test(attr))?.[1] ?? 1 })),
		}));
}

/**
 * Parses the user's custom bank JSON. Invalid JSON falls back to the defaults; the error text is
 * returned so it can be shown in the property inspector.
 */
export function parseBanks(json: string): { banks: Bank[]; error?: string } {
	if (!json || !json.trim()) return { banks: DEFAULT_BANKS };
	try {
		const data: unknown = JSON.parse(json);
		if (!Array.isArray(data)) throw new Error("Top level must be an array of banks");
		const banks: Bank[] = data.map((b: any, i: number) => {
			if (!b || !Array.isArray(b.attrs)) throw new Error(`Bank ${i + 1} needs an "attrs" array`);
			return {
				id: String(b.id ?? b.name ?? `bank${i + 1}`).toLowerCase(),
				name: String(b.name ?? b.id ?? `Bank ${i + 1}`),
				color: typeof b.color === "string" ? b.color : "#9aa4b1",
				attrs: b.attrs.map((a: any) =>
					typeof a === "string"
						? { attr: a, label: a, step: 1 }
						: { attr: String(a.attr), label: a.label ? String(a.label) : String(a.attr), step: Number(a.step) || 1 },
				),
			};
		});
		if (banks.length === 0) throw new Error("No banks defined");
		return { banks };
	} catch (err) {
		return { banks: DEFAULT_BANKS, error: err instanceof Error ? err.message : String(err) };
	}
}
