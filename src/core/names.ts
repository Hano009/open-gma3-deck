/**
 * Pool / executor name sync without any grandMA3 plugin: the deck sends one `Lua "…"` command
 * line, the Lua reads the data pool and answers with SendOSC through the feedback OSC line.
 *
 * Requirements on grandMA3: the feedback line must have Send = Yes and Send Command = Yes
 * (SendOSC reports "Illegal property" otherwise).
 *
 * Replies (grandMA3 prepends the line's prefix):
 *   /deck/begin ,s "1"
 *   /deck/names ,s "Groups|1=Front|3=Back"       (large pools arrive in several chunks)
 *   /deck/names ,s "Preset4|1=Red|2=Blue"
 *   /deck/names ,s "Exec1|101=Master|201=Chase"
 *   /deck/done  ,s "1"
 * Kept free of imports so it can be unit tested directly by Node.
 */

/** Pools read from DataPool(), and the keyword used for them on the command line. */
export const SYNCED_POOLS: Record<string, string> = {
	Groups: "Group",
	Sequences: "Sequence",
	Macros: "Macro",
	Worlds: "World",
	Filters: "Filter",
	MAtricks: "MAtricks",
	Timecodes: "Timecode",
	Timers: "Timer",
	Plugins: "Plugin",
	Layouts: "Layout",
	Pages: "Page",
};

/**
 * Builds the Lua code (without the surrounding `Lua "…"`). It contains no double quotes, which
 * would end the command line string; string.char(34) produces them where SendOSC needs them.
 */
export function buildSyncLua(line: number, pages: number[]): string {
	const pools = Object.keys(SYNCED_POOLS)
		.map((k) => `'${k}'`)
		.join(",");
	const pageList = [...new Set(pages.filter((p) => Number.isInteger(p) && p > 0))].join(",");
	return [
		`local q,L=string.char(34),${Math.trunc(line)}`,
		`local function S(a,v) Cmd('SendOSC '..L..' '..q..'/deck/'..a..',s,'..v..q) end`,
		// Commas split SendOSC arguments; | and = are our separators; quotes end the string.
		`local function C(n) return (tostring(n or ''):gsub('[,|=%c'..q..']',' ')) end`,
		`local function D(k,p) if not p then return end local b='' for _,o in ipairs(p:Children()) do local e=tostring(o.no)..'='..C(o.name) if #b+#e>700 then S('names',k..'|'..b) b='' end b=(b=='' and e) or (b..'|'..e) end S('names',k..'|'..b) end`,
		`local dp=DataPool() S('begin','1')`,
		`for _,k in ipairs({${pools}}) do pcall(function() D(k,dp[k]) end) end`,
		`pcall(function() for _,pp in ipairs(dp.PresetPools:Children()) do D('Preset'..tostring(pp.no),pp) end end)`,
		`for _,n in ipairs({${pageList}}) do pcall(function() for _,pg in ipairs(dp.Pages:Children()) do if pg.no==n then D('Exec'..n,pg) end end end) end`,
		`S('done','1')`,
	].join(" ");
}

/** Wraps the Lua code in the grandMA3 `Lua` keyword. */
export function buildSyncCommand(line: number, pages: number[]): string {
	return `Lua "${buildSyncLua(line, pages)}"`;
}

/**
 * Parses one `/deck/names` payload into name-map entries, keyed the way objects are written
 * on the command line: "Group 3", "Preset 4.12", "Exec 1.201", "Page 2".
 */
export function parseNamesChunk(payload: string): Array<[key: string, name: string]> {
	const parts = payload.split("|");
	const kind = parts.shift() ?? "";
	let prefix: string;
	const preset = /^Preset(\d+)$/.exec(kind);
	const exec = /^Exec(\d+)$/.exec(kind);
	if (preset) prefix = `Preset ${preset[1]}.`;
	else if (exec) prefix = `Exec ${exec[1]}.`;
	else if (SYNCED_POOLS[kind]) prefix = `${SYNCED_POOLS[kind]} `;
	else return [];

	const out: Array<[string, string]> = [];
	for (const part of parts) {
		const eq = part.indexOf("=");
		if (eq <= 0) continue;
		const no = part.slice(0, eq).trim();
		const name = part.slice(eq + 1).trim();
		if (no && name && name !== "nil") out.push([prefix + no, name]);
	}
	return out;
}

/**
 * Lua that reports the attributes actually used by the patched fixtures, grouped by feature
 * group in grandMA3's own order. Replies:
 *   /deck/attrbegin ,s "1"
 *   /deck/attrs ,s "Position|Pan=P|Tilt=T"   (chunked like names)
 *   /deck/attrdone ,s "1"
 * Verified against grandMA3 2.4: LivePatch.FixtureTypes > DMXModes > DMXChannels > logical
 * channel .attribute, and AttributeDefinitions.Attributes[].feature:Parent() = feature group.
 */
export function buildAttributeSyncLua(line: number): string {
	return [
		`local q,L=string.char(34),${Math.trunc(line)}`,
		`local function S(a,v) Cmd('SendOSC '..L..' '..q..'/deck/'..a..',s,'..v..q) end`,
		`local function C(n) return (tostring(n or ''):gsub('[,|=%c'..q..']',' ')) end`,
		`local lp=ShowData().LivePatch local used={}`,
		`for _,ft in ipairs(lp.FixtureTypes:Children()) do pcall(function() for _,dm in ipairs(ft.DMXModes:Children()) do for _,ch in ipairs(dm.DMXChannels:Children()) do for _,lc in ipairs(ch:Children()) do local a=lc.attribute if a then used[type(a)=='string' and a or a.name]=true end end end end end) end`,
		`local g={} for _,a in ipairs(lp.AttributeDefinitions.Attributes:Children()) do if used[a.name] then local ok,f=pcall(function() return a.feature:Parent().name end) local k=ok and f or 'Other' g[k]=g[k] or {} table.insert(g[k],C(a.name)..'='..C(a.pretty)) end end`,
		`S('attrbegin','1')`,
		`for _,fg in ipairs(lp.AttributeDefinitions.FeatureGroups:Children()) do local t=g[fg.name] if t then local b='' for _,e in ipairs(t) do if #b+#e>700 then S('attrs',C(fg.name)..'|'..b) b='' end b=(b=='' and e) or (b..'|'..e) end S('attrs',C(fg.name)..'|'..b) end end`,
		`S('attrdone','1')`,
	].join(" ");
}

export function buildAttributeSyncCommand(line: number): string {
	return `Lua "${buildAttributeSyncLua(line)}"`;
}

const MIX_NAMES: Record<string, string> = {
	R: "Red",
	G: "Green",
	B: "Blue",
	W: "White",
	WW: "Warm White",
	CW: "Cold White",
	UV: "UV",
	C: "Cyan",
	M: "Magenta",
	Y: "Yellow",
	RY: "Amber",
	GY: "Lime",
	GC: "Teal",
	BC: "Azure",
	BM: "Violet",
	RM: "Pink",
};

/** Readable encoder label for a grandMA3 attribute name: "Gobo1Pos" -> "Gobo 1 Pos". */
export function friendlyAttribute(attr: string): string {
	const mix = /^ColorRGB_(\w+)$/.exec(attr);
	if (mix) return MIX_NAMES[mix[1]] ?? mix[1];
	const hsb = /^HSB_(\w+)$/.exec(attr);
	if (hsb) return hsb[1];
	if (/^[A-Z0-9_]+$/.test(attr)) return attr.replace(/_/g, " ");
	return attr
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z0-9])/g, "$1 $2")
		.replace(/([0-9])([A-Z])/g, "$1 $2")
		.replace(/\s+/g, " ")
		.trim();
}

/** Parses one `/deck/attrs` payload: "Position|Pan=P|Tilt=T" -> { group, attrs }. */
export function parseAttributeChunk(payload: string): { group: string; attrs: string[] } | undefined {
	const parts = payload.split("|");
	const group = (parts.shift() ?? "").trim();
	if (!group) return undefined;
	const attrs = parts
		.map((p) => p.slice(0, p.indexOf("=") < 0 ? p.length : p.indexOf("=")).trim())
		.filter((a) => a.length > 0);
	return { group, attrs };
}

/** Key for a pool object as configured on a key: ("Preset", "4.12") -> "Preset 4.12". */
export function poolKey(type: string, number: string): string {
	return `${type} ${number.trim()}`;
}
