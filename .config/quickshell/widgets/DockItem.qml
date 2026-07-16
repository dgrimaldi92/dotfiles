import Quickshell
import Quickshell.Widgets
import QtQuick

import qs.singletons

Rectangle {
    id: item
    // required property string icon
    // required property string name

    property int additionalHeight: 0
    property int spacing: 8
    property int animationDuration: 25
    property real pseudoScale: {
        if (row.current == -1)
            return 0;
        else {
            const falloff = Config.data.falloff || 3;
            const absDiff = Math.abs(index - row.current);
            const diff = Math.max(0, falloff - absDiff);
            const damp = falloff - Math.max(1, diff);
            const sc = damp ? Config.data.scaleFactor / (damp * (Config.data.damp || 1)) : Config.data.scaleFactor;

            return diff / falloff * sc;
        }
    }

    property int length: Config.data.iconSize * pseudoScale + spacing + additionalHeight
    property int breadth: Config.data.iconSize + spacing

    width: Config.data.orientation == "vertical" ? length : breadth
    height: Config.data.orientation == "vertical" ? breadth : length

    color: "transparent"

    Timer {
        id: timer
        repeat: false
        property int pendingHeight: 0
        onTriggered: item.additionalHeight = pendingHeight
    }
    function delay(height, latestIndex = row.current) {
        timer.pendingHeight = height;
        timer.interval = Math.abs(index - latestIndex) * animationDuration;
        timer.restart();
    }

    MouseArea {
        id: itemMouseArea
        anchors.fill: parent
        hoverEnabled: true
        onEntered: {
            row.current = index;
            window.expand(index); //TODO check
        }
        onExited: {
            if (row.current == index) {
                row.current = -1;
                window.collapse(index);
            }
        }
        onClicked: Quickshell.execDetached(["setsid", "uwsm-app", "--", ...modelData.exec])
        cursorShape: Qt.PointingHandCursor
        propagateComposedEvents: true

        Tooltip {
            visible: parent.containsMouse
        }

        Column {
            anchors.top: parent.top
            anchors.horizontalCenter: parent.horizontalCenter
            topPadding: item.spacing
            width: Config.data.iconSize
            height: item.length

            Rectangle {
                width: Config.data.iconSize
                height: width

                color: "transparent"
                radius: 12

                Text {
                    width: parent.width
                    height: width
                    // source: Quickshell.iconPath(modelData.icon)
                    text: modelData.icon
                    font.family: "JetBrainsMono Nerd Font"
                    font.pixelSize: 52
                    horizontalAlignment: Text.AlignHCenter
                    color: "white"

                    transform: Scale {
                        origin.x: Config.data.iconSize / 2
                        origin.y: Config.data.iconSize / 2
                        xScale: itemMouseArea.containsPress ? 0.9 : 1
                        yScale: itemMouseArea.containsPress ? 0.9 : 1
                    }
                }
            }
        }
    }
}
