// Wallpaper daemon for Quickshell v0.3.0 (wlroots layer-shell, works on Hyprland).
//
// Performance notes:
//  - image://shared/... (Qt.labs.sharedimage) puts the *decoded* QImage in shared
//    system memory, keyed by file path. Multiple windows/processes reuse one copy
//    instead of each decoding + holding its own buffer.
//  - sourceSize caps the decode to the screen's physical resolution, so a 6000x4000
//    photo doesn't sit in RAM at full size just to fill a 1920x1080 output.
//  - updatesEnabled is false whenever nothing is loading/fading: the window stops
//    receiving render updates entirely (0 GPU cost for a static wallpaper).
//  - color is opaque, so the surface is created opaque and the compositor can
//    skip blending and occlusion-cull everything behind it.

import Quickshell
import Quickshell.Wayland
import Quickshell.Io
import QtQuick
import Qt.labs.sharedimage

ShellRoot {
    id: root

    // Absolute path of the current wallpaper, persisted to disk.
    readonly property string current: state.adapter.path

    FileView {
        id: state
        path: `${Quickshell.env("HOME") + "/.local/state/quickshell"}/wallpaper.json`
        watchChanges: true                 // edit the json externally and it hot-applies
        onFileChanged: reload()
        onAdapterUpdated: writeAdapter()
        onLoadFailed: err => {
            if (err === FileViewError.FileNotFound)
                writeAdapter();
        }

        JsonAdapter {
            property string path: ""
        }
    }

    // $ qs -p <this dir> ipc call wallpaper set /absolute/path.png
    IpcHandler {
        target: "wallpaper"
        function set(path: string): void {
            state.adapter.path = path;
        }
        function get(): string {
            return state.adapter.path;
        }
    }

    Variants {
        model: Quickshell.screens

        PanelWindow {
            id: win
            required property ShellScreen modelData

            screen: modelData
            WlrLayershell.layer: WlrLayer.Background
            WlrLayershell.namespace: "qs-wallpaper"
            exclusionMode: ExclusionMode.Ignore
            anchors {
                top: true
                bottom: true
                left: true
                right: true
            }

            color: "black" // opaque surface format (see notes above)

            // Only render while decoding or crossfading.
            updatesEnabled: fadeA.running || fadeB.running || imgA.status === Image.Loading || imgB.status === Image.Loading

            // --- double-buffered crossfade ---
            property Image live: imgA
            property Image pending: null

            function shared(p: string): string {
                return p ? "image://shared" + p : "";
            }

            function show(path: string): void {
                if (!path)
                    return;
                const next = live === imgA ? imgB : imgA;
                pending = next;
                next.source = shared(path);
                if (next.status === Image.Ready)
                    promote(); // shm cache hit, no async wait
            }

            function promote(): void {
                pending.opacity = 1;
                live.opacity = 0;
                live = pending;
                pending = null;
                // drop the old image's reference so its shm segment can be released
                (live === imgA ? imgB : imgA).source = "";
            }

            Wall {
                id: imgA
                Behavior on opacity {
                    NumberAnimation {
                        id: fadeA
                        duration: 350
                        easing.type: Easing.InOutQuad
                    }
                }
                onStatusChanged: if (status === Image.Ready && win.pending === imgA)
                    win.promote()
            }
            Wall {
                id: imgB
                Behavior on opacity {
                    NumberAnimation {
                        id: fadeB
                        duration: 350
                        easing.type: Easing.InOutQuad
                    }
                }
                onStatusChanged: if (status === Image.Ready && win.pending === imgB)
                    win.promote()
            }

            // react to changes (ipc, file edit) + initial load
            property string target: root.current
            onTargetChanged: show(target)
            Component.onCompleted: if (target)
                show(target)
        }
    }

    component Wall: Image {
        anchors.fill: parent
        asynchronous: true      // decode off the render thread
        cache: false            // shm provider *is* the cache; skip Qt's pixmap cache
        fillMode: Image.PreserveAspectCrop
        opacity: 0
        // decode capped at physical pixels of this output
        sourceSize: Qt.size(win.width * win.devicePixelRatio, win.height * win.devicePixelRatio)
    }
}
