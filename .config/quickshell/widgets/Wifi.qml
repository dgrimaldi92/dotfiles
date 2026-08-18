import QtQuick
import Quickshell
import qs.singletons

Rectangle {
    width: 20
    height: 20
    color: shutdownMouseArea.containsMouse ? Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, shutdownMouseArea.containsMouse ? 0.35 : 0.25) : "transparent"
    radius: 12
    border.width: shutdownMouseArea.containsMouse ? 1 : 0
    border.color: Qt.rgba(ThemeManager.accentRed.r, ThemeManager.accentRed.g, ThemeManager.accentRed.b, 0.5)

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
        text: "󰖩"
        font.family: "Symbols Nerd Font"
        font.pixelSize: 12
        color: ThemeManager.fgPrimary
    }

    MouseArea {
        id: shutdownMouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            Quickshell.execDetached(["setsid", "uwsm-app", "--", "ghostty", "-e", "impala"])
        }
    }
}
