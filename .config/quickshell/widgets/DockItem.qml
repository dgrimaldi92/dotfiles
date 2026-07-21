import Quickshell
import Quickshell.Widgets
import QtQuick

import qs.singletons

Rectangle {
    id: item
    property int additionalHeight: 0
    property int spacing: 8
    property int animationDuration: 5
    property real pseudoScale: row.current == -1 ? 0 : 1
    // {
    //     if (row.current == -1)
    //         return 0;
    //     else {
    //         const falloff = Config.data.falloff || 3;
    //         const absDiff = Math.abs(index - row.current);
    //         const diff = Math.max(0, falloff - absDiff);
    //         const damp = falloff - Math.max(1, diff);
    //         const sc = damp ? Config.data.scaleFactor / (damp * (Config.data.damp || 1)) : Config.data.scaleFactor;
    //
    //         return diff / falloff * sc;
    //     }
    // }
    Behavior on pseudoScale {
        NumberAnimation {
            duration: 180
            easing.type: Easing.OutCubic
        }
    }
    property int length: Config.data.iconSize * pseudoScale + spacing + additionalHeight
    property int breadth: Config.data.iconSize + spacing

    width: breadth
    height: length

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
            window.expand();
        }
        onExited: {
            if (row.current == index) {
                row.current = -1;
                window.collapse(index);
            }
        }
        onClicked: {
            const client = HyprClients.findClient(modelData.class);
            if (client) {
                Quickshell.execDetached(["hyprctl", "dispatch", "focuswindow", "address:" + client.address]);
                return;
            }
            Quickshell.execDetached(["sh", "-c", "hyprctl dispatch workspace empty && uwsm-app -- " + modelData.exec.map(a => "'" + a.replace(/'/g, "'\\''") + "'").join(" ")]);
        }
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
                    text: modelData.icon
                    font.family: "JetBrainsMono Nerd Font"
                    font.pixelSize: 52
                    horizontalAlignment: Text.AlignHCenter
                    color: "#eecdb4f8"

                    transform: Scale {
                        origin.x: Config.data.iconSize / 2
                        origin.y: Config.data.iconSize / 2
                        xScale: itemMouseArea.containsPress ? 0.9 : 1
                        yScale: itemMouseArea.containsPress ? 0.9 : 1
                    }
                }
            }

            Rectangle {
                visible: HyprClients.isRunning(modelData.class)
            }
        }
    }
}
