import Quickshell
import QtQuick
import QtQuick.Layouts

PanelWindow {
    anchors.top: true
    readonly property bool isBarVisible: false
    readonly property int barHeight: 28

    implicitHeight: barHeight
    implicitWidth: screen.width 

    FlexboxLayout {
        anchors.fill: parent
        justifyContent: FlexboxLayout.JustifySpaceBetween
        anchors.leftMargin: 10 
        anchors.rightMargin: 10
        anchors.topMargin: 5

        
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
        }
        Row {
            id: row
            anchors.centerIn: parent
            spacing: 5 
            // RedSquare {}
        }
    }
}
