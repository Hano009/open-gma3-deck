# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-09-28

### Added

- Color Picker keys can target a group: one press selects the group and sets the colour. The
  group name from the show is shown on the key.
- Colour picker profiles for Stream Deck XL (4 groups × 8 colours) and + XL (with group keys and
  RGB / white / hue / saturation dials).
- `npm run preview` renders the README key image with the real key renderer.

### Fixed

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
