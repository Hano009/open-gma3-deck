# Actions reference

Every action lives in the **Open grandMA3 Deck** category in the Stream Deck app. Anything a key sends is a normal grandMA3 command, and you can see it in the grandMA3 command line history.

**Keys:** [MA Key](#ma-key) · [Command Line](#command-line) · [Command / Macro](#command--macro) · [Executor Key](#executor-key) · [Pool Object](#pool-object) · [Encoder Bank](#encoder-bank) · [Encoder Page](#encoder-page) · [Encoder Resolution](#encoder-resolution) · [Encoder Layer](#encoder-layer) · [MAtricks](#matricks) · [Color Picker](#color-picker) · [Window / Menu](#window--menu) · [Executor Page](#executor-page) · [Connection Status](#connection-status) · [Session](#session)

**Dials:** [Attribute Encoder](#attribute-encoder) · [Executor Fader](#executor-fader) · [Command Dial](#command-dial) · [MAtricks Dial](#matricks-dial)

Every key can have its own **Color** and **Style**; see [Key colours, styles and profiles](keys-and-profiles.md).

---

## Keys

### MA Key

A grandMA3 hard key. Pick one of about 90 presets or type your own.

| Kind | Examples | What happens |
|---|---|---|
| Typing keys | 0–9, `.`, Thru, +, −, At, Full, Store, Update, Delete, Copy, Move, Label, Edit, Fixture, Group, Preset, Sequence, Cue… | Typed into the deck's command line |
| Please | Please | Sends the command line |
| Clear | Clear | Clears the command line. When it's already empty, sends `Clear` to grandMA3 |
| Backspace / Esc | Backspace, Esc | Edit or discard the command line |
| Immediate | Oops, Next, Previous, All, ClearSelection, ClearAll, SaveShow… | Sent right away |
| Modes | Highlight, Solo, Blind, Freeze, Preview | Sent right away; the key stays lit while the mode is on |

### Command Line

Shows what you're typing. **Tap** to send it (Please), **hold** to clear it. When it's empty, it shows the last command you sent, dimmed.

**Console-style targets:** type *Store* (or Update, Delete, Label, Copy…), then press a Pool Object or Executor key. The deck completes the command with that object and sends it, for example `Store Group 5` or `Update Page 1.201`.

### Command / Macro

Sends any grandMA3 commands. Put one per line, or separate them with `;;`.

- **Press / release:** different commands on press and on release (e.g. flash-style behaviour).
- **Toggle:** alternates between *On press* and *Toggle off*, and the key stays lit while on.
- **Type into command line:** adds the text to the command line instead of sending it.

### Executor Key

An executor button with its **name from the show** and live level and state (the bar at the bottom).

- **Page:** empty = follow the Executor Page keys; a number = always that page.
- **Function:** Go+ (default), Go-, Pause, Toggle, On, Off, Top, Flash, Temp, Swap, Select, or your own commands (`{p}` = page, `{e}` = executor). Everything is sent as a grandMA3 command.
  - *Native OSC key* is available as an experimental option. It sends grandMA3's documented `/Page1/Key104` messages, but on grandMA3 2.4.2.2 these got no reaction in testing.
- The key **lights up while the executor runs**, and the bar shows its fader level. This needs the feedback line (line 2).

### Pool Object

A pool object with its **name from the show**: Group, Preset (`4.12`), Sequence, Macro, World, Filter, MAtricks, Timecode, Timer, Plugin, Layout, Appearance, Fixture, Page, View.

*Action* decides what a press does. The default suits the pool (select a group, apply a preset, Go+ on a sequence or macro); you can change it to Go+, Off, Toggle, Edit, Label, Store and more.

### Encoder Bank

Chooses what the Attribute Encoders control. With *Banks from = The grandMA3 patch* (the default), the banks are the feature groups of your show (Dimmer, Position, Gobo, Color, Beam, Focus, Control, Shapers, Video), holding only the attributes your fixtures actually have.

- Pressing a bank also selects that feature group on grandMA3 (setting: *Feature group*).
- Pressing the active bank again moves to its next encoder page (e.g. *Color 2/2*).
- A bank key whose feature group has no attributes in your patch (e.g. Shapers without blade fixtures) shows *not in patch*, stays dimmed and does nothing.

### Encoder Page

Next or previous encoder page of the active bank.

### Encoder Resolution

Cycles coarse → fine → ultra, or latches *fine* or *ultra*. Fine and ultra multiply every step by 0.1 and 0.01 by default (configurable).

### Encoder Layer

Chooses what the encoders change: the **value**, or its **Fade, Delay, Speed, Phase, Width, Accel, Decel** or **Transition**. Pick one layer per key, or *Cycle*. Pressing the active layer again goes back to values. The dials show the active layer in their title and bar colour.

### MAtricks

MAtricks of the current selection (grandMA3 2.x selection MAtricks).

| Function | What it does |
|---|---|
| Set value | Sets e.g. *X Wings = 2*. Press again to clear it. Lit while active |
| Step up / down | +1 / −1 (or 0.1 s for fade and delay ranges) |
| Clear this property | Sets it back to *None* |
| Reset all MAtricks | Clears every MAtricks property with one command |

Properties: Blocks, Groups, Wings, Width, Shift and Shuffle for each axis (X, Y, Z), plus Fade, Delay, Speed and Phase *from / to* ranges.

### Color Picker

Sends the key's colour to the selected fixtures as RGB mix values (`ColorRGB_R / G / B`, 0–100). Pick a palette colour or any custom colour. Optionally, white can be set to 0 or 100 at the same time. The key always shows the colour it sends.

With a **Group** set, the key colours that group in one press: it selects the group first (`Group 3`), like pressing it on the console, then sets the colour. The group's name from the show is shown at the top of the key. grandMA3 2.4 doesn't accept an attribute value for a group in a single command (`Group 1 Attribute … At …` returns *Not implemented*), so the group becomes the selection.

### Window / Menu

Opens a grandMA3 menu, overlay or window: Menu, Command, Selection, MAtricks, Phaser Editor, Playbacks, Masters, Master Overview (2.5+), Locate (2.5+), Encoders, At, At Filter, Store Options, Oops, Command History, Running Playbacks, Pools, Add Window, Settings, Backup, Messages.

- **Close window (Esc)** presses Escape on grandMA3, closing the topmost window. This is useful on touch screens.
- You can open any other grandMA3 menu by typing its name. **Patch** is left out of the list on purpose: it puts grandMA3 into patch mode, which blocks other menus until you leave it.

### Executor Page

Page +, page − or *Go to page*. It changes the page that following Executor keys and dials use, and (with *Also on MA3*) the page on grandMA3. *Go to page* keys show the page name and light up when that page is active.

### Connection Status

Shows the active session, OSC messages sent (TX) and time since the last feedback (RX). Green = feedback within the last 10 s. **Press** sends the test command, **hold** syncs names and encoder banks.

### Session

Switches every action to a saved connection, or cycles through them (*Next session*). **Hold** syncs names. See [Sessions and names](sessions-and-names.md).

---

## Dials

Dials need a Stream Deck + (4 dials) or Stream Deck + XL (6 dials).

### Attribute Encoder

| Gesture | Default |
|---|---|
| Turn | Change the attribute (or the active layer) of the selection, relative |
| Press + turn | Fine (× 0.1) |
| Push | Next encoder page of the bank |
| Tap strip | Next bank |
| Long-press strip | Coarse → fine → ultra |

In **Follow bank** mode, the dial's position decides its attribute: dial 1 takes the first attribute of the bank, dial 2 the second, and so on. You can also set a *Slot*, or use **Fixed attribute** mode with any grandMA3 attribute name. *Step*, *Invert* and custom push / touch commands are available per dial.

The touch strip shows the bank and page, the attribute, how far you've moved it (Δ), the step size, and the resolution or layer.

### Executor Fader

| Gesture | What it does |
|---|---|
| Turn | Fader level (Master, X, XA, XB, Temp, Rate, Speed or Time) |
| Push | Executor button (or toggle, or nothing) |
| Tap strip | Toggle between 0 and the last level |
| Long-press strip | Fader to 0 |

The level and the executor's name are shown on the strip, and the level follows grandMA3 when feedback is set up.

### Command Dial

| Function | Turn | Push / touch |
|---|---|---|
| Selection | Next / Previous | Touch: Highlight, long touch: ClearSelection |
| Executor page | Page + / − | Push: page 1 |
| Go+ / Go- | Go+ / Go- on the selected executor | Push: Pause |
| Absolute value | Sends your template with `{value}` (min / max / step) | – |
| Custom | Your own commands per tick (`{ticks}`, `{abs}`, `{sign}`) | Your own |

### MAtricks Dial

| Gesture | What it does |
|---|---|
| Turn | MAtricks value, e.g. X Wings. Turning down to 0 clears it |
| Push | Clear this property |
| Tap strip | Same property on the next axis (X → Y → Z) |
| Long-press strip | Reset all MAtricks |
