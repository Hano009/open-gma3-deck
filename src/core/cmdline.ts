/**
 * Pure helpers for the virtual command line that the MA keys build up before it is sent to
 * grandMA3 with "Please". Kept free of imports so it can be unit tested directly by Node.
 */

const NUMERIC = /^[0-9.]+$/;

/**
 * Appends a token the way a console command line does: numbers and dots glue together
 * ("Preset" "4" "." "1" -> "Preset 4.1"), keywords are separated by spaces.
 */
export function appendToken(line: string, token: string): string {
	const t = token.trim();
	if (!t) return line;
	const trimmed = line.replace(/\s+$/, "");
	if (!trimmed) return t;
	const last = trimmed[trimmed.length - 1];
	if (NUMERIC.test(t) && /[0-9.]/.test(last)) return trimmed + t;
	return trimmed + " " + t;
}

/** Removes the last character (and any trailing whitespace left behind). */
export function backspace(line: string): string {
	return line.replace(/\s+$/, "").slice(0, -1).replace(/\s+$/, "");
}

/** Removes the last whole word / number. */
export function removeLastToken(line: string): string {
	return line.replace(/\s*\S+\s*$/, "");
}

/**
 * Replaces `{name}` placeholders with values. Unknown placeholders are left untouched so that a
 * user template error is visible in the grandMA3 command line instead of silently disappearing.
 */
export function fillTemplate(template: string, values: Record<string, string | number | undefined>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => {
		const v = values[key];
		return v === undefined ? match : String(v);
	});
}

/** Splits a user multi-command field on new lines and `;;` separators. */
export function splitCommands(text: string | undefined): string[] {
	if (!text) return [];
	return text
		.split(/\r?\n|;;/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0 && !s.startsWith("//"));
}

/** Formats a number for a grandMA3 command: max 3 decimals, no trailing zeros, no exponent. */
export function formatNumber(value: number): string {
	if (!Number.isFinite(value)) return "0";
	const fixed = value.toFixed(3);
	return fixed.replace(/\.?0+$/, "") || "0";
}
