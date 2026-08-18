pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Hyprland

Singleton {
    id: root

    property var clients: []
    property var monitors: []

    readonly property var byAddress: {
        const map = {};
        for (const c of root.clients)
            map[c.address] = c;
        return map;
    }

    function refresh() {
        clientsProc.running = true;
        monitorsProc.running = true;
    }

    Component.onCompleted: root.refresh()

    // Hyprland fires several events per window action; coalesce them.
    Connections {
        target: Hyprland
        function onRawEvent(event) {
            debounce.restart();
        }
    }

    Timer {
        id: debounce
        interval: 40
        onTriggered: root.refresh()
    }

    Process {
        id: clientsProc
        command: ["hyprctl", "-j", "clients"]
        stdout: StdioCollector {
            onStreamFinished: root.clients = JSON.parse(text)
        }
    }

    Process {
        id: monitorsProc
        command: ["hyprctl", "-j", "monitors"]
        stdout: StdioCollector {
            onStreamFinished: root.monitors = JSON.parse(text)
        }
    }
}
