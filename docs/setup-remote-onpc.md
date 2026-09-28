# Setup: grandMA3 onPC on another computer

Use this guide when the Stream Deck is connected to one computer and grandMA3 onPC runs on **another computer on the same network**. For example, the Stream Deck is on a laptop at FOH and onPC runs on a show PC.

Other setups: [onPC on the same computer](setup-local-onpc.md) · [grandMA3 console](setup-console.md)

```
┌─ Stream Deck computer ─┐                    ┌─ onPC computer ─────────┐
│  192.168.1.20          │ ── UDP 8000 ─────▶ │  192.168.1.10           │
│  Stream Deck + plugin  │ ◀── UDP 8001 ───── │  grandMA3 onPC          │
└────────────────────────┘                    └─────────────────────────┘
```

The addresses above are examples. Use your own.

## 1. Network

- Both computers must be on the same network and able to reach each other. Try `ping 192.168.1.10` from the Stream Deck computer.
- Write down both IP addresses. On Windows, run `ipconfig`. On macOS, open *System Settings → Network*.
- Use fixed IP addresses on show networks, so the setup survives a restart.

## 2. Set up OSC in grandMA3 onPC

On the **onPC computer**, open **Menu → In & Out → OSC**:

1. Set **Interface** to the network adapter that faces the Stream Deck computer (not loopback).
2. Switch on **Enable Input** and **Enable Output**.
3. Create two OSC lines:

| Column | Line 1 (commands in) | Line 2 (feedback out) |
|---|---|---|
| Destination IP | IP of the **Stream Deck computer** (`192.168.1.20`) | IP of the **Stream Deck computer** (`192.168.1.20`) |
| Mode | UDP | UDP |
| Port | `8000` | `8001` |
| Prefix | `gma3` | `gma3` |
| Receive | **Yes** | No |
| Send | No | **Yes** |
| Receive Command | **Yes** | No |
| Send Command | No | **Yes** |

## 3. Firewalls

UDP must be allowed in both directions:

- **onPC computer:** allow incoming UDP port `8000` for grandMA3 onPC (`app_gma3.exe` on Windows).
- **Stream Deck computer:** allow incoming UDP port `8001` for Stream Deck's Node.js. On Windows, a firewall prompt may appear the first time the plugin starts. Allow it on *private* networks.

## 4. Set up the plugin

In any action's settings, open **grandMA3 connection**:

| Setting | Value |
|---|---|
| MA3 IP | IP of the **onPC computer** (`192.168.1.10`) |
| OSC port | `8000` |
| Prefix | `gma3` |
| Feedback port | `8001` |
| Feedback line | `2` |

Press **Send test command**, then **Sync names now**. Then save the connection as a session, for example *Show PC*, with **Manage sessions… → + Save current connection**.

## Tips

- In an MA session with several stations, the commands run on the station the Stream Deck talks to, under the user logged in there.
- You can keep one session per computer (*Local onPC*, *Show PC*, *FOH console*) and switch with a **Session** key.
