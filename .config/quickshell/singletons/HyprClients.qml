pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland
import Quickshell.Wayland

QtObject {
    id: root
    
    readonly property var waylandToplevels: Array.from(new Set(ToplevelManager.toplevels.values.filter(val => val.title && val.title !== "")))
    // Alias so users of the singleton don't need to know about Hyprland.
    // readonly property var toplevels: Hyprland.toplevels
    
    function matchAppInstance(appId, currentToplevel) {
        if (!appId) return false;

        const needle = appId.toLowerCase();

        // HyprlandToplevel → HyprlandClient → initialClass
        const waylandAppId = currentToplevel.wayland?.appId?.toLowerCase();
        if (waylandAppId && waylandAppId.includes(needle)) return true;

        // Title fallback (still scoped to this specific toplevel)
        if (currentToplevel.title && currentToplevel.title.toLowerCase().includes(needle)) return true;

        return false;
    }

    function getAppInstances(appId) {
        const needle = appId.toLowerCase();
        const manager = ToplevelManager.toplevels.values.find(toplevel =>
            (toplevel.appId && toplevel.appId.toLowerCase().includes(needle)) ||
            (toplevel.title && toplevel.title.toLowerCase().includes(needle))
        );   
        if (!manager){
            return
        }
        return Hyprland.toplevels.values.find(toplevel => matchAppInstance(appId, toplevel));

    }

    function countAppInstances(appId) {
        return Hyprland.toplevels.values.filter(toplevel => matchAppInstance(appId, toplevel));
    }

    function isAppRunning(appId) {
        // return Hyprland.toplevels.values.some(toplevel => matchAppInstance(appId, toplevel)) 
        if (!appId) return false;
        const needle = appId.toLowerCase();
        return ToplevelManager.toplevels.values.some(toplevel =>
            (toplevel.appId && toplevel.appId.toLowerCase().includes(needle)) ||
            (toplevel.title && toplevel.title.toLowerCase().includes(needle))
        );   
    }

    function activate(app) {
        Hyprland.refreshToplevels()
        // const appInst = getAppInstances(appId);
        // console.log(appInst)
        //
        // if (!app)
        //     return;
        if (!app.wayland){
            if (app.title === "xmind") {
                Hyprland.dispatch(`hl.dsp.focus({ window = "class:^(Xmind)$" })`) 
            }
            Hyprland.refreshToplevels()
            return
        }
        app.wayland.activate();
    }

    function isCurrentWorkspaceFullScreen() {
        return Hyprland.focusedWorkspace && Hyprland.focusedWorkspace.hasFullscreen
    }

    function currentFullScreenAppTitle() {
        const currentWorkspace = Hyprland.focusedWorkspace
        if (currentWorkspace && currentWorkspace.hasFullscreen) {
            return currentWorkspace.toplevels.values[0].title
        }
        return "No fullscreen app"
    }
}
