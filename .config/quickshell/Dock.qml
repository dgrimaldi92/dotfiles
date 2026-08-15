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
            readonly property bool revealed: !fullscreen || edgeHover.hovered

            anchors { left: false; right: false; top: false; bottom: true }

            implicitWidth: length + 500
            implicitHeight: Math.max(breadth, glass.expandedHeight)
            color: "transparent"

            exclusionMode: ExclusionMode.Ignore
            WlrLayershell.namespace: "quickshell:dock"

            // A fullscreen window stacks above `top`, so it wins the pointer over
            // anything on that layer. Only escalate while fullscreen, so a
            // notification daemon on Overlay still covers the dock the rest of the time.
            WlrLayershell.layer:  WlrLayer.Overlay

            HoverHandler { id: edgeHover }


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

            function hoverEnter(index) {
                graceTimer.stop();              // still inside the dock
                pendingIndex = index;
                if (dockExpanded) {             // already open → follow the cursor instantly
                    dwellTimer.stop();
                    row.current = index;
                    expand(index);
                } else {
                    dwellTimer.restart();       // wait for the pointer to settle
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


            // 1px trigger strip, only while fullscreen
            Item {
                id: hotzone
                anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
                height: window.fullscreen ? 1 : 0
            }

            mask: Region {
                item: glass                    // height 0 when collapsed → contributes nothing
                regions: [
                    Region { item: hotzone },  // height 0 when not fullscreen → ditto
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
                    glassTimer.interval = h ? debounce : Math.max(latestIndex, repeater.count - 1 - latestIndex) * 25;
                    glassTimer.restart();
                }
            }

            Grid {
                id: row

                visible: window.revealed       // don't draw over fullscreen content

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
