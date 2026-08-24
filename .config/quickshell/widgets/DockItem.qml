import Quickshell
import Quickshell.Widgets
import QtQuick
import Quickshell.Hyprland

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
        onEntered: window.hoverEnter(index) 
        onExited: window.hoverLeave(index) 
        onClicked: {
            const top = HyprClients.getAppInstances(modelData.class);
            if (!top) {
                Hyprland.dispatch('hl.dsp.focus({ workspace = "empty" })');
                Hyprland.dispatch(`hl.dsp.exec_cmd("${modelData.exec.join(' ')}", {workspace = "empty"})`);
                return;
            }
            const ws = HyprClients.hyprlandFor(top)?.workspace?.name ?? "";
            if (ws.startsWith("special:minimized")) {
                const tag = ws.replace("special", "tag");
                Hyprland.dispatch(`hl.dsp.window.move({ workspace = "empty", window = "${tag}" })`);
                Hyprland.dispatch(`hl.dsp.window.clear_tags({ window = "${tag}" })`);
            }
            top.activate();
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
                id: dot
                // anchors.horizontalCenter: parent.horizontalCenter
                width: 8 
                height: 8 
                radius:4 
                // color: "#cba6f7"

                opacity: {
                    const id = modelData.class;
                    // console.log(`id: ${id}`, HyprClidnts.isdppRunning(id))
                    return HyprClients.isAppRunning(id) ? 1 : 0;
                }

                Behavior on opacity {
                    NumberAnimation {
                        duration: 200
                        easing.type: Easing.OutCubic
                    }
                }
            }
        }
    }
}
