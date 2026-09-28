# Contributing to Open grandMA3 Deck

Thanks for helping! This project is maintained by lighting people in their spare time, so every
bug report, grandMA3 syntax fix and pull request is appreciated.

## Reporting what works (and what does not)

The most valuable contribution right now is testing on real grandMA3 versions and hardware.
When something does not work, please open an issue with:

- the grandMA3 version, and whether it is onPC or a console
- the Stream Deck model and Stream Deck app version
- the command shown in the grandMA3 command line history, if there is one

## Development setup

```bash
npm install
npm run build
npm run link      # link the plugin folder into Stream Deck
npm run watch     # rebuild and restart on every change
```

Run `npm run osc-monitor` and point the plugin at `127.0.0.1:8000` to see every OSC message
without a console.

## Guidelines

- **No runtime dependencies.** The plugin should only depend on `@elgato/streamdeck` and Node's
  built-in modules, and the property inspector must work offline (no CDN scripts or fonts).
- **Verify grandMA3 syntax.** Every command the plugin sends should be checked on a real grandMA3
  (onPC is fine). Note the version in the code comment.
- **Keep grandMA3 syntax in one place.** Command templates live in `src/core` or at the top of an
  action file, so they are easy to review and change.
- **Tests.** Pure logic (OSC, command line, banks) lives in dependency-free modules under `src/core`
  and is tested with `node --test`. Please add a test when you change one of them.
- **Style.** Tabs, double quotes, and a short comment wherever grandMA3 behaviour is not obvious.
- Run `npx tsc --noEmit`, `npm test` and `npm run validate` before opening a pull request.

## Adding an action

1. Create `src/actions/<name>.ts` that extends `DeckAction` (see `src/actions/base.ts`).
2. Register it in `src/plugin.ts`.
3. Add it to `org.open-gma3-deck.sdPlugin/manifest.json` and add a glyph in `tools/make-icons.mjs`
   (then run `npm run icons`). If it belongs in a ready-made layout, add it in
   `tools/make-profiles.mjs` and run `npm run profiles`.
4. Add its settings form to `SCHEMAS` in `org.open-gma3-deck.sdPlugin/ui/pi.js`.
5. Document it in `docs/actions.md`.

By contributing, you agree that your contributions are licensed under the MIT licence.
