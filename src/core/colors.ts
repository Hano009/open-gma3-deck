/**
 * Key colour palette: strong, clearly different hues that stay recognisable when dimmed, so keys
 * can be told apart at a glance. Colours are stored by name ("red") so a future palette tweak
 * updates every key; custom hex values ("#12abef") are accepted too.
 * Kept free of imports so it can be unit tested directly by Node.
 */
export const PALETTE: Array<[name: string, hex: string]> = [
	["red", "#ff3b30"],
	["orange", "#ff7a1a"],
	["amber", "#ffb000"],
	["yellow", "#ffe135"],
	["lime", "#a3e635"],
	["green", "#22c55e"],
	["teal", "#14b8a6"],
	["cyan", "#22d3ee"],
	["blue", "#3b82f6"],
	["indigo", "#6d6af8"],
	["purple", "#a855f7"],
	["magenta", "#e040fb"],
	["pink", "#ff5ca8"],
	["brown", "#b0703c"],
	["grey", "#8a94a6"],
	["white", "#f2f2f2"],
];

const BY_NAME = new Map(PALETTE);

/** Resolves a palette name or hex value; anything else returns the fallback. */
export function resolveColor(value: string | undefined, fallback: string): string {
	const v = (value ?? "").trim().toLowerCase();
	if (!v) return resolveColor(fallback, "#8a94a6");
	const named = BY_NAME.get(v);
	if (named) return named;
	if (/^#[0-9a-f]{6}$/.test(v)) return v;
	if (/^#[0-9a-f]{3}$/.test(v)) return "#" + [...v.slice(1)].map((c) => c + c).join("");
	return fallback.startsWith("#") ? fallback : (BY_NAME.get(fallback) ?? "#8a94a6");
}

function rgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(r: number, g: number, b: number): string {
	return "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

/** Scales brightness: 0 = black, 1 = unchanged. */
export function shade(color: string, amount: number): string {
	const [r, g, b] = rgb(color);
	return hex(r * amount, g * amount, b * amount);
}

/** Mixes towards white: 0 = unchanged, 1 = white. */
export function tint(color: string, amount: number): string {
	const [r, g, b] = rgb(color);
	return hex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Relative luminance (WCAG), 0..1. */
export function luminance(color: string): number {
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	const [r, g, b] = rgb(color);
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Black or white, whichever reads better on the given background. */
export function textOn(background: string): string {
	return luminance(background) > 0.35 ? "#101114" : "#ffffff";
}
