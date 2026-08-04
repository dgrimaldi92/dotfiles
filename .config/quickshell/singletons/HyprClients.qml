pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland

QtObject {
    id: root

    // Alias so users of the singleton don't need to know about Hyprland.
    // readonly property var toplevels: Hyprland.toplevels
    
    function matchAppInstance(appId, currentToplevel) {
        // console.log(`appId: ${appId}`)
        // console.log(`currentToplevel.title: ${currentToplevel.title}`, appId.toLowerCase())
        if (!appId){
            return false;
        }
        const needle = appId.toLowerCase()
        // console.log(`needle: ${needle}`,`waylandAppId: ${currentToplevel.wayland.appId}` )
        if (currentToplevel.wayland && currentToplevel.wayland.appId === needle){
            return true
        }
        return (currentToplevel.title ?? "").toLowerCase().includes(needle)
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
        // const app = getAppInstances(appId);
        //
        // if (!app)
        //     return;
        if (!app.wayland){
            const win = app.lastIpcObject
            console.log("hello")
            console.log(app.address)
            Hyprland.dispatch(`hl.dsp.focus({ window = "address:0x${app.address}" })`)
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
