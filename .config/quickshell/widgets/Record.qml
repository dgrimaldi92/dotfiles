import QtQuick
import Quickshell
import Quickshell.Io
import qs.singletons

Rectangle {
    id: root
    width: 20
    height: 20

    property bool recording: false

    color: {
        if (root.recording) {
            return Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, micMouseArea.containsMouse ? 0.35 : 0.25)
        }
        if (micMouseArea.containsMouse) {
            return Qt.rgba(ThemeManager.fgPrimary.r, ThemeManager.fgPrimary.g, ThemeManager.fgPrimary.b, 0.12)
        }
        return "transparent"
    }
    radius: 12
    border.width: (root.recording || micMouseArea.containsMouse) ? 1 : 0
    border.color: {
        if (root.recording) {
            return Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, 0.6)
        }
        return Qt.rgba(ThemeManager.fgPrimary.r, ThemeManager.fgPrimary.g, ThemeManager.fgPrimary.b, 0.35)
    }
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.width { NumberAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    Text {
        anchors.centerIn: parent
        text: "󰍬"
        font.family: "Symbols Nerd Font"
        font.pixelSize: 12
        color: root.recording ? ThemeManager.accentRed : ThemeManager.fgPrimary

        Behavior on color { ColorAnimation { duration: 150 } }
    }

    MouseArea {
        id: micMouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor

        onClicked: {
            Quickshell.execDetached(["omarchy-hyprwhspr-bt"])
            if (!root.recording){
                root.recording = true
                statusTimer.start()
                return
            }
            root.recording = false
        }
    }


    Process {
        id: statusProcess
        command: ["hyprwhspr", "record", "status"]

        stdout: SplitParser {
            onRead: data => {
                const status = data.trim()
                const isIdle = status.toLowerCase().includes("idle")

                if (isIdle && !root.recording) {
                    statusTimer.stop()
                }
            }
        }
    }

    Timer {
        id: statusTimer
        interval: 500
        running: false
        repeat: true

        onTriggered: {
            statusProcess.running = true
        }
    }
}
