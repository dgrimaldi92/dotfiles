import QtQuick

Rectangle {
    id: root
    property string label
    signal clicked

    width: 14
    height: 14
    radius: width / 2
    color: parent.color
    MouseArea {
        anchors.fill: parent
        onClicked: root.clicked()
    }
    Text {
        anchors.fill: parent
        font.family: "JetBrainsMono Nerd Font"
        font.pixelSize: 10
        horizontalAlignment: Text.AlignRight
        color: "black"
        text: root.label
    }
}
