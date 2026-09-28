import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "org.open-gma3-deck.sdPlugin";

/**
 * Writes bin/THIRD-PARTY-NOTICES.txt with the licence of every npm package that ends up in the
 * bundle. The minifier strips their copyright headers, and MIT (like most licences) requires the
 * notice to travel with every copy.
 */
function thirdPartyNotices() {
	return {
		name: "third-party-notices",
		generateBundle(_options, bundle) {
			const roots = new Map();
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== "chunk") continue;
				for (const id of Object.keys(chunk.modules)) {
					const file = id.replace(/^\0/, "").split("?")[0];
					const m = /^(.*[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)/.exec(file);
					if (m && chunk.modules[id].renderedLength > 0) roots.set(m[1], true);
				}
			}
			const sections = [...roots.keys()].sort().map((root) => {
				const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
				const licenseFile = fs.readdirSync(root).find((f) => /^(licen[cs]e|copying)(\..*)?$/i.test(f));
				const text = licenseFile ? fs.readFileSync(path.join(root, licenseFile), "utf8").trim() : `License: ${pkg.license ?? "see package"}`;
				return `${pkg.name} ${pkg.version} (${pkg.license ?? "unknown"})\n${pkg.homepage ?? ""}\n\n${text}`;
			});
			const header =
				"Open grandMA3 Deck bundles the following third-party software.\n" +
				"Open grandMA3 Deck itself is MIT licensed; see https://github.com/Hano009/open-gma3-deck/blob/main/LICENSE\n";
			// The project's own licence travels with the plugin too.
			this.emitFile({ type: "asset", fileName: "LICENSE", source: fs.readFileSync("LICENSE", "utf8") });
			this.emitFile({
				type: "asset",
				fileName: "THIRD-PARTY-NOTICES.txt",
				source: [header, ...sections].join(`\n\n${"=".repeat(78)}\n\n`) + "\n",
			});
		},
	};
}

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: "src/plugin.ts",
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		sourcemap: isWatching,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
		}
	},
	plugins: [
		{
			name: "watch-externals",
			buildStart: function () {
				this.addWatchFile(`${sdPlugin}/manifest.json`);
			},
		},
		typescript({
			mapRoot: isWatching ? "./" : undefined
		}),
		nodeResolve({
			browser: false,
			exportConditions: ["node"],
			preferBuiltins: true
		}),
		commonjs(),
		!isWatching && terser(),
		thirdPartyNotices(),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};

export default config;
