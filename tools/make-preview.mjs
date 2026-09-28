// Renders docs/images/keys.png: the same keys in both styles, idle and active, drawn by the
// plugin's real key renderer. Needs Chrome or Edge for the screenshot (set CHROME_PATH if needed).
// Run with: npm run preview
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ogd-preview-"));

// Compile the renderer (and its imports) to CommonJS so it can be loaded here.
execFileSync(
	process.execPath,
	[
		path.join(root, "node_modules", "typescript", "bin", "tsc"),
		...["render", "colors", "text"].map((f) => path.join(root, "src", "core", `${f}.ts`)),
		"--outDir",
		tmp,
		"--module",
		"commonjs",
		"--target",
		"es2022",
		"--types",
		"node",
		"--skipLibCheck",
	],
	{ stdio: "inherit" },
);
fs.writeFileSync(path.join(tmp, "package.json"), '{ "type": "commonjs" }');
const { renderKey } = createRequire(import.meta.url)(path.join(tmp, "render.js"));

// Keys that really light up in the plugin, and when (shown under the "lit" row).
const KEYS = [
	[{ top: "Group", label: "Vipers", bottom: "1", color: "green" }, "selected"],
	[{ top: "Preset", label: "Open White", bottom: "4.1", color: "cyan" }, "applied"],
	[{ top: "P1", label: "OW Viper Odd", bottom: "1.104", color: "amber", bar: 75 }, "running"],
	[{ label: "Position", color: "#4aa3ff" }, "bank selected"],
	[{ top: "Layer", label: "Phase", color: "magenta" }, "layer on"],
	[{ top: "MAtricks", label: "X Wings 2", color: "purple" }, "value set"],
	[{ label: "Highlight", color: "yellow" }, "mode on"],
	[{ label: "Please", color: "green" }, "cmd waiting"],
	[{ label: "Store", color: "red" }, "while pressed"],
];

const row = (title, style, active) =>
	`<div class="label">${title}</div><div class="row">${KEYS.map(
		([k]) => `<img width="88" height="88" src="${renderKey({ ...k, style, active, bar: k.bar === undefined ? undefined : active ? k.bar : 0 })}">`,
	).join("")}</div>`;
const captions = `<div class="row captions">${KEYS.map(([, c]) => `<div>${c}</div>`).join("")}</div>`;

const width = 40 + KEYS.length * 96;
const html = `<!doctype html><html><body style="margin:0;padding:18px 20px;background:#0b0c0e;font:600 14px Segoe UI,Helvetica Neue,Arial,sans-serif;color:#9aa0a8">
<style>.row{display:grid;grid-template-columns:repeat(${KEYS.length},88px);gap:8px;margin:6px 0 16px}.label{letter-spacing:.04em}.captions{margin-top:-10px;font-size:12px;color:#6f757d;text-align:center}</style>
${row("BACKLIT · idle", "backlit", false)}
${row("BACKLIT · lit", "backlit", true)}
${captions}
${row("OUTLINE · idle", "outline", false)}
${row("OUTLINE · lit", "outline", true)}
${captions}
</body></html>`;
const htmlFile = path.join(tmp, "preview.html");
fs.writeFileSync(htmlFile, html);

const browsers = [
	process.env.CHROME_PATH,
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) {
	console.error("No Chrome / Edge found (set CHROME_PATH). HTML written to", htmlFile);
	process.exit(1);
}
const out = path.join(root, "docs", "images", "keys.png");
execFileSync(browser, ["--headless", "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${4 * 125 + 90}`, `--screenshot=${out}`, "file:///" + htmlFile.replace(/\\/g, "/")], {
	stdio: "ignore",
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log("wrote", path.relative(root, out));
