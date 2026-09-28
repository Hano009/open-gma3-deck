# Key colours, styles and ready-made profiles

![The same keys in backlit and outline style, idle and active](images/keys.png)

## Designed to be found in a hurry

- **Two styles.**
  - *Backlit* (default): the whole key is filled with its colour, dimmed when idle and at full brightness when active.
  - *Outline*: a dark key with a coloured frame. When active, the frame gets heavier, a bright inner ring appears, and the label turns the key's colour. The key is never filled.
- **Active keys stand out.** Running executors, the selected bank, latched modes (Highlight, Blind…), the active layer and set MAtricks light up: full brightness in backlit style, a heavy glowing frame in outline style.
- **Automatic contrast.** Text is black on light colours (yellow, lime, white…) and white on dark ones.
- **Labels auto-fit.** Each label gets the largest size that fits without breaking words.
- **Colour by function.** Defaults are chosen so keys are easy to tell apart:

| Colour | Keys |
|---|---|
| Red | Store, Clear, Esc |
| Orange | Update, Sequence, Cue, immediate keys |
| Pink | Delete |
| Purple | Copy, Move, Cut, Paste, Insert, MAtricks |
| Blue / Indigo | Label, Edit, Freeze / Assign, Set, World, Filter |
| Green | Please, Group |
| Cyan | Preset, Blind, Preview |
| Yellow | Highlight, Solo, Full |
| White | At, Thru, +, − |
| Grey | Numbers, pages, windows |
| Amber | Executors, Oops, functions |

## Changing colours and styles

- **Per key:** *Color* offers **Auto** (the default above), 16 palette colours, or any custom colour. *Style* is *Default*, *Backlit* or *Outline*.
- **For all keys:** *grandMA3 connection → Key look* sets the default *Key style* and the *Idle brightness* (dark, medium or bright). Dark makes active keys stand out most; bright suits daylight.

Colours are saved by name ("red"), so a key's colour stays consistent if the palette is refined later.

## Ready-made profiles

The [release](https://github.com/Hano009/open-gma3-deck/releases/latest) includes profiles you can double-click to import into the Stream Deck app. They are also in the `profiles/` folder of the repository.

| Profile (file) | Device | Layout |
|---|---|---|
| Programmer (XL)<br>`open-gma3-deck-programmer-xl` | Stream Deck XL | Status, 6 encoder banks, command line / fixture, group, preset, highlight / keypad / Thru, +, At, Full / Store, Update, Delete, Oops, Clear, Please |
| Executors (XL)<br>`open-gma3-deck-executors-xl` | Stream Deck XL | Page −/+, executors 101–114 and 201–215 following the page, status |
| Encoders (+)<br>`open-gma3-deck-encoders-plus` | Stream Deck + | 6 bank keys, layer, resolution, 4 attribute encoders |
| Programmer (+ XL)<br>`open-gma3-deck-programmer-plus-xl` | Stream Deck + XL | The programmer layout on 9 × 4 keys, with layer and resolution, and 6 attribute encoders |

After importing, change any key in the Stream Deck app as usual. To rebuild the profiles after changing the layouts in `tools/make-profiles.mjs`, run `npm run profiles`. The image at the top of this page comes from the real key renderer; run `npm run preview` to update it.

> The Stream Deck + XL profile uses the device model code `20GBX9901`. If the Stream Deck app offers it for the wrong device, please [open an issue](https://github.com/Hano009/open-gma3-deck/issues).
