pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland
import Quickshell.Wayland

QtObject {
    id: root

    // hyprctl clients -j | jq -r '.[].initialClass'  →  put that in Config.data.apps[].class
    function instances(appId) {
        if (!appId) return [];
        const needle = appId.toLowerCase();
        return ToplevelManager.toplevels.values
            .filter(t => (t.appId || "").toLowerCase() === needle);
    }

    function getAppInstances(appId) { return instances(appId)[0] ?? null; }
    function countAppInstances(appId) { return instances(appId).length; }
    function isAppRunning(appId)     { return instances(appId).length > 0; }

    // No strings. The Hyprland toplevel already points back at the wayland one.
    function hyprlandFor(toplevel) {
        return Hyprland.toplevels.values.find(t => t.wayland === toplevel) ?? null;
    }

    function activate(toplevel) {
        if (toplevel) toplevel.activate();
    }

    readonly property bool currentWorkspaceFullScreen:
        Hyprland.focusedWorkspace ? Hyprland.focusedWorkspace.hasFullscreen : false

    function currentFullScreenAppTitle() {
        const currentWorkspace = Hyprland.focusedWorkspace
        if (currentWorkspace && currentWorkspace.hasFullscreen) {
            return currentWorkspace.toplevels.values[0].title
        }
        return "No fullscreen app"
    }
}
