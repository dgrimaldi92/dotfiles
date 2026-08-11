import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
import Qt.labs.folderlistmodel

import "widgets" as QsWidgets

PanelWindow {
    id: root

    WlrLayershell.layer: WlrLayer.Background
    exclusionMode: ExclusionMode.Ignore
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"

    property int cellW: 90
    property int cellH: 75
    property int gap: 10

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

    FolderListModel {
        id: folderModel
        folder: "file:///home/dav/pCloudDrive"
        sortField: FolderListModel.Name
        showDirsFirst: true
    }

    Item {
        id: field
        anchors.fill: parent
        anchors.topMargin: 32

        readonly property int stepX: root.cellW + root.gap
        readonly property int stepY: root.cellH + root.gap
        readonly property int rows: Math.max(1, Math.floor(height / stepY))

        Repeater {
            model: folderModel

            Item {
                id: slot

                readonly property string key: filePath
                readonly property int slotIndex: index
                property bool placed: false

                width: root.cellW
                height: root.cellH
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

                // field.height is 0 during completion and changes on resize
                Connections {
                    target: field
                    function onRowsChanged() { slot.layoutDefault() }
                }

                QsWidgets.DesktopItem {
                    anchors.fill: parent
                    name: fileBaseName
                    suffix: fileSuffix
                    isDir: fileIsDir
                    path: filePath
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
