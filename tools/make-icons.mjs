// Generates all plugin icons as SVG (and the marketplace PNG via a headless Chromium browser, if one
// is found). Run with: node tools/make-icons.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const plugin = path.join(root, "org.open-gma3-deck.sdPlugin");
const imgs = path.join(plugin, "imgs");

// Glyphs are drawn in a 20 x 20 box with a white stroke.
const glyphs = {
	"ma-key": `<rect x="3" y="3" width="14" height="14" rx="3"/><path d="M7 13 L10 6 L13 13 M8.2 10.5 H11.8"/>`,
	cmdline: `<rect x="2" y="4" width="16" height="12" rx="2"/><path d="M5 8 L8 10 L5 12 M10 12 H14"/>`,
	command: `<path d="M11 2 L5 11 H10 L9 18 L15 9 H10 Z"/>`,
	executor: `<path d="M6 3 V17 M14 3 V17"/><rect x="3.5" y="10" width="5" height="3" rx="1"/><rect x="11.5" y="5" width="5" height="3" rx="1"/>`,
	pool: `<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>`,
	bank: `<path d="M10 3 L18 7 L10 11 L2 7 Z M2 10.5 L10 14.5 L18 10.5 M2 14 L10 18 L18 14"/>`,
	"encoder-page": `<circle cx="10" cy="10" r="4"/><path d="M2 10 L5 7.5 V12.5 Z M18 10 L15 7.5 V12.5 Z"/>`,
	resolution: `<circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.5 12.5 L17.5 17.5 M6 8.5 H11"/>`,
	page: `<rect x="5" y="2.5" width="11" height="13" rx="1.5"/><path d="M3 5 V17.5 H13"/>`,
	session: `<rect x="3" y="3" width="14" height="5.5" rx="1.5"/><rect x="3" y="11.5" width="14" height="5.5" rx="1.5"/><path d="M6.5 5.75 H7 M6.5 14.25 H7 M10 8.5 V11.5"/>`,
	layer: `<path d="M10 3 L17 6.5 L10 10 L3 6.5 Z"/><path d="M3 10 L10 13.5 L17 10" stroke-dasharray="2 1.6"/><path d="M3 13.5 L10 17 L17 13.5"/>`,
	matricks: `<rect x="2.5" y="2.5" width="4" height="4" rx="0.8"/><rect x="8" y="2.5" width="4" height="4" rx="0.8" stroke-dasharray="1.5 1.2"/><rect x="13.5" y="2.5" width="4" height="4" rx="0.8"/><rect x="2.5" y="8" width="4" height="4" rx="0.8" stroke-dasharray="1.5 1.2"/><rect x="8" y="8" width="4" height="4" rx="0.8"/><rect x="13.5" y="8" width="4" height="4" rx="0.8" stroke-dasharray="1.5 1.2"/><rect x="2.5" y="13.5" width="4" height="4" rx="0.8"/><rect x="8" y="13.5" width="4" height="4" rx="0.8" stroke-dasharray="1.5 1.2"/><rect x="13.5" y="13.5" width="4" height="4" rx="0.8"/>`,
	"matricks-dial": `<circle cx="10" cy="10" r="7"/><rect x="6.5" y="6.5" width="3" height="3" rx="0.5"/><rect x="10.5" y="10.5" width="3" height="3" rx="0.5"/><path d="M10 3 V5"/>`,
	color: `<path d="M10 2.5 C10 2.5 4.5 9 4.5 12.2 A5.5 5.5 0 0 0 15.5 12.2 C15.5 9 10 2.5 10 2.5 Z"/><path d="M7.5 12.5 A2.5 2.5 0 0 0 10 15"/>`,
	menu: `<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M2.5 7 H17.5 M5 5.25 H5.5 M7 5.25 H7.5"/><path d="M6 10.5 H14 M6 13.5 H11"/>`,
	status: `<path d="M3 16 V13 M7.5 16 V10 M12 16 V7 M16.5 16 V4"/>`,
	"attribute-dial": `<circle cx="10" cy="10" r="7"/><path d="M10 10 L10 4.5"/><path d="M3 18 H17" stroke-dasharray="2 2"/>`,
	"executor-dial": `<circle cx="10" cy="9" r="6"/><path d="M10 9 L13.5 5.5"/><rect x="3" y="16.5" width="14" height="2" rx="1"/>`,
	"command-dial": `<circle cx="10" cy="10" r="6.5"/><path d="M10 6 V10 L13 12"/><path d="M15.5 2.5 L18 5 L15.5 7.5"/>`,
	category: `<circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3"/><path d="M10 2.5 V5.5"/>`,
};

function monochrome(glyph, size) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20"><g fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>\n`;
}

/** Default key / dial image: dark rounded key with an amber glyph. */
function keyImage(glyph) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" fill="#000"/><rect x="4" y="4" width="136" height="136" rx="14" fill="#16181c" stroke="#2b2f36" stroke-width="2"/><rect x="18" y="10" width="108" height="6" rx="3" fill="#f0a830"/><g transform="translate(36 38) scale(3.6)" fill="none" stroke="#f0a830" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>\n`;
}

function marketplace() {
	const keys = [];
	for (let r = 0; r < 2; r++) {
		for (let c = 0; c < 4; c++) {
			const on = (r === 0 && c === 1) || (r === 1 && c === 3);
			keys.push(`<rect x="${40 + c * 46}" y="${40 + r * 46}" width="38" height="38" rx="7" fill="${on ? "#f0a830" : "#2a2e35"}"/>`);
		}
	}
	const dials = [0, 1, 2, 3]
		.map((i) => {
			const cx = 59 + i * 46;
			const angle = [-50, 20, 80, -10][i];
			const rad = ((angle - 90) * Math.PI) / 180;
			return `<circle cx="${cx}" cy="186" r="17" fill="#1d2026" stroke="#3a3f48" stroke-width="3"/><line x1="${cx}" y1="186" x2="${(cx + Math.cos(rad) * 12).toFixed(1)}" y2="${(186 + Math.sin(rad) * 12).toFixed(1)}" stroke="#f0a830" stroke-width="4" stroke-linecap="round"/>`;
		})
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23262d"/><stop offset="1" stop-color="#0f1013"/></linearGradient></defs><rect width="256" height="256" rx="48" fill="url(#g)"/>${keys.join("")}<rect x="40" y="140" width="176" height="20" rx="5" fill="#101216"/><rect x="44" y="146" width="120" height="8" rx="4" fill="#f0a830"/>${dials}</svg>\n`;
}

function write(file, content) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
}

for (const [name, glyph] of Object.entries(glyphs)) {
	if (name === "category") {
		write(path.join(imgs, "plugin", "category-icon.svg"), monochrome(glyph, 28));
		continue;
	}
	write(path.join(imgs, "actions", name, "icon.svg"), monochrome(glyph, 20));
	write(path.join(imgs, "actions", name, "key.svg"), keyImage(glyph));
}
const marketSvg = path.join(imgs, "plugin", "marketplace.svg");
write(marketSvg, marketplace());

// PNG rendering of the marketplace icon (required as PNG by Stream Deck).
const browsers = [
	process.env.CHROME_PATH,
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
].filter(Boolean);
const browser = browsers.find((b) => fs.existsSync(b));

if (!browser) {
	console.warn("No Chrome / Edge found: marketplace PNGs not regenerated (set CHROME_PATH).");
} else {
	for (const [size, suffix] of [
		[256, ""],
		[512, "@2x"],
	]) {
		const html = path.join(os.tmpdir(), `ogd-icon-${size}.html`);
		const svg = fs.readFileSync(marketSvg, "utf8").replace('width="256" height="256"', `width="${size}" height="${size}"`);
		fs.writeFileSync(html, `<html><body style="margin:0;background:transparent">${svg}</body></html>`);
		const out = path.join(imgs, "plugin", `marketplace${suffix}.png`);
		execFileSync(browser, [
			"--headless",
			"--disable-gpu",
			"--hide-scrollbars",
			"--default-background-color=00000000",
			`--window-size=${size},${size}`,
			`--screenshot=${out}`,
			"file:///" + html.replace(/\\/g, "/"),
		], { stdio: "ignore" });
		console.log("wrote", path.relative(root, out));
	}
}
console.log("icons done");
