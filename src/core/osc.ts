/**
 * Minimal, dependency-free OSC 1.0 encoder / decoder.
 *
 * Supports the argument types grandMA3 sends and accepts: i (int32), f (float32), s (string),
 * T / F (booleans), N (nil), plus h (int64), d (float64) and b (blob) when decoding.
 */

export type OscArg =
	| { type: "i"; value: number }
	| { type: "f"; value: number }
	| { type: "s"; value: string }
	| { type: "T"; value: true }
	| { type: "F"; value: false }
	| { type: "N"; value: null };

export type OscValue = number | string | boolean | null | Uint8Array;

export type OscMessage = {
	address: string;
	args: OscValue[];
};

function padLength(length: number): number {
	return (length + 3) & ~3;
}

function encodeString(value: string): Buffer {
	const raw = Buffer.from(value, "utf8");
	// +1 for the mandatory null terminator, then pad to a multiple of 4.
	const out = Buffer.alloc(padLength(raw.length + 1));
	raw.copy(out);
	return out;
}

/** Converts plain JS values to typed OSC arguments (integers become `i`, other numbers `f`). */
export function toOscArg(value: OscArg | number | string | boolean | null): OscArg {
	if (value !== null && typeof value === "object") return value;
	if (value === null) return { type: "N", value: null };
	if (typeof value === "boolean") return value ? { type: "T", value: true } : { type: "F", value: false };
	if (typeof value === "string") return { type: "s", value };
	return Number.isInteger(value) ? { type: "i", value } : { type: "f", value };
}

export function encodeMessage(address: string, args: Array<OscArg | number | string | boolean | null> = []): Buffer {
	const typed = args.map(toOscArg);
	const parts: Buffer[] = [encodeString(address), encodeString("," + typed.map((a) => a.type).join(""))];
	for (const arg of typed) {
		switch (arg.type) {
			case "i": {
				const b = Buffer.alloc(4);
				b.writeInt32BE(Math.trunc(arg.value) | 0);
				parts.push(b);
				break;
			}
			case "f": {
				const b = Buffer.alloc(4);
				b.writeFloatBE(arg.value);
				parts.push(b);
				break;
			}
			case "s":
				parts.push(encodeString(arg.value));
				break;
			default:
				// T, F and N carry no data.
				break;
		}
	}
	return Buffer.concat(parts);
}

function readString(buf: Buffer, offset: number): [string, number] {
	let end = offset;
	while (end < buf.length && buf[end] !== 0) end++;
	if (end >= buf.length) throw new Error("OSC string is not null terminated");
	return [buf.toString("utf8", offset, end), padLength(end + 1)];
}

function decodeMessage(buf: Buffer): OscMessage {
	let offset = 0;
	let address: string;
	[address, offset] = readString(buf, offset);
	if (offset >= buf.length) return { address, args: [] };

	let tags: string;
	[tags, offset] = readString(buf, offset);
	if (!tags.startsWith(",")) return { address, args: [] };

	const args: OscValue[] = [];
	for (const tag of tags.slice(1)) {
		switch (tag) {
			case "i":
				args.push(buf.readInt32BE(offset));
				offset += 4;
				break;
			case "f":
				args.push(buf.readFloatBE(offset));
				offset += 4;
				break;
			case "h":
				args.push(Number(buf.readBigInt64BE(offset)));
				offset += 8;
				break;
			case "d":
				args.push(buf.readDoubleBE(offset));
				offset += 8;
				break;
			case "s":
			case "S": {
				let s: string;
				[s, offset] = readString(buf, offset);
				args.push(s);
				break;
			}
			case "b": {
				const len = buf.readInt32BE(offset);
				offset += 4;
				args.push(new Uint8Array(buf.subarray(offset, offset + len)));
				offset += padLength(len);
				break;
			}
			case "T":
				args.push(true);
				break;
			case "F":
				args.push(false);
				break;
			case "N":
			case "I":
				args.push(null);
				break;
			default:
				// Unknown tag: we cannot know its size, so stop parsing here.
				return { address, args };
		}
	}
	return { address, args };
}

/** Decodes a UDP packet into one or more messages (bundles are flattened). */
export function decodePacket(buf: Buffer): OscMessage[] {
	if (buf.length >= 8 && buf.toString("ascii", 0, 8) === "#bundle\0") {
		const out: OscMessage[] = [];
		let offset = 16; // "#bundle\0" + 8 byte time tag
		while (offset + 4 <= buf.length) {
			const size = buf.readInt32BE(offset);
			offset += 4;
			out.push(...decodePacket(buf.subarray(offset, offset + size)));
			offset += size;
		}
		return out;
	}
	return [decodeMessage(buf)];
}
