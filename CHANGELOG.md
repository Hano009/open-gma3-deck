# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

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
