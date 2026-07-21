pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Hyprland

QtObject {
    id: root

    // Alias so users of the singleton don't need to know about Hyprland.
    readonly property var toplevels: Hyprland.toplevels

    function windowsFor(appId) {
        return toplevels.filter(toplevel => toplevel.class === appId || toplevel.appId === appId);
    }

    function findWindow(appId) {
        const windows = windowsFor(appId);
        return windows.length > 0 ? windows[0] : null;
    }

    function isRunning(appId) {
        return findWindow(appId) !== null;
    }

    function windowCount(appId) {
        return windowsFor(appId).length;
    }

    function activate(appId) {
        const window = findWindow(appId);

        if (!window)
            return;

        window.activate();
    }

    function activateOrLaunch(app) {
        if (isRunning(app.class)) {
            activate(app.class);
            return;
        }

        Quickshell.execDetached(["setsid", "uwsm-app", "--", ...app.exec]);
    }

    Connections {
        target: Hyprland

        function onRawEvent(event) {
            switch (event.name) {
            case "openwindow":
            case "closewindow":
            case "movewindow":
            case "activewindow":
                // Usually not necessary because toplevels is reactive,
                // but available if you ever need to resync.
                // Hyprland.refreshToplevels();
                break;
            }
        }
    }
}
