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

## When do keys light up?

| Key | Lit when |
|---|---|
| Group, World, Filter, View | It's the one you last called from the deck (cleared by Clear / ClearSelection / ClearAll or another one) |
| Preset | It's the preset last applied from the deck in that preset pool (cleared by ClearActive / ClearAll) |
| Executor | The executor is running on grandMA3. The bar shows its fader level. |
| Encoder Bank, Layer, Resolution | That bank, layer or resolution is active |
| MAtricks | That value is set |
| MA Key: Highlight, Solo, Blind, Freeze, Preview | The mode is on |
| Please / Command Line | A command is typed and waiting |
| Color Picker | Always drawn in its colour |
| **Every key** | **While you press it**, as instant confirmation |

Executor state comes from grandMA3's feedback (line 2). Group and preset highlights reflect what the deck did. If you select something on the console itself, the deck doesn't know.

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
| Color Picker (XL)<br>`open-gma3-deck-color-picker-xl` | Stream Deck XL | One row per group (groups 1–4), 8 colours each: white, red, orange, yellow, green, cyan, blue, magenta. One press colours that group. |
| Color Picker (+ XL)<br>`open-gma3-deck-color-picker-plus-xl` | Stream Deck + XL | The same, with a Group key at the start of each row, and 6 dials for Red, Green, Blue, White, Hue and Saturation of the selection |
| **Pre-programming (touch)**<br>`open-gma3-deck-preprogramming-touch-8x8` | Virtual Stream Deck, 8 × 8 | A pre-programming helper for touch screens. Everything on one page (keypad, command keys, banks, executors 201–208, modes), with folders for the rest. See below. |
| Encoders (+)<br>`open-gma3-deck-encoders-plus` | Stream Deck + | 6 bank keys, layer, resolution, 4 attribute encoders |
| Programmer (+ XL)<br>`open-gma3-deck-programmer-plus-xl` | Stream Deck + XL | The programmer layout on 9 × 4 keys, with layer and resolution, and 6 attribute encoders |

After importing, change any key in the Stream Deck app as usual. For the colour pickers, set each row to your own groups: select the keys of a row and change *Group* (the Stream Deck app lets you edit several keys of the same action one by one). To rebuild the profiles after changing the layouts in `tools/make-profiles.mjs`, run `npm run profiles`. The image at the top of this page comes from the real key renderer; run `npm run preview` to update it.

### Pre-programming helper for touch screens

The **Pre-programming (touch)** profile is made for the Stream Deck app's **Virtual Stream Deck** on a touch screen: a laptop with touch, a tablet next to the onPC screen, or a second monitor. Set the virtual Stream Deck's size to **8 × 8** before importing.

**Main page**

| Row | Keys |
|---|---|
| 1 | Status · Session · Command Line · Oops · Highlight · Blind · Page − · Page + |
| 2 | Banks: Dimmer · Position · Gobo · Color · Beam · Focus · Shapers · Control. They select the feature group on grandMA3. |
| 3 | Fixture · Group · Preset · Sequence · Cue · Executor · Store · Update |
| 4 | 7 · 8 · 9 · + · Thru · Full · Delete · Copy |
| 5 | 4 · 5 · 6 · − · At · Select All · Move · Label |
| 6 | 1 · 2 · 3 · 0 · . · Please · Edit · Clear |
| 7 | Executors 201–208 (following the page) |
| 8 | Folders: **Colors** · **MAtricks** · **Pools** · **Executors** · **Windows** · then Freeze · Solo · Preview |

**Folders** (Back is always the top-left key)

- **Colors:** the top row colours the current selection; below it, one row per group (1–7) with white, red, orange, yellow, green, cyan, blue and magenta.
- **MAtricks:** Reset and quick presets (Wings 2 / 3, Blocks 2, Groups 2 / 3), then − / + keys for Blocks, Groups, Wings, Width, Shift, Shuffle, Fade and Delay on the X, Y and Z axes, plus selection stepping.
- **Pools:** groups 1–15, presets 1.1–4.8 (dimmer, position, gobo, color), sequences 1–8 and macros 1–8, all named from your show.
- **Executors:** page keys (−, +, pages 1–4), then executors 101–115, 201–215 and 301–315, following the page.
- **Windows:** all grandMA3 overlays and windows of the Window / Menu key.
