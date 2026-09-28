# Setup: grandMA3 console

Use this guide to connect the Stream Deck to a **grandMA3 console** (full-size, light, compact or compact XT) or a processing unit. The console receives OSC directly, so nothing needs to run on it.

Other setups: [onPC on the same computer](setup-local-onpc.md) · [onPC on another computer](setup-remote-onpc.md)

```
┌─ Stream Deck computer ─┐                       ┌─ grandMA3 console ───┐
│  192.168.1.20          │ ─── UDP 8000 ───────▶ │  192.168.1.2         │
│  Stream Deck + plugin  │ ◀── UDP 8001 ──────── │                      │
└────────────────────────┘                       └──────────────────────┘
```

## 1. Connect to the console's network

- Connect the Stream Deck computer to a network port of the console, directly or through a switch. Use the port and network intended for remotes, not the MA-Net/DMX network used by the show, if you can keep them apart.
- Give the laptop a fixed IP address in the same subnet as the console's interface. For example, the console is `192.168.1.2/24` and the laptop is `192.168.1.20/24`.
- Check with `ping <console IP>`.

## 2. Set up OSC on the console

On the console, open **Menu → In & Out → OSC**:

1. Set **Interface** to the console's network interface that faces the laptop.
2. Switch on **Enable Input** and **Enable Output**.
3. Create two OSC lines:

| Column | Line 1 (commands in) | Line 2 (feedback out) |
|---|---|---|
| Destination IP | IP of the **Stream Deck computer** | IP of the **Stream Deck computer** |
| Mode | UDP | UDP |
| Port | `8000` | `8001` |
| Prefix | `gma3` | `gma3` |
| Receive | **Yes** | No |
| Send | No | **Yes** |
| Receive Command | **Yes** | No |
| Send Command | No | **Yes** |

> The OSC settings are saved with the **show file**. Save the show after setting them up, and check them when you load a show from someone else.

## 3. Set up the plugin

In any action's settings, open **grandMA3 connection**:

| Setting | Value |
|---|---|
| MA3 IP | IP of the **console** |
| OSC port | `8000` |
| Prefix | `gma3` |
| Feedback port | `8001` |
| Feedback line | `2` |

On the Stream Deck computer, allow incoming UDP port `8001` in the firewall.

Press **Send test command** and **Sync names now**. Then save the connection as a session named after the console, for example *FOH light*.

## On show day

- **Switching consoles:** with a session per console (main, backup, preprogramming onPC), one press on a **Session** key moves every key and dial over and re-syncs names and encoder banks.
- **What the deck can do:** anything it sends is an ordinary grandMA3 command, and it appears in the command line history. The deck has the same rights as the user logged in on that station.
- **Keep an eye on the link:** put a **Connection Status** key on every profile. Green means feedback arrived in the last 10 seconds.
