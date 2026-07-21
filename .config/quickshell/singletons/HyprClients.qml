pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland

QtObject {
    id: root

    // Alias so users of the singleton don't need to know about Hyprland.
    readonly property var toplevels: Hyprland.toplevels

    function getAppInstances(appId) {
        return toplevels.values.find(toplevel => toplevel.title === appId || toplevel.wayland.appId === appId);
    }

    function countAppInstances(appId) {
        return toplevels.values.filter(toplevel => toplevel.title === appId || toplevel.wayland.appId === appId);
    }

    function activate(app) {
        // const app = getAppInstances(appId);
        //
        // if (!app)
        //     return;

        app.wayland.activate();
    }

    // Connections {
    //     target: Hyprland
    //
    //     function onRawEvent(event) {
    //         switch (event.name) {
    //         case "openwindow":
    //         case "closewindow":
    //         case "movewindow":
    //         case "activewindow":
    //             // Usually not necessary because toplevels is reactive,
    //             // but available if you ever need to resync.
    //             // Hyprland.refreshToplevels();
    //             break;
    //         }
    //     }
    // }
}
