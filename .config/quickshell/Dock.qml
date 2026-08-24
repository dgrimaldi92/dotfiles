import Quickshell
import QtQuick
import Quickshell.Wayland

import "widgets" as QsWidgets
import qs.singletons

Scope {
    id: root

    readonly property int iconGap: 8

    Variants {
        model: Quickshell.screens

        PanelWindow {
            id: window

            required property var modelData
            screen: modelData

            readonly property var apps: Config.data.apps
            readonly property int length: (Config.data.iconSize + root.iconGap) * apps.length
            readonly property int breadth: Config.data.iconSize * ((Config.data.scaleFactor ?? 0.3) + 0.775)
            readonly property int debounce: 200

            // ── fullscreen auto-hide ──────────────────────────────
            readonly property bool fullscreen: HyprClients.currentWorkspaceFullScreen
            readonly property bool revealed: !fullscreen || edgeArmed

            property bool edgeArmed: false
            readonly property int edgeDwellMs: 1000

            anchors { left: false; right: false; top: false; bottom: true }

            implicitWidth: length + 500
            implicitHeight: Math.max(breadth, glass.expandedHeight)
            color: "transparent"

            exclusionMode: ExclusionMode.Ignore
            WlrLayershell.namespace: "quickshell:dock"

            // Only get above a fullscreen window when there is one. The rest of
            // the time stay on Top so a notification daemon on Overlay wins.
            WlrLayershell.layer: fullscreen ? WlrLayer.Overlay : WlrLayer.Top

            // ── hover intent ───────────────────────────────────────
            readonly property int dwellMs: Config.data.dockDwell
            readonly property int graceMs: 80

            property bool dockExpanded: false
            property int pendingIndex: -1

            Timer {
                id: dwellTimer
                interval: window.dwellMs
                repeat: false
                onTriggered: {
                    window.dockExpanded = true;
                    row.current = window.pendingIndex;
                    window.expand(window.pendingIndex);
                }
            }

            Timer {
                id: graceTimer
                interval: window.graceMs
                repeat: false
                property int fromIndex: -1
                onTriggered: {
                    window.dockExpanded = false;
                    row.current = -1;
                    window.collapse(fromIndex);
                }
            }

            Timer {
                id: reveal
                interval: window.edgeDwellMs
                repeat: false
                onTriggered: window.edgeArmed = true
            }

            function hoverEnter(index) {
                graceTimer.stop();
                pendingIndex = index;
                if (dockExpanded) {
                    dwellTimer.stop();
                    row.current = index;
                    expand(index);
                } else {
                    dwellTimer.restart();
                }
            }

            function hoverLeave(index) {
                if (pendingIndex === index) {
                    dwellTimer.stop();
                    pendingIndex = -1;
                }
                if (row.current === index)
                    graceTimer.fromIndex = index, graceTimer.restart();
            }

            function hoverReset() {
                dwellTimer.stop();
                graceTimer.stop();
                pendingIndex = -1;
                dockExpanded = false;
                row.current = -1;
                collapse();
            }

            // Collapsed this is a 2px trigger strip. Open it covers the whole
            // dock. One item, so growing it never fires a spurious exit.
            Item {
                id: dockZone
                anchors { horizontalCenter: parent.horizontalCenter; bottom: parent.bottom }
                width: row.width
                height: window.revealed ? window.height : (window.fullscreen ? 1 : 0)

                HoverHandler {
                    id: zoneHover
                    onHoveredChanged: {
                        console.log("hello")
                        console.log(window.fullscreen)
                        if (zoneHover.hovered) {
                            reveal.restart();
                        } 
                        else {
                            reveal.stop();
                            if (!window.fullscreen)
                                window.edgeArmed = false;
                        }
                    }
                }
            }

            mask: Region {
                item: glass
                regions: [
                    Region { item: dockZone },
                    Region {
                        x: row.x
                        y: row.y
                        width: window.revealed ? row.width : 0
                        height: window.revealed ? row.height : 0
                    }
                ]
            }

            onRevealedChanged: if (!revealed) hoverReset()

            function setExpanded(expanded, startIndex) {
                const from = startIndex ?? row.current;
                glass.delay(expanded ? glass.expandedHeight : 0, from);
                for (let i = 0; i < repeater.count; i++) {
                    const item = repeater.itemAt(i);
                    if (item)
                        item.delay(expanded ? Config.data.iconSize / 4 + root.iconGap : 0, from);
                }
            }
            function expand(startIndex) { setExpanded(true, startIndex); }
            function collapse(startIndex) { setExpanded(false, startIndex); }

            QsWidgets.LiquidGlass {
                id: glass

                anchors.horizontalCenter: parent.horizontalCenter
                anchors.bottom: parent.bottom

                property int horizontalPadding: 10
                width: row.width + horizontalPadding * 2

                property int expandedHeight: Config.data.iconSize + root.iconGap + 8
                property int additionalHeight: 0
                height: additionalHeight

                Timer {
                    id: glassTimer
                    repeat: false
                    property int pendingHeight: 0
                    onTriggered: glass.additionalHeight = pendingHeight
                }

                function delay(h, latestIndex) {
                    glassTimer.pendingHeight = h;
                    glassTimer.interval = h ? debounce - 150 : Math.max(latestIndex, repeater.count - 1 - latestIndex) * 25;
                    glassTimer.restart();
                }
            }

            Grid {
                id: row

                visible: window.revealed

                columns: window.apps.length
                rows: 1
                spacing: 1

                horizontalItemAlignment: Grid.AlignHCenter
                verticalItemAlignment: Grid.AlignBottom

                anchors.bottom: parent.bottom
                anchors.horizontalCenter: parent.horizontalCenter

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
