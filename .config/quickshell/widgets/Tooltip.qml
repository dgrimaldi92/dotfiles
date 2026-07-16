import Quickshell
import Quickshell.Io
import QtQuick
import QtQuick.Controls

ToolTip {
    id: tooltip
    anchors.centerIn: parent
    text: modelData.name
    font.family: "Symbols Nerd Font"
    font.pixelSize: 12
    color: ThemeManager.fgPrimary
    delay: 1000

    contentItem: Text {
        text: tooltip.text
        font: tooltip.font
        color: "white"
    }

    background: Rectangle {
        color: "#50000000"
        radius: 10
    }
}
