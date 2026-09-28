/**
 * Text layout helpers for key images. Kept free of imports so it can be unit tested directly by Node.
 */

/** Word-wraps text into at most `maxLines` lines of roughly `width` characters. */
export function wrap(text: string, width: number, maxLines: number): string[] {
	const lines: string[] = [];
	for (const paragraph of text.split("\n")) {
		let line = "";
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			let w = word;
			while (w.length > width) {
				if (line) {
					lines.push(line);
					line = "";
				}
				lines.push(w.slice(0, width));
				w = w.slice(width);
			}
			if (!line) line = w;
			else if (line.length + 1 + w.length <= width) line += " " + w;
			else {
				lines.push(line);
				line = w;
			}
		}
		lines.push(line);
	}
	const trimmed = lines.length > 1 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
	if (trimmed.length <= maxLines) return trimmed;
	const out = trimmed.slice(0, maxLines);
	out[maxLines - 1] = out[maxLines - 1].slice(0, Math.max(0, width - 1)) + "…";
	return out;
}

/** Picks the largest font size at which the label fits the given box without truncation. */
export function fitLabel(label: string, boxWidth: number, boxHeight: number): { size: number; lines: string[] } {
	const sizes = [46, 40, 34, 30, 26, 23, 20, 18, 16];
	const longestWord = Math.max(1, ...label.split(/\s+/).map((w) => w.length));
	for (const size of sizes) {
		// Average bold glyph width is ~0.56 em for the UI fonts used by Stream Deck.
		const width = Math.max(1, Math.floor(boxWidth / (size * 0.56)));
		const maxLines = Math.max(1, Math.floor(boxHeight / (size * 1.08)));
		// Never break inside a word while a smaller size would keep it whole.
		if (longestWord > width && size > sizes[sizes.length - 1]) continue;
		const lines = wrap(label, width, maxLines);
		const truncated = lines.some((l) => l.endsWith("…")) || lines.join("").replace(/\s/g, "").length < label.replace(/\s/g, "").length;
		if (!truncated) return { size, lines };
	}
	const size = sizes[sizes.length - 1];
	return { size, lines: wrap(label, Math.floor(boxWidth / (size * 0.56)), Math.floor(boxHeight / (size * 1.08))) };
}
