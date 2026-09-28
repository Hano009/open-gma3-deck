# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.6] - 2026-09-28

### Added

- Tested live on grandMA3 2.5.1.0: all commands, name and bank sync, and executor feedback
  (including the new object paths and fader feedback format).
- Window / Menu key: **Close window (Esc)**, plus grandMA3 2.5's **Master Overview** and **Locate**.
  The touch profile's Windows folder has Close window in its toolbar.
- `npm run command-test -- --only=<section>` runs a single section.

### Changed

- **Patch** is no longer in the Window / Menu list: it puts grandMA3 into patch mode, which blocks
  other menus (and throws a Lua error in 2.5.1.0 onPC). It can still be opened by name.
- **System Monitor** is removed from the list: `WindowSystemMonitor` is a window type for screens,
  not a menu, so `Menu` can't open it.
- The command test closes every window with Escape after opening it.

## [0.1.5] - 2026-09-28

### Fixed

- Encoder Bank keys for a bank the show has no attributes for (e.g. Shapers without blade
  fixtures) showed the raw id ("shapers") and selected a non-existent bank. They now show the
  name with "not in patch", stay dimmed, and do nothing when pressed.

## [0.1.4] - 2026-09-28

### Changed

- grandMA3 2.5 compatibility: the name sync uses `IsRunningPlayback()` (new in 2.5) to read
  executor running state, and falls back to `HasActivePlayback()` (deprecated in 2.5) on older
  versions. Checked against the 2.5 / 2.5.1.0 release notes; no other changes affect the plugin.

## [0.1.3] - 2026-09-28

### Added

- Pre-programming helper profile for touch screens (Virtual Stream Deck, 8 × 8): keypad, command
  keys, banks and executors on one page, with Colors, MAtricks, Pools, Executors and Windows
  folders. Folder and back keys use images drawn by the plugin's key renderer.
- The profile generator supports folders and key images, and checks that every MA Key preset
  used in a layout exists.

### Changed

- The Stream Deck + XL model code (`20GBX9901`) is confirmed from a real export; the warning is
  removed from the docs.

## [0.1.2] - 2026-09-28

### Added

- Color Picker keys can target a group: one press selects the group and sets the colour. The
  group name from the show is shown on the key.
- Colour picker profiles for Stream Deck XL (4 groups × 8 colours) and + XL (with group keys and
  RGB / white / hue / saturation dials).
- `npm run preview` renders the README key image with the real key renderer.
- Every key lights up while pressed. Group, World, Filter and View keys stay lit for the object
  last called from the deck, and Preset keys for the preset last applied (per pool).
- Executor keys and dials follow grandMA3: running state and fader level, read at sync and kept
  up to date from grandMA3's feedback.

### Fixed

- Executor feedback never worked: grandMA3 2.4 addresses it by object path
  (`/gma3/14.14.1.6.2 "Go+"…`), not `/Page1/Fader104`. The name sync now maps object paths to
  executors.
- Executor keys and faders default to commands (`Go+ Page 1.104`, `FaderMaster … At`). The native
  OSC key / fader paths got no reaction on grandMA3 2.4.2.2; they remain as an experimental option.
- The README image showed keys lit that never light up; it now shows only real states.
- Outline style: active keys keep their outline look (heavier frame, inner ring, coloured label)
  instead of being filled like backlit keys.

## [0.1.1] - 2026-09-28

### Fixed

- The plugin package now includes `LICENSE` and `THIRD-PARTY-NOTICES.txt` with the licences of
  the bundled libraries (Elgato Stream Deck SDK, ws, zod: MIT; tslib: 0BSD). The notices are
  generated from the bundle at build time.

## [0.1.0] - 2026-09-28

First public preview.

### Added

- Attribute Encoder dial with encoder banks (Dimmer, Position, Gobo, Color, Beam, Focus, Shapers,
  Control), paging, and coarse / fine / ultra resolution with acceleration.
- Executor Fader dial and Command Dial (selection, page, Go+ / Go-, value template, custom).
- MA Key (about 90 grandMA3 hard keys), Command Line, Command / Macro, Executor Key, Pool Object,
  Encoder Bank, Encoder Page, Encoder Resolution, Executor Page and Connection Status keys.
- Console-style command line: typing Store and then pressing a pool or executor key completes the
  command.
- Executor feedback from grandMA3 over OSC.
- Self-contained property inspector with shared connection settings and a test button.
- Dependency-free OSC implementation, unit tests, OSC monitor tool, CI and release workflows.
- Pool and executor names synced from grandMA3 through one `Lua` command and `SendOSC`, with
  nothing to import into the show.
- Sessions: saved connections with a manager popup and a Session key.
- Encoder banks built from the grandMA3 patch (one per feature group), with feature group sync.
- Encoder layers: Fade, Delay, Speed, Phase, Width, Accel, Decel, Transition.
- MAtricks keys and dial (grandMA3 2.x selection MAtricks), with reset all.
- Color Picker keys and Window / Menu keys for grandMA3 overlays and windows.
- Ready-made profiles for Stream Deck XL (programmer, executors), + and + XL.
- Guides for local onPC, remote onPC and console setups.
- Key design: backlit and outline styles, a 16-colour palette, automatic text contrast, distinct
  default colours per function, and labels that auto-fit without breaking words.
