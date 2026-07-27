import Quickshell
import QtQuick
import QtQuick.Layouts

PanelWindow {
    anchors.top: true
    readonly property boolean isBarVisible: false

    FlexboxLayout {
        anchors.fill: parent
        justifyContent: FlexboxLayout.JustifySpaceBetween
        Text {
            anchors.fill: parent
            // anchors.horizontalCenter: parent.horizontalCenter
            // anchors.bottom: 5 //TODO
            // anchors.topMargin: 5
            // anchors.bottomMargin: 0.1

            text: "App Name"
            font.family: "JetBrainsMono Nerd Font"
            font.pixelSize: 11
            horizontalAlignment: Text.AlignHCenter
            color: "white"
        }
        Row {
            id: row
            anchors.centerIn: parent
            spacing: 20
            // BlueSquar:q:e {}
            // GreenSquare {}
            // RedSquare {}
        }
    }
}
