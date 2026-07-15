import QtQuick
import Quickshell
import qs.singletons
import Quickshell.Io

Rectangle {
    width: 20
    height: 20
    color: 
    // shutdownMouseArea.containsMouse ? Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, 0.25) : 
    "transparent"

    radius: 12
    border.width: shutdownMouseArea.containsMouse ? 1 : 0
    // border.color: Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, 0.5)


    property string cpuTemp: "..."

    Process {
        id: cpuTempProcess
        command: ["bash", "-c", "sensors -u | awk '/^k10temp/{f=1} f && /temp1_input/{printf \"%.0f\\n\", $2; exit}'"]
        stdout: StdioCollector {
            onStreamFinished: cpuTemp = this.text.trim()
        }
        Component.onCompleted: running = true
    }

    Timer {
        interval: 10000
        running: true
        repeat: true
        onTriggered: cpuTemp.running = true
    }

    Behavior on color {
        ColorAnimation {
            duration: 150
        }
    }
    Behavior on border.width {
        NumberAnimation {
            duration: 150
        }
    }

    Text {
        anchors.centerIn: parent
        text: " " + cpuTemp + "°"
        font.family: "Symbols Nerd Font"
        font.pixelSize: 12
        color: ThemeManager.fgPrimary
    }

    // MouseArea {
    //     id: shutdownMouseArea
    //     anchors.fill: parent
    //     hoverEnabled: true
    //     cursorShape: Qt.PointingHandCursor
    //     onClicked: {
    //         Quickshell.execDetached(["ghostty"]); //TODO replace with TUI manager
    //     }
    // }
}
