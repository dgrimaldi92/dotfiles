pragma ComponentBehavior: Bound

import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import qs.singletons

Scope {
    id: scope

    property bool open: false 

    IpcHandler {
        target: "overview"
        function toggle(): void { scope.open = !scope.open; }
        function close(): void { scope.open = false; }
        function open(): void { scope.open = true; }
    }

        // Start Hover functionality
    // PanelWindow {
    //     id: hotEdge
    //     visible: !scope.open
    //
    //     anchors { top: true; left: true; right: true }
    //     implicitHeight: 3
    //     exclusionMode: ExclusionMode.Ignore
    //     color: "transparent"
    //
    //     WlrLayershell.layer: WlrLayer.Overlay
    //     WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
    //     WlrLayershell.namespace: "quickshell:overview-hotedge"
    //
    //     // Only fires again once the pointer has genuinely left the edge.
    //     property bool armed: true
    //
    //     Item {
    //         anchors.fill: parent
    //
    //         HoverHandler {
    //             id: hover
    //             onHoveredChanged: {
    //                 if (!hovered) {
    //                     dwell.stop();
    //                     if (!scope.open)
    //                         hotEdge.armed = true;
    //                 } else if (hotEdge.armed && !scope.open) {
    //                     dwell.restart();
    //                 }
    //             }
    //         }
    //     }
    //
    //     Timer {
    //         id: dwell
    //         interval: 500
    //         onTriggered: {
    //             if (!hover.hovered || scope.open)
    //                 return;
    //             hotEdge.armed = false;
    //             scope.open = true;
    //         }
    //     }
    // }
        // End Hover functionality


    PanelWindow {
        id: root
        visible: scope.open

        // ── tunables ────────────────────────────────────────────────
        readonly property int rows: 1
        readonly property int columns: 5
        readonly property real previewScale: 0.18
        readonly property real gap: 10

        anchors { top: true; bottom: true; left: true; right: true }
        exclusionMode: ExclusionMode.Ignore
        color: "#cc11111b"

        WlrLayershell.layer: WlrLayer.Overlay
        WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive

        readonly property HyprlandMonitor monitor: Hyprland.monitorFor(root.screen)
        readonly property var mon: HyprData.monitors.find(m => m.id === root.monitor?.id) ?? null

        // Logical monitor size minus bars, scaled down.
        readonly property real tileW: Math.round((root.monitor.width / root.monitor.scale
            - (mon?.reserved?.[0] ?? 0) - (mon?.reserved?.[2] ?? 0)) * root.previewScale)
        readonly property real tileH: Math.round((root.monitor.height / root.monitor.scale
            - (mon?.reserved?.[1] ?? 0) - (mon?.reserved?.[3] ?? 0)) * root.previewScale)

        // Workspace under the cursor mid-drag; -1 = none.
        property int dropTarget: -1

        function cellX(wsId) { return ((wsId - 1) % root.columns) * (root.tileW + root.gap); }
        function cellY(wsId) { return Math.floor((wsId - 1) / root.columns) * (root.tileH + root.gap); }

        onVisibleChanged: if (visible) HyprData.refresh()

        Item {
            anchors.fill: parent
            focus: root.visible
            Keys.onEscapePressed: scope.open = false

            MouseArea {
                anchors.fill: parent
                onClicked: scope.open = false
            }

            Keys.onPressed: event => {
                console.log(event.key)
            }

            Item {
                id: grid
                anchors.centerIn: parent
                width: root.columns * root.tileW + (root.columns - 1) * root.gap
                height: root.rows * root.tileH + (root.rows - 1) * root.gap

                // ── workspace tiles ─────────────────────────────────
                Repeater {
                    model: root.rows * root.columns

                    Rectangle {
                        id: tile
                        required property int index
                        readonly property int wsId: index + 1

                        x: root.cellX(wsId)
                        y: root.cellY(wsId)
                        width: root.tileW
                        height: root.tileH
                        radius: 12
                        color: "#1e1e2e"
                        border.width: 2
                        border.color: root.dropTarget === tile.wsId ? "#89b4fa"
                                    : root.monitor?.activeWorkspace?.id === tile.wsId ? "#585b70"
                                    : "transparent"

                        Text {
                            anchors.centerIn: parent
                            text: tile.wsId
                            color: "#313244"
                            font.pixelSize: 28 
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            onClicked: {
                                scope.open = false;
                                Hyprland.dispatch(`hl.dsp.focus({ workspace = '${tile.wsId}' })`);
                            }
                        }

                        DropArea {
                            anchors.fill: parent
                            onEntered: root.dropTarget = tile.wsId
                            onExited: if (root.dropTarget === tile.wsId) root.dropTarget = -1
                        }
                    }
                }

                // ── windows: one flat layer over the whole grid ─────
                Repeater {
                    // ScriptModel diffs instead of rebuilding, so previews
                    // survive a HyprData refresh.
                    model: ScriptModel {
                        values: ToplevelManager.toplevels.values.filter(t => {
                            const d = HyprData.byAddress[`0x${t.HyprlandToplevel.address}`];
                            if (!d || d.monitor !== root.monitor?.id)
                                return false;
                            const id = d.workspace?.id ?? -1;
                            return id >= 1 && id <= root.rows * root.columns;
                        })
                    }

                    delegate: Item {
                        id: win
                        required property var modelData          // Wayland Toplevel

                        readonly property string address: `0x${modelData.HyprlandToplevel.address}`
                        readonly property var winData: HyprData.byAddress[win.address] ?? null
                        property bool dragging: false

                        // Position within the grid = cell offset + window's
                        // monitor-local position, both scaled.
                        readonly property real homeX: root.cellX(win.winData?.workspace?.id ?? 1)
                            + Math.max(0, ((win.winData?.at?.[0] ?? 0) - (root.mon?.x ?? 0)
                                - (root.mon?.reserved?.[0] ?? 0)) * root.previewScale)
                        readonly property real homeY: root.cellY(win.winData?.workspace?.id ?? 1)
                            + Math.max(0, ((win.winData?.at?.[1] ?? 0) - (root.mon?.y ?? 0)
                                - (root.mon?.reserved?.[1] ?? 0)) * root.previewScale)

                        x: homeX
                        y: homeY
                        width: Math.min((win.winData?.size?.[0] ?? 100) * root.previewScale, root.tileW)
                        height: Math.min((win.winData?.size?.[1] ?? 80) * root.previewScale, root.tileH)
                        z: win.dragging ? 999 : 1
                        clip: true

                        Behavior on x {
                            enabled: !win.dragging
                            NumberAnimation { duration: 160; easing.type: Easing.OutCubic }
                        }
                        Behavior on y {
                            enabled: !win.dragging
                            NumberAnimation { duration: 160; easing.type: Easing.OutCubic }
                        }

                        Rectangle {
                            anchors.fill: parent
                            radius: 6
                            color: "#313244"
                        }

                        ScreencopyView {
                            anchors.fill: parent
                            captureSource: root.visible ? win.modelData : null
                            live: true
                        }

                        Rectangle {
                            anchors.fill: parent
                            radius: 6
                            color: dragArea.containsMouse ? "#3089b4fa" : "transparent"
                            border.width: 1
                            border.color: "#45475a"
                        }

                        MouseArea {
                            id: dragArea
                            anchors.fill: parent
                            hoverEnabled: true
                            acceptedButtons: Qt.LeftButton | Qt.MiddleButton
                            drag.target: win

                            onPressed: mouse => {
                                win.dragging = true;
                                win.Drag.source = win;
                                win.Drag.hotSpot.x = mouse.x;
                                win.Drag.hotSpot.y = mouse.y;
                                win.Drag.active = true;
                            }

                            onReleased: {
                                const target = root.dropTarget;
                                win.Drag.active = false;
                                win.dragging = false;
                                root.dropTarget = -1;

                                if (target !== -1 && target !== win.winData?.workspace?.id)
                                    Hyprland.dispatch(`hl.dsp.window.move({ workspace = '${target}', follow = false, window = 'address:${win.address}' })`);

                                // drag.target broke these bindings — restore them.
                                // Next HyprData refresh then animates it into the new cell.
                                win.x = Qt.binding(() => win.homeX);
                                win.y = Qt.binding(() => win.homeY);
                            }

                            onClicked: mouse => {
                                if (mouse.button === Qt.MiddleButton) {
                                    Hyprland.dispatch(`hl.dsp.window.close('address:${win.address}')`);
                                    return;
                                }
                                scope.open = false;
                                Hyprland.dispatch(`hl.dsp.focus({ window = 'address:${win.address}' })`);
                            }
                        }
                    }
                }
            }
        }
    }
}




