import Quickshell
import QtQuick
import QtQuick.Layouts
import Quickshell.Wayland

import "widgets" as QsWidgets

PanelWindow {
    readonly property bool isBarVisible: false
    readonly property int barHeight: 28
    readonly property int topMargin: 5

    anchors.top: true
    implicitHeight: barHeight
    implicitWidth: screen.width
    exclusionMode: ExclusionMode.Ignore // Ignore compositor space
    WlrLayershell.namespace: "quickshell:dock"

    // mask: Region {
    //     item: row
    // } // TODO check if needed

    QsWidgets.LiquidGlass {
        id: glass

        anchors.horizontalCenter: parent.horizontalCenter
        anchors.topMargin: topMargin

        property int expandedHeight: 0
        property int additionalHeight: barHeight        // same idiom as DockItem
        width: parent.width
        height: control.hovered ? additionalHeight : 0
    }

    HoverHandler {
        id: control
    }

    FlexboxLayout {
        anchors.fill: parent
        justifyContent: FlexboxLayout.JustifySpaceBetween
        anchors.leftMargin: 10
        anchors.rightMargin: 10
        anchors.topMargin: topMargin

        // translucent base — Hyprland blurs whatever is behind this
        // color: Qt.rgba(1, 1, 1, 0.10)
        // border.width: 1
        // border.color: Qt.rgba(1, 1, 1, 0.22)
        Text {
            text: "App Name"
            font.family: "JetBrainsMono Nerd Font"
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            color: "black"
            visible: control.hovered
        }
        Row {
            id: row
            anchors.centerIn: parent
            spacing: 5
            visible: control.hovered
            QsWidgets.TitleIcon {
                label: ""
            }
            QsWidgets.TitleIcon {
                label: "󰧑"
            }
            QsWidgets.TitleIcon {
                label: "󰏩"
            }
        }
    }
}
