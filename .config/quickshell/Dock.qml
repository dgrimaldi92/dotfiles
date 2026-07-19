import Quickshell
import Quickshell.Widgets
import QtQuick
import Quickshell.Io
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell.Wayland

import "widgets" as QsWidgets
import qs.singletons

Scope {
    property string name: "default"

    property list<int> screenIds: Quickshell.screens.map((_, i) => i)
    property list<ShellScreen> screens: Quickshell.screens.filter((_, i) => screenIds.includes(i))

    Variants {
        id: variants
        property int spacing: 8
        model: screens

        PanelWindow {
            id: window
            exclusionMode: ExclusionMode.Ignore
            WlrLayershell.namespace: "quickshell:dock"
            mask: Region {
                item: glass
                regions: [
                    Region {
                        item: row
                    }
                ]
            }

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

            anchors {
                left: false
                right: false
                top: false
                bottom: true
            }

            readonly property var apps: Config.data.apps
            property int length: (Config.data.iconSize + variants.spacing) * apps.length
            property int breadth: Config.data.iconSize * ((Config.data.scaleFactor ?? .3) + 1) * 1.1 + variants.spacing

            implicitWidth: length +500 
            implicitHeight: breadth 
            color: "transparent"


            function expand(startIndex) {
                glass.delay(glass.expandedHeight, startIndex  ?? row.current);
                apps.forEach((_, ind) => {
                    repeater.itemAt(ind).delay(Config.data.iconSize / 4 + variants.spacing, startIndex); // if move y enabled use *1.25 
                     
                });
            }
            function collapse(startIndex) {
                glass.delay(0, startIndex);
                apps.forEach((_, ind) => {
                    repeater.itemAt(ind).delay(0, startIndex);
                });
            }

            Rectangle {
                id: dock
                height: parent.height 
                width: parent.width 
                anchors.bottom: parent.bottom
                color: "transparent"

                Grid {
                    id: row

                    columns: window.apps.length
                    rows: 1

                    horizontalItemAlignment: Grid.AlignHCenter

                    verticalItemAlignment: Grid.AlignBottom
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 0 
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 1 

                    property int current: -1

                    Repeater {
                        id: repeater
                        model: window.apps

                        QsWidgets.DockItem {}
                    }
                }
            }
        }
    }
}
