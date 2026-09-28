# Sessions, names and encoder banks from your show

## Sessions

A **session** is a saved connection: IP, OSC port, prefix, feedback port and feedback line. Make one per console, onPC or show network, for example *Local onPC*, *FOH light* and *Backup console*.

- **Manage sessions:** open any action's settings → *grandMA3 connection* → **Manage sessions…**. In the popup you can add, edit, reorder, delete, or press **Use** to switch. If Stream Deck blocks the popup, the manager opens inside the settings panel instead.
- **Quick switch:** the *Session* dropdown at the top of *grandMA3 connection*.
- **From the Stream Deck:** a **Session** key switches to one session, or cycles through all of them with *Next session*.

Switching a session moves **every key and dial at once**, and re-syncs names and encoder banks from the new show.

## Names from your show

Pool Object, Executor Key, Executor Fader and *Go to page* keys show the names from grandMA3 when their *Label* is empty. For example, Group 1 shows "Vipers", Preset 4.1 shows "Open White" and executor 1.204 shows "Move Speed".

**How it works.** Nothing is imported into your show. The plugin sends one command line: `Lua "…"`. That short Lua snippet reads the data pool on grandMA3 and sends the names back with `SendOSC` through your feedback line. This covers groups, sequences, macros, worlds, filters, MAtricks, timecodes, timers, plugins, layouts, pages, all preset pools, and the executors on the pages in use.

**When names sync**

- When the plugin starts, and when you switch session or change connection settings
- When the executor page changes (for executor names)
- When you press **Sync names now**, or hold a Status or Session key

With *Sync names = Only when I ask*, only the last one applies. That keeps the grandMA3 command line history cleaner.

**Requirements:** OSC line 2 with *Send* and *Send Command* set to Yes, and *Feedback line* in the plugin set to that line's number. See the setup guides.

## Encoder banks from your patch

With *Banks from = The grandMA3 patch* (default), the plugin also asks grandMA3 which attributes your patched fixtures actually have, grouped by feature group. The result is one bank per feature group in grandMA3's order, with readable labels. For example: Position = Pan, Tilt; Color = Color 1, Red, Green, Blue, White, CTO, CTC.

- Encoder Bank keys are matched by feature group name (`dimmer`, `position`, `gobo`, `color`, `beam`, `focus`, `control`, `shapers`, `video`).
- Until the first sync, or without a feedback line, the built-in banks are used.

### Custom banks

To set up the dials yourself, paste JSON into *grandMA3 connection → Custom banks*. It takes priority over both other sources:

```json
[
  { "name": "Position", "color": "#4aa3ff", "attrs": ["Pan", "Tilt", { "attr": "XYZ_X", "label": "X", "step": 0.05 }] },
  { "name": "LED", "color": "#ff5ca8", "attrs": ["ColorRGB_R", "ColorRGB_G", "ColorRGB_B", "ColorRGB_W", "ColorRGB_RY", "ColorRGB_UV"] }
]
```

- `attrs` can be plain attribute names, or objects with `attr`, `label` and `step`.
- `step` is the change per dial tick in coarse resolution. It defaults to 1.
- grandMA3's attribute names are listed in *Menu → Patch → Attribute Definitions*.
