/**
 * grandMA3 menus, overlays and windows by name. The names are grandMA3's own (Root().Menus);
 * `Menu "<name>"` opens them (verified on grandMA3 2.4).
 */
export const MENUS: Array<[id: string, label: string]> = [
	["MenuSelector", "Menu"],
	["CommandControl", "Command"],
	["SelectionOverlay", "Selection"],
	["MatricksOverlay", "MAtricks"],
	["PhaserEditorOverlay", "Phaser Editor"],
	["PlaybackControl", "Playbacks"],
	["MasterControl", "Masters"],
	["EncoderBarControl", "Encoders"],
	["AtOverlay", "At"],
	["AtFilterOverlay", "At Filter"],
	["StoreOverlay", "Store Options"],
	["OopsOverlay", "Oops"],
	["CommandLineHistory", "Cmd History"],
	["RunningPlaybacksOverlay", "Running"],
	["PoolOverlay", "Pools"],
	["AddWindow", "Add Window"],
	["Patch", "Patch"],
	["Settings", "Settings"],
	["Backup", "Backup"],
	["MessageCenter", "Messages"],
	["WindowSystemMonitor", "Sys Monitor"],
];
