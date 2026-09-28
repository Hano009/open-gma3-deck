# Development

## Setup

```bash
git clone https://github.com/Hano009/open-gma3-deck.git
cd open-gma3-deck
npm install
npm run build
npm run link      # link the plugin folder into the Stream Deck app (Elgato CLI)
npm run watch     # rebuild and restart the plugin on every change
```

Requirements: Node.js 22.18+ (24 recommended) and the Stream Deck app 7.1+.

| Script | What it does |
|---|---|
| `npm test` | Unit tests for the dependency-free core (OSC, command line, names, banks, colours, MAtricks) |
| `npm run osc-monitor` | Fake grandMA3: prints everything the plugin sends and echoes executor feedback |
| `npm run validate` | Elgato manifest validation |
| `npm run icons` | Regenerates all icons from `tools/make-icons.mjs` |
| `npm run preview` | Renders `docs/images/keys.png` with the real key renderer (needs Chrome or Edge) |
| `npm run profiles` | Regenerates the ready-made profiles from `tools/make-profiles.mjs` |
| `npm run pack` | Builds `dist/org.open-gma3-deck.streamDeckPlugin` |

Point the plugin at `127.0.0.1:8000` with feedback port `8001` and run `npm run osc-monitor` to develop without grandMA3.

## Project layout

```
src/
  plugin.ts              entry point, registers the actions
  actions/               one file per Stream Deck action (programming.ts holds layer, MAtricks, colour, window)
  core/osc.ts            OSC 1.0 encoder / decoder (no dependencies)
  core/ma3.ts            grandMA3 client: UDP, rate limiting, feedback, name / bank sync, MAtricks
  core/names.ts          Lua snippets for name and attribute sync, and their reply parsers
  core/state.ts          shared console state (page, bank, layer, resolution, command line, names)
  core/settings.ts       global settings and sessions
  core/banks.ts          built-in banks and banks built from the patch
  core/layers.ts         encoder value layers
  core/matricks.ts       selection MAtricks properties
  core/menus.ts          grandMA3 menu names for the Window / Menu key
  core/keys.ts           MA Key presets
  core/colors.ts         palette and contrast helpers
  core/render.ts         SVG key renderer (text.ts: label fitting)
org.open-gma3-deck.sdPlugin/
  manifest.json, layouts/dial.json, imgs/
  ui/pi.html, pi.js      property inspector (plain HTML / JS, works offline)
  ui/sessions.*          session manager popup
tools/                   icon and profile generators, OSC monitor
profiles/                ready-made .streamDeckProfile files
test/                    node:test unit tests
```

## How it talks to grandMA3

Everything goes over OSC / UDP. No grandMA3 plugin or Lua file is installed.

| Purpose | OSC message |
|---|---|
| Any command | `/<prefix>/cmd ,s "<command>"` |
| Executor button | Commands: `Go+ Page 1.104`, `Flash On/Off Page 1.104`, `Swap On/Off …` |
| Executor fader | Command: `FaderMaster Page 1.104 At 50` |
| Name / bank sync request | `/<prefix>/cmd ,s "Lua \"…\""` (see `core/names.ts`) |
| Name / bank sync reply | `/<prefix>/deck/{begin,names,done,attrbegin,attrs,attrdone} ,s "…"`, sent by grandMA3 with `SendOSC <feedback line>` |
| Executor feedback | `/<prefix>/14.14.1.6.2 ,sis "Go+" 1 "…"` / `,sii "FaderMaster" 1 50` / `,si "Off" 1`: addressed by the **object path** of what runs on the executor. The name sync reports each executor's object path, running state and fader level, so the plugin can map the feedback. |

Command syntax used by the plugin, verified against grandMA3 2.4.2.2:

| Feature | Command |
|---|---|
| Encoder (value) | `Attribute "Pan" At + 2.5` |
| Encoder (layer) | `Attribute "Dimmer" At Phase + 10` (Fade, Delay, Speed, Width, Accel, Decel, Transition) |
| Feature group | `FeatureGroup "Position"` |
| MAtricks | `Set Selection Property "XWings" 2` / `... "None"` |
| Windows | `Menu "MatricksOverlay"` |
| Colour | `Attribute "ColorRGB_R" At 100`: the same syntax with an absolute value (the attribute names are verified) |

Lua facts the sync relies on:

- `DataPool().Groups:Children()` → `.no`, `.name`
- `ShowData().LivePatch.FixtureTypes → DMXModes → DMXChannels → (logical channel).attribute`. This is a **string**, the attribute name.
- `AttributeDefinitions.Attributes[i].feature:Parent().name`. The feature group name.
- `Cmd('SendOSC <line> "/address,s,value"')` needs *Send Command = Yes* on that line.
- Executor state: `exec.object:IsRunningPlayback()` (grandMA3 2.5+), falling back to `HasActivePlayback()` (deprecated in 2.5), and `exec:GetFader({})`. The object path is built from `.index` up the `:Parent()` chain (bounded loop: the root is its own parent).
- Native OSC executor paths (`/Page1/Key104`, `/Page1/Fader104`, with or without a data pool) got no reaction on grandMA3 2.4.2.2, so the plugin uses commands.

## Checking a new grandMA3 version

1. Read the release notes' *Changes*, *Deprecated* and *Known Limitations* pages for OSC, Lua and keyword changes.
2. On a **test show**, run `npm run command-test -- <IP> 8000 gma3` and check the command line history for red lines.
3. Press *Sync names now* and check the log for "Synced … names", "Mapped … executors" and "Built … encoder banks".
4. Start an executor on grandMA3 and check that its key lights up.

## Releasing

1. Update the version in `org.open-gma3-deck.sdPlugin/manifest.json` (`x.y.z.0`), `package.json` and `CHANGELOG.md`.
2. Commit, then tag and push: `git tag v0.2.0 && git push --tags`.
3. The *Release* workflow builds the `.streamDeckPlugin` and attaches it, together with the profiles, to a GitHub release.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md). The most valuable contribution is testing on different grandMA3 versions, consoles and macOS, and reporting what works.
