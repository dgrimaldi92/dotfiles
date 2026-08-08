pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland
import Quickshell.Wayland

QtObject {
    id: root
    
    readonly property var waylandToplevels: Array.from(new Set(ToplevelManager.toplevels.values.filter(w => w.titile && w.title !== "")))
    // Alias so users of the singleton don't need to know about Hyprland.
    // readonly property var toplevels: Hyprland.toplevels
    
    function matchAppInstance(appId, currentToplevel) {
        if (!appId){
            return false;
        }
        const needle = appId.toLowerCase()
        if (currentToplevel.wayland && currentToplevel.wayland.appId === needle){
            return true
        }
        if (currentToplevel.wayland && currentToplevel.title){
            return currentToplevel.title.toLowerCase().includes(needle)
        }
        return waylandToplevels.find(wayland => needle === wayland.appId.toLowerCase())
    }

    function getAppInstances(appId) {
        return Hyprland.toplevels.values.find(toplevel => matchAppInstance(appId, toplevel));
    }

    function countAppInstances(appId) {
        return Hyprland.toplevels.values.filter(toplevel => matchAppInstance(appId, toplevel));
    }

    function isAppRunning(appId) {
        return Hyprland.toplevels.values.some(toplevel => matchAppInstance(appId, toplevel)) 
    }

    function activate(app) {
        Hyprland.refreshToplevels()
        // const appInst = getAppInstances(appId);
        // console.log(appInst)
        //
        // if (!app)
        //     return;
        if (!app.wayland){
            const win = app.lastIpcObject
            // console.log("hello")
            // console.log(JSON.stringify(app))
            // for (const t of Hyprland.toplevels.values){
            //     console.log(t.address, t.wayland?.appId, t.initialTitle)
            // }
            Hyprland.refreshToplevels()
            Hyprland.dispatch(`hl.dsp.focus({ window = "class:^(Xmind)$" })`)
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
