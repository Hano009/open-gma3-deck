/**
 * grandMA3 value layers the encoders can write to. Syntax verified on grandMA3 2.4:
 * `Attribute "Dimmer" At Phase + 10` (likewise Fade, Delay, Speed, Width, Accel, Decel, Transition).
 * Kept free of imports so it can be unit tested directly by Node.
 */
export type Layer = "" | "Fade" | "Delay" | "Speed" | "Phase" | "Width" | "Accel" | "Decel" | "Transition";

export type LayerInfo = {
	id: Layer;
	label: string;
	/** Change per dial tick in coarse resolution (replaces the attribute's own step). */
	step?: number;
	unit: string;
	color: string;
};

export const LAYERS: LayerInfo[] = [
	{ id: "", label: "Value", unit: "", color: "amber" },
	{ id: "Fade", label: "Fade", step: 0.1, unit: "s", color: "cyan" },
	{ id: "Delay", label: "Delay", step: 0.1, unit: "s", color: "blue" },
	{ id: "Speed", label: "Speed", step: 1, unit: "", color: "lime" },
	{ id: "Phase", label: "Phase", step: 5, unit: "°", color: "magenta" },
	{ id: "Width", label: "Width", step: 5, unit: "%", color: "purple" },
	{ id: "Accel", label: "Accel", step: 5, unit: "%", color: "orange" },
	{ id: "Decel", label: "Decel", step: 5, unit: "%", color: "orange" },
	{ id: "Transition", label: "Transition", step: 5, unit: "%", color: "teal" },
];

export function layerInfo(id: string): LayerInfo {
	return LAYERS.find((l) => l.id === id) ?? LAYERS[0];
}
