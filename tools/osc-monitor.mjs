// Stand-in for grandMA3 when developing without a console: prints every OSC message the plugin
// sends, and echoes executor key / fader messages back as feedback.
//
//   npm run osc-monitor                  listen on 8000, echo feedback to 127.0.0.1:8001
//   npm run osc-monitor -- 9000 9001     custom listen / feedback ports
//   npm run osc-monitor -- 8000 0        no feedback
import dgram from "node:dgram";

import { decodePacket, encodeMessage } from "../src/core/osc.ts";

const listenPort = Number(process.argv[2] ?? 8000);
const feedbackPort = Number(process.argv[3] ?? 8001);

const socket = dgram.createSocket("udp4");

socket.on("message", (buf, rinfo) => {
	for (const msg of decodePacket(buf)) {
		const time = new Date().toISOString().slice(11, 23);
		const args = msg.args.map((a) => (typeof a === "string" ? JSON.stringify(a) : String(a))).join(" ");
		console.log(`${time}  ${rinfo.address}:${rinfo.port}  ${msg.address}  ${args}`);

		// Echo executor state like grandMA3 does with "Send" enabled.
		if (feedbackPort && /\/Page\d+\/(Fader|Key)\d+$/i.test(msg.address)) {
			socket.send(encodeMessage(msg.address, msg.args.filter((a) => typeof a === "number")), feedbackPort, rinfo.address);
		}
	}
});

socket.bind(listenPort, () => {
	console.log(`OSC monitor listening on UDP ${listenPort}` + (feedbackPort ? `, feedback to port ${feedbackPort}` : "") + ". Ctrl+C to quit.");
});
