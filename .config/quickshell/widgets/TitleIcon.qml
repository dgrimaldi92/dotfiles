import QtQuick

Rectangle {
    property string label

    id: root
    width: 14
    height: 14
    radius: width / 2
    color: parent.color
    Text {
        font.family: "JetBrainsMono Nerd Font"
        font.pixelSize: 11
        horizontalAlignment: Text.AlignHCenter
        color: "black"
        text: root.label
    }
}
