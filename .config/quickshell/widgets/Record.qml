import QtQuick
import Quickshell
import Quickshell.Io
import qs.singletons

Rectangle {
    id: root
    width: 20
    height: 20

    property bool recording: false

    color: root.recording
        ? Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, micMouseArea.containsMouse ? 0.35 : 0.25)
        : (micMouseArea.containsMouse ? Qt.rgba(ThemeManager.fgPrimary.r, ThemeManager.fgPrimary.g, ThemeManager.fgPrimary.b, 0.12) : "transparent")
    radius: 12
    border.width: (root.recording || micMouseArea.containsMouse) ? 1 : 0
    border.color: root.recording
        ? Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, 0.6)
        : Qt.rgba(ThemeManager.fgPrimary.r, ThemeManager.fgPrimary.g, ThemeManager.fgPrimary.b, 0.35)

    Behavior on color {
        ColorAnimation { duration: 150 }
    }
    Behavior on border.width {
        NumberAnimation { duration: 150 }
    }
    Behavior on border.color {
        ColorAnimation { duration: 150 }
    }

    Text {
        anchors.centerIn: parent
        text: "󰍬"
        font.family: "Symbols Nerd Font"
        font.pixelSize: 12
        color: root.recording ? ThemeManager.accentRed : ThemeManager.fgPrimary

        Behavior on color {
            ColorAnimation { duration: 150 }
        }
    }

    MouseArea {
        id: micMouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: toggleProcess.running = true
    }

    Process {
        id: toggleProcess
        command: ["omarchy-hyprwhspr-bt", "toggle"]
        onExited: statusProcess.running = true
    }

    Process {
        id: statusProcess
        command: ["omarchy-hyprwhspr-bt", "status"]
        stdout: SplitParser {
            onRead: data => root.recording = (data.trim() === "recording")
        }
    }

    Timer {
        interval: 500
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: statusProcess.running = true
    }
}
