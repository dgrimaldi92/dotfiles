import Quickshell
import Quickshell.Io
import QtQuick
import QtQuick.Controls

import qs.singletons

ToolTip {
    id: tooltip
    // anchors.centerIn: parent
    text: modelData.name
    font.family: "Symbols Nerd Font"
    font.pixelSize: 12
    // color: ThemeManager.fgPrimary
    // visible: down
    delay: 50 

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
