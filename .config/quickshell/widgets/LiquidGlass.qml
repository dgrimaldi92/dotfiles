import Quickshell
import Quickshell.Widgets
import QtQuick
import Quickshell.Io
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell.Wayland
            // ── Liquid Glass pill ─────────────────────────────────────
            Rectangle {
                id: glass
                anchors.bottom: parent.bottom
                anchors.horizontalCenter: parent.horizontalCenter
                property int horizontalPadding: 10
                width: row.width + horizontalPadding * 2 
                anchors.bottomMargin: 1 

                property int expandedHeight: Config.data.iconSize + variants.spacing + 8
                property int additionalHeight: 0        // same idiom as DockItem
                height: additionalHeight
                visible: height > 0                     // hides the sheen/border children too
                radius: expandedHeight * 0.32 

                Behavior on height {
                    NumberAnimation { duration: 180; easing.type: Easing.OutCubic }
                }

                Timer {
                    id: glassTimer
                    repeat: false
                    property int pendingHeight: 0
                    onTriggered: glass.additionalHeight = pendingHeight
                }
                function delay(h, latestIndex) {
                    glassTimer.pendingHeight = h;
                    // rise immediately; on hide, wait for the farthest icon to finish descending
                    glassTimer.interval = h ? 0 : Math.max(latestIndex, window.apps.length - 1 - latestIndex) * 25;
                    glassTimer.restart();
                }

                // translucent base — Hyprland blurs whatever is behind this
                color: Qt.rgba(1, 1, 1, 0.10)
                border.width: 1
                border.color: Qt.rgba(1, 1, 1, 0.22)

                // subtle bottom inner shadow for depth
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 1
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: parent.width - 8
                    height: 1
                    color: Qt.rgba(0, 0, 0, 0.25)
                }
            }
            // End of liquid glass pill ────────────────────────────────
