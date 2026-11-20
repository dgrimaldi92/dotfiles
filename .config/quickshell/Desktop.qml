import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
import Qt.labs.folderlistmodel

import "widgets" as QsWidgets

PanelWindow {
    id: root

    readonly property string driveRoot: Quickshell.env("HOME") + "/pCloudDrive"
    property bool driveMounted: false
    WlrLayershell.layer: WlrLayer.Background
    exclusionMode: ExclusionMode.Ignore
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    

    property int cellW: 90
    property int cellH: 75
    property int gap: 2 

    // ---- persistence -------------------------------------------------
    FileView {
        id: stateFile
        path: Quickshell.statePath("desktop-icons.json")
        printErrors: false
        onLoadFailed: err => {
            if (err === FileViewError.FileNotFound) writeAdapter()
        }
        JsonAdapter {
            id: iconState
            property var positions: ({})   // { "/path/to/file": { x, y } }
        }
    }

    function savedPos(key) {
        return iconState.positions[key] ?? null
    }

    function storePos(key, px, py) {
        // copy, don't mutate in place — var props don't notify on mutation
        const next = Object.assign({}, iconState.positions)
        next[key] = { x: Math.round(px), y: Math.round(py) }
        iconState.positions = next
        stateFile.writeAdapter()
    }

    // ── Mount check runs regardless of LazyLoader state ──
    Process {
        id: mountCheck
        command: ["mountpoint", "-q", root.driveRoot]
        onExited: exitCode => {
            root.driveMounted = (exitCode === 0)
        }
    }

    Timer {
        interval: 5000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            mountCheck.running = true
        }
    }

    // ── Icon grid — loads in background, then attaches to visual tree ──
    LazyLoader {
        id: iconGridLoader
        loading: true
        onActiveChanged: {
            if (active && iconGridLoader.item) {
                // LazyLoader keeps content in memory — attach it to the visual tree
                const iconGrid = iconGridLoader.item
                iconGrid.parent = root.contentItem
                iconGrid.anchors.fill = root.contentItem
                iconGrid.anchors.topMargin = 32
            }
        }

        Item {
            id: field
            anchors.topMargin: 32

            readonly property int stepX: root.cellW + root.gap
            readonly property int stepY: root.cellH + root.gap
            readonly property int rows: Math.max(1, Math.floor(height / stepY))

            FolderListModel {
                id: folderModel
                folder: root.driveMounted
                    ? "file://" + root.driveRoot
                    : "file://" + Quickshell.env("HOME")
                sortField: FolderListModel.Name
                showDirsFirst: true
            }

            ScriptModel {
                id: iconModel
                values: {
                    const arr = []
                    for (let i = 0; i < folderModel.count; i++) {
                        arr.push({
                            filePath: folderModel.get(i, "filePath"),
                            fileBaseName: folderModel.get(i, "fileBaseName"),
                            fileSuffix: folderModel.get(i, "fileSuffix"),
                            fileIsDir: folderModel.get(i, "fileIsDir")
                        })
                    }
                    return arr
                }
            }

            Repeater {
                model: iconModel.values

                Item {
                    id: slot

                    readonly property string key: modelData["filePath"]
                    readonly property int slotIndex: index
                    property bool placed: false

                    width: root.cellW - 10
                    height: root.cellH - 10
                    z: dragHandler.active ? 10 : 0

                    function layoutDefault() {
                        if (placed) return
                        x = Math.floor(slotIndex / field.rows) * field.stepX
                        y = (slotIndex % field.rows) * field.stepY
                    }

                    Component.onCompleted: {
                        const s = root.savedPos(key)
                        if (s) { placed = true; x = s.x; y = s.y }
                        else layoutDefault()
                    }

                    Connections {
                        target: field
                        function onRowsChanged() { slot.layoutDefault() }
                    }

                    QsWidgets.DesktopItem {
                        anchors.fill: parent
                        name: modelData.fileBaseName
                        suffix: modelData.fileSuffix
                        isDir: modelData.fileIsDir
                        path: modelData.filePath
                    }

                    DragHandler {
                        id: dragHandler
                        target: slot
                        xAxis.minimum: 0
                        xAxis.maximum: field.width - slot.width
                        yAxis.minimum: 0
                        yAxis.maximum: field.height - slot.height

                        onActiveChanged: {
                            if (active) return
                            slot.x = Math.round(slot.x / field.stepX) * field.stepX
                            slot.y = Math.round(slot.y / field.stepY) * field.stepY
                            slot.placed = true
                            root.storePos(slot.key, slot.x, slot.y)
                        }
                    }
                }
            }
        }
    }
}
