/**
 * Presses Escape on grandMA3 display 1, which closes the topmost window / overlay like the Esc
 * key. Lua `Keyboard()` verified on grandMA3 2.5.1.0.
 */
export const ESCAPE_ID = "Escape";
export const ESCAPE_COMMAND = `Lua "Keyboard(1,'press','Escape') Keyboard(1,'release','Escape')"`;

/**
 * grandMA3 menus, overlays and windows by name. The names are grandMA3's own (Root().Menus);
 * `Menu "<name>"` opens them (verified on grandMA3 2.4.2.2 and 2.5.1.0).
 *
 * "Patch" is left out on purpose: it switches grandMA3 into patch mode, which blocks other menus
 * ("Can not perform while in patch"), and in 2.5.1.0 onPC its own Lua throws an error. It can
 * still be opened with a custom menu name. Names starting with "Window" (WindowSystemMonitor,
 * WindowMasters) are window types for screens, not menus: `Menu` answers "Failed" for them.
 */
export const MENUS: Array<[id: string, label: string]> = [
	[ESCAPE_ID, "Close window (Esc)"],
	["MenuSelector", "Menu"],
	["CommandControl", "Command"],
	["SelectionOverlay", "Selection"],
	["MatricksOverlay", "MAtricks"],
	["PhaserEditorOverlay", "Phaser Editor"],
	["PlaybackControl", "Playbacks"],
	["MasterControl", "Masters"],
	["MasterOverlay", "Master Overview (2.5+)"],
	["LocateOverlay", "Locate (2.5+)"],
	["EncoderBarControl", "Encoders"],
	["AtOverlay", "At"],
	["AtFilterOverlay", "At Filter"],
	["StoreOverlay", "Store Options"],
	["OopsOverlay", "Oops"],
	["CommandLineHistory", "Cmd History"],
	["RunningPlaybacksOverlay", "Running"],
	["PoolOverlay", "Pools"],
	["AddWindow", "Add Window"],
	["Settings", "Settings"],
	["Backup", "Backup"],
	["MessageCenter", "Messages"],
];
