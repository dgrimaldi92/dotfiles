pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland

QtObject {
    id: root

    // Alias so users of the singleton don't need to know about Hyprland.
    // readonly property var toplevels: Hyprland.toplevels
    
    function matchAppInstance(appId, currentToplevel) {
        // console.log(`currentToplevel.title: ${currentToplevel.title}`, appId.toLowerCase())
        if (!appId){
            return false;
        }
        const needle = appId.toLowerCase()
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
