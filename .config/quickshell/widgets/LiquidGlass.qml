import Quickshell
import QtQuick
import Quickshell.Io

// ── Liquid Glass pill ─────────────────────────────────────
Rectangle {
    id: glass

    Behavior on height {
        NumberAnimation {
            duration: 180
            easing.type: Easing.OutCubic
        }
    }

    // translucent base — Hyprland blurs whatever is behind this
    visible: height > 0                     // hides the sheen/border children too
    radius: expandedHeight * 0.32
    // color: Qt.rgba(1, 1, 1, 0.10)  //original shadow problem readibility
    color: Qt.rgba(0.05, 0.05, 0.08, 0.55)
    border.width: 1
    border.color: Qt.rgba(1, 1, 1, 0.22)

    // subtle bottom inner shadow for depth
    Rectangle {
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 1
        anchors.horizontalCenter: parent.horizontalCenter
        width: parent.width - 8
        height: 1
        color: Qt.rgba(0, 0, 0, 0.25)
    }
}
// End of liquid glass pill ────────────────────────────────
