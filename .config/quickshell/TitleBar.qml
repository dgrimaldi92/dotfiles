import Quickshell
import QtQuick
import QtQuick.Layouts
import Quickshell.Wayland
import Quickshell.Hyprland

import "widgets" as QsWidgets
import qs.singletons

PanelWindow {
    readonly property bool isBarVisible: false
    readonly property int barHeight: 28
    readonly property int topMargin: 5



    anchors.top: true
    implicitHeight: control.hovered && HyprClients.isCurrentWorkspaceFullScreen() ? barHeight : 0
    anchors.left: true
    anchors.right: true
    color: "transparent"
    exclusionMode: ExclusionMode.Ignore // Ignore compositor space
    WlrLayershell.namespace: "quickshell:dock"
    WlrLayershell.layer: WlrLayer.Overlay

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

        Text {
            text: HyprClients.currentFullScreenAppTitle()
            font.family: "JetBrainsMono Nerd Font"
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            color: "white"
            visible: control.hovered
        }
        Row {
            id: row
            spacing: 5
            visible: control.hovered
            QsWidgets.TitleIcon {
                color: "#e0af68"
                label: "󰏩"
                onClicked: Hyprland.dispatch('minimize_toggle()')
            }
            QsWidgets.TitleIcon {
                color: "#9ece6a"
                label: "󰧑"
                onClicked: Hyprland.dispatch('hl.dsp.window.fullscreen({ mode = "fullscreen" })')
            }
            QsWidgets.TitleIcon {
                color: "#f7768e"
                label: "󰖭"
                onClicked: Hyprland.dispatch("hl.dsp.window.close()")
            }
        }
    }
}
