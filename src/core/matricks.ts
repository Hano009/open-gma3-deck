/**
 * MAtricks properties of the grandMA3 selection (grandMA3 2.x). Set with
 * `Set Selection Property "<id>" <value>` and cleared with `"None"` (verified on 2.4).
 * Kept free of imports so it can be unit tested directly by Node.
 */
export type MatricksProperty = {
	id: string;
	label: string;
	/** Change per dial tick. */
	step: number;
	min: number;
	max: number;
	/** Seconds (fade / delay) or degrees (phase) rather than a count. */
	unit?: string;
};

const AXES = ["X", "Y", "Z"] as const;

const COUNTS: Array<[suffix: string, label: string]> = [
	["Block", "Blocks"],
	["Group", "Groups"],
	["Wings", "Wings"],
	["Width", "Width"],
	["Shift", "Shift"],
	["Shuffle", "Shuffle"],
];

const RANGES: Array<[prefix: string, label: string, step: number, max: number, unit: string]> = [
	["Fade", "Fade", 0.1, 60, "s"],
	["Delay", "Delay", 0.1, 60, "s"],
	["Speed", "Speed", 1, 1000, ""],
	["Phase", "Phase", 5, 3600, "°"],
];

export const MATRICKS_PROPERTIES: MatricksProperty[] = [
	...AXES.flatMap((axis) => COUNTS.map(([suffix, label]) => ({ id: `${axis}${suffix}`, label: `${axis} ${label}`, step: 1, min: 0, max: 256 }))),
	...AXES.flatMap((axis) =>
		RANGES.flatMap(([prefix, label, step, max, unit]) => [
			{ id: `${prefix}From${axis}`, label: `${label} from ${axis}`, step, min: 0, max, unit },
			{ id: `${prefix}To${axis}`, label: `${label} to ${axis}`, step, min: 0, max, unit },
		]),
	),
];

export function matricksProperty(id: string | undefined): MatricksProperty {
	return MATRICKS_PROPERTIES.find((p) => p.id === id) ?? MATRICKS_PROPERTIES.find((p) => p.id === "XWings")!;
}

/** Same property on the next axis: XWings -> YWings -> ZWings -> XWings. */
export function nextAxis(id: string): string {
	const rotate = (axis: string) => AXES[(AXES.indexOf(axis as (typeof AXES)[number]) + 1) % AXES.length];
	// Axis first ("XWings") or last ("FadeFromX").
	const first = /^([XYZ])([A-Z].*)$/.exec(id);
	const last = /^(.+[a-z])([XYZ])$/.exec(id);
	const next = first ? `${rotate(first[1])}${first[2]}` : last ? `${last[1]}${rotate(last[2])}` : id;
	return MATRICKS_PROPERTIES.some((p) => p.id === next) ? next : id;
}
