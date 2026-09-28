# Troubleshooting

## Where to look

- **Connection Status key:** *TX* counts messages sent, *RX* shows the time since grandMA3 last sent something. Green = feedback within 10 s.
- **Connection settings:** the status box under *grandMA3 connection* shows the last command sent, the last message received, the name count and errors.
- **Plugin log:** every command sent is logged.
  - Windows: `%APPDATA%\Elgato\StreamDeck\Plugins\org.open-gma3-deck.sdPlugin\logs\`
  - macOS: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/org.open-gma3-deck.sdPlugin/logs/`
- **grandMA3:** the command line history shows every command the deck sends. With *Echo Input = Yes* on the OSC line, incoming messages appear in the System Monitor.

## Common problems

| Symptom | Cause and fix |
|---|---|
| TX counts up, nothing happens on grandMA3 | Wrong IP, port or prefix. Or *Enable Input* is off, *Receive* / *Receive Command* on line 1 is off, or a firewall blocks UDP 8000 on the grandMA3 computer. |
| Messages show in the System Monitor, but nothing happens | *Receive Command* on line 1 is off. |
| Nothing in the System Monitor at all (onPC on the same computer) | Known onPC loopback bug. Set *Preferred IP* to `127.0.0.0/24`, recreate the OSC lines and restart onPC. If it still fails, add an Exploit protection exception for `app_gma3.exe`, or bind onPC to a real network adapter. |
| `Illegal property: SendOSC …` in the command line history | *Send Command* on the feedback line (line 2) is off. |
| Commands work, no names / RX stays “—” | Line 2 is missing, its *Destination IP* isn't the Stream Deck computer, *Feedback line* doesn't match the line number, or a firewall blocks UDP 8001 on the Stream Deck computer. |
| “address in use” error | Another program uses the feedback port. Choose another port (and change line 2 to match), or set it to 0. |
| Encoders do nothing | No fixtures are selected. The encoders change the current selection, like on the console. |
| Encoder bank is empty (“—”) | That bank has fewer attributes than you have dials. Or the patch has no such attributes. Try *Sync names now*, or check *Banks from*. |
| Encoders change timing, not values | An Encoder Layer is active (the strip shows e.g. *Position · Fade*). Press the layer key again. |
| Executor key shows no level | Feedback (line 2) isn't set up. The keys still work. |
| Page keys and grandMA3 show different pages | Someone changed the page on grandMA3. Press a *Go to page* key, or enable *Also on MA3* on the page keys. |
| Session popup doesn't open | Stream Deck blocked it. The manager opens inside the settings panel instead. |

## Reporting a bug

Please [open an issue](https://github.com/Hano009/open-gma3-deck/issues/new/choose) with:

- your grandMA3 version (onPC or console)
- your Stream Deck model and app version
- your operating system
- the command from the command line history
- the plugin log
