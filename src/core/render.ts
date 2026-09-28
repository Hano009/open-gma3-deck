/**
 * Renders key images as SVG data URLs (144 x 144, the @2x key size). No image libraries needed.
 *
 * Two styles, both designed to be readable at a glance:
 * - "backlit": the whole key is filled with its colour, dimmed when idle and at full brightness
 *   when active, like the backlit keys of a console.
 * - "outline": a dark key with a thick coloured frame; filled when active.
 */
import { resolveColor, shade, textOn, tint } from "./colors";
import { fitLabel, wrap } from "./text";

export { fitLabel, wrap };

export type KeyStyle = "backlit" | "outline";

export type KeyVisual = {
	/** Main label; "\n" forces a line break, long words are wrapped and the size auto-fits. */
	label: string;
	/** Small text at the top of the key (type / category). */
	top?: string;
	/** Small text at the bottom of the key (number, page, ...). */
	bottom?: string;
	/** Palette name or hex colour. */
	color?: string;
	/** Draws the key "lit": running executor, selected bank, latched mode, ... */
	active?: boolean;
	/** 0..100 fills a bar at the bottom of the key. */
	bar?: number;
	/** Monospace, left aligned text (command line display). */
	mono?: boolean;
	/** Unassigned / unavailable: drawn grey. */
	dim?: boolean;
	style?: KeyStyle;
	/** Brightness of an idle backlit key, 0.15..0.9. */
	idle?: number;
};

const SIZE = 144;
const INSET = 5;
const RADIUS = 18;

function esc(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function textLine(text: string, x: number, y: number, size: number, fill: string, anchor: string, weight: number, opacity = 1, mono = false): string {
	const family = mono ? "Consolas, Menlo, monospace" : "Segoe UI, Helvetica Neue, Arial, sans-serif";
	const op = opacity < 1 ? ` fill-opacity="${opacity}"` : "";
	return `<text x="${x}" y="${y.toFixed(1)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"${op} text-anchor="${anchor}">${esc(text)}</text>`;
}

export function renderKey(v: KeyVisual): string {
	const style: KeyStyle = v.style === "outline" ? "outline" : "backlit";
	const base = v.dim ? "#5b616b" : resolveColor(v.color, "amber");
	const idle = Math.max(0.15, Math.min(0.9, v.idle ?? 0.38));
	const size = SIZE - INSET * 2;
	const parts: string[] = [];

	let fill: string;
	let stroke: string;
	let strokeWidth: number;
	if (style === "backlit") {
		fill = v.active ? base : shade(base, idle);
		stroke = v.active ? tint(base, 0.65) : shade(base, Math.min(1, idle + 0.25));
		strokeWidth = v.active ? 5 : 2;
	} else {
		// Active outline keys stay outline keys: a heavier frame with a bright inner ring and the
		// label in the key colour, over a barely tinted dark face. Never a fill (that is what the
		// backlit style is for, and it would look like an idle backlit key).
		fill = v.active ? shade(base, 0.14) : "#111317";
		stroke = base;
		strokeWidth = v.active ? 11 : 6;
	}
	const outlineActive = style === "outline" && v.active === true;
	// Active outline keys print their label in the key colour; everything else picks black / white.
	const fg = outlineActive ? tint(base, 0.35) : textOn(fill);
	const sub = outlineActive ? "#ffffff" : fg === "#ffffff" ? "#ffffff" : "#101114";

	parts.push(`<defs><linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${v.active ? 0.28 : 0.12}"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`);
	parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="#000"/>`);
	parts.push(
		`<rect x="${INSET + strokeWidth / 2}" y="${INSET + strokeWidth / 2}" width="${size - strokeWidth}" height="${size - strokeWidth}" rx="${RADIUS}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
	);
	if (style === "backlit") {
		parts.push(`<rect x="${INSET + 3}" y="${INSET + 3}" width="${size - 6}" height="${(size - 6) * 0.55}" rx="${RADIUS - 3}" fill="url(#gloss)"/>`);
	}
	if (outlineActive) {
		// Bright inner ring: reads as "lit" without filling the key.
		const r = INSET + strokeWidth + 2;
		parts.push(`<rect x="${r}" y="${r}" width="${SIZE - 2 * r}" height="${SIZE - 2 * r}" rx="${RADIUS - 8}" fill="none" stroke="${tint(base, 0.6)}" stroke-width="2.5"/>`);
	}

	const hasBar = typeof v.bar === "number";
	let top = INSET + 12;
	let bottom = SIZE - INSET - 10;

	if (v.top) {
		// Outline style: the category text sits in the frame colour so the key reads as a group.
		const topColor = style === "outline" ? (v.active ? tint(base, 0.45) : base) : sub;
		parts.push(textLine(v.top.toUpperCase(), SIZE / 2, INSET + 28, 17, topColor, "middle", 800, style === "outline" && !v.active ? 1 : 0.78));
		top = INSET + 36;
	}
	if (hasBar) {
		const pct = Math.max(0, Math.min(100, v.bar ?? 0));
		const w = size - 34;
		const y = SIZE - INSET - 20;
		const track = fg === "#ffffff" ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.25)";
		const barFill = style === "outline" ? (v.active ? tint(base, 0.3) : base) : sub;
		parts.push(`<rect x="${INSET + 17}" y="${y}" width="${w}" height="9" rx="4.5" fill="${track}"/>`);
		if (pct > 0) parts.push(`<rect x="${INSET + 17}" y="${y}" width="${Math.max(9, (w * pct) / 100)}" height="9" rx="4.5" fill="${barFill}"/>`);
		bottom = y - 6;
	}
	if (v.bottom) {
		parts.push(textLine(v.bottom, SIZE / 2, bottom - 2, 16, sub, "middle", 600, 0.8));
		bottom -= 22;
	}

	if (v.mono) {
		const lines = wrap(v.label || " ", 11, Math.max(1, Math.floor((bottom - top) / 21)));
		lines.forEach((line, i) => parts.push(textLine(line, INSET + 12, top + 16 + i * 21, 18, fg, "start", 600, 1, true)));
	} else {
		const boxWidth = size - 22;
		const boxHeight = Math.max(20, bottom - top);
		const { size: fontSize, lines } = fitLabel(v.label || " ", boxWidth, boxHeight);
		const lineHeight = fontSize * 1.08;
		const blockHeight = lines.length * lineHeight;
		const firstBaseline = top + (boxHeight - blockHeight) / 2 + fontSize * 0.82;
		lines.forEach((line, i) => parts.push(textLine(line, SIZE / 2, firstBaseline + i * lineHeight, fontSize, fg, "middle", 800)));
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join("")}</svg>`;
	return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}
