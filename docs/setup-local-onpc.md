# Setup: grandMA3 onPC on the same computer

Use this guide when grandMA3 onPC and the Stream Deck app run on the **same computer**. It's the most common setup for pre-programming on a laptop.

Other setups: [onPC on another computer](setup-remote-onpc.md) · [grandMA3 console](setup-console.md)

```
┌──────────────────────── your computer ────────────────────────┐
│  Stream Deck app + plugin  ── UDP 8000 ──▶  grandMA3 onPC     │
│                            ◀── UDP 8001 ──  (feedback, names) │
└───────────────────────────────────────────────────────────────┘
```

## 1. Install the plugin

1. Download `org.open-gma3-deck.streamDeckPlugin` from the [latest release](https://github.com/Hano009/open-gma3-deck/releases/latest).
2. Double-click it. Stream Deck installs it, and the actions appear under **Open grandMA3 Deck**.
3. Optional: double-click a ready-made profile from the release (see [Profiles](keys-and-profiles.md#ready-made-profiles)).

## 2. Set up OSC in grandMA3 onPC

Open **Menu → In & Out → OSC**.

1. Set **Preferred IP** to `127.0.0.0/24` and **Interface** to the loopback interface (`127.0.0.1`).
2. Switch on **Enable Input** and **Enable Output** (the buttons turn yellow).
3. Tap **New OSC Data** twice to create two lines, then set them up like this:

| Column | Line 1 (commands in) | Line 2 (feedback out) |
|---|---|---|
| Name | `Stream Deck in` | `Stream Deck out` |
| Destination IP | `127.0.0.1` | `127.0.0.1` |
| Mode | UDP | UDP |
| Port | `8000` | `8001` |
| Prefix | `gma3` | `gma3` |
| Receive | **Yes** | No |
| Send | No | **Yes** |
| Receive Command | **Yes** | No |
| Send Command | No | **Yes** |
| Echo Input | No (Yes while troubleshooting) | No |

4. **Restart onPC.** This works around a known onPC bug where loopback OSC stops working until a restart ([MA forum](https://forum.malighting.com/forum/thread/68996-osc-communication-bug/)).

> Line 1 is enough to control grandMA3. Line 2 adds live executor feedback, names from your show and encoder banks built from your patch. *Send Command* on line 2 is required, because without it grandMA3 refuses the plugin's `SendOSC` with *Illegal property*.

## 3. Set up the plugin

1. Drag any Open grandMA3 Deck action onto a key, for example **Connection Status**.
2. In its settings, open **grandMA3 connection** and check the values:

| Setting | Value |
|---|---|
| MA3 IP | `127.0.0.1` |
| OSC port | `8000` |
| Prefix | `gma3` |
| Feedback port | `8001` |
| Feedback line | `2` (the *No* of line 2) |

3. Press **Send test command**. `Open grandMA3 Deck: OSC OK` appears in the grandMA3 command line history.
4. Press **Sync names now**. The status shows how many names came back, and the Encoder Bank keys switch to banks built from your patch.
5. Optional: press **Manage sessions…** → **+ Save current connection** and call it *Local onPC*.

## Checklist when it doesn't work

- Does the **Connection Status** key count up **TX** when you press keys? If not, check the plugin log (see [Troubleshooting](troubleshooting.md)).
- Turn on **Echo Input** on line 1 and open the **System Monitor**. Do the messages arrive?
  - **Nothing arrives:** apply the Preferred IP workaround above and restart onPC. If it still fails, add an exception for `app_gma3.exe` in *Windows Security → App & browser control → Exploit protection → Program settings*.
  - **Messages arrive but nothing happens:** set *Receive Command* on line 1 to Yes.
- `Illegal property: SendOSC …` in the command line history means *Send Command* on line 2 is off.
- **No names:** check that *Feedback line* matches the number of line 2 and that *Feedback port* is `8001`.

More in [Troubleshooting](troubleshooting.md).
