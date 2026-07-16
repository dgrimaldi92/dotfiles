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
                width: row.width + 24
                height: Config.data.iconSize + variants.spacing + 8
                radius: height / 2

                // translucent base — Hyprland blurs whatever is behind this
                color: Qt.rgba(1, 1, 1, 0.10)
                border.width: 1
                border.color: Qt.rgba(1, 1, 1, 0.22)

                // vertical sheen: brighter at the top, fades out
                Rectangle {
                    anchors.fill: parent
                    anchors.margins: 1
                    radius: parent.radius - 1
                    gradient: Gradient {
                        GradientStop {
                            position: 0.0
                            color: Qt.rgba(1, 1, 1, 0.16)
                        }
                        GradientStop {
                            position: 0.35
                            color: Qt.rgba(1, 1, 1, 0.03)
                        }
                        GradientStop {
                            position: 1.0
                            color: Qt.rgba(1, 1, 1, 0.0)
                        }
                    }
                }

                // specular top edge (the "wet" highlight)
                Rectangle {
                    anchors.top: parent.top
                    anchors.topMargin: 1
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: parent.width * 0.6
                    height: 1
                    radius: 0.5
                    color: Qt.rgba(1, 1, 1, 0.45)
                }

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

            // function getMargin(pos) {
            //     return config.data.margins?.[pos] || 0;
            // }
            // margins {
            //     left: getMargin("left")
            //     right: getMargin("right")
            //     top: getMargin("top")
            //     bottom: getMargin("bottom")
            // }

            property int length: (Config.data.iconSize + variants.spacing) * apps.length
            property int breadth: Config.data.iconSize * ((Config.data.scaleFactor ?? .3) + 1) * 1.1 + variants.spacing

            implicitWidth: length
            implicitHeight: breadth
            color: "transparent"

            mask: Region {
                item: row
            }

            readonly property var apps: Config.data.apps

            function expand(startIndex) {
                apps.forEach((_, ind) => {
                    repeater.itemAt(ind).delay(Config.data.iconSize + variants.spacing, startIndex);
                });
            }
            function collapse(startIndex) {
                apps.forEach((_, ind) => {
                    repeater.itemAt(ind).delay(0, startIndex);
                });
            }

            Rectangle {
                id: dock
                height: parent.height + 2
                width: parent.width + 2
                anchors.bottom: parent.bottom
                color: "transparent"

                Grid {
                    id: row

                    columns: window.apps.length
                    rows: 1

                    horizontalItemAlignment: Grid.AlignHCenter

                    verticalItemAlignment: Grid.AlignBottom
                    anchors.bottom: parent.bottom
                    anchors.margins: -2

                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 0

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
