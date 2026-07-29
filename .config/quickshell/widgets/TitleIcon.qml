import QtQuick

Rectangle {
    id: root
    width: 14
    height: 14
    radius: width / 2
    Text {
        font.family: "JetBrainsMono Nerd Font"
        font.pixelSize: 11
        horizontalAlignment: Text.AlignHCenter
        color: "black"
        text: root.label
    }
}
