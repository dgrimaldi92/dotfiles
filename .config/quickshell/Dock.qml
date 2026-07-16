// Dock.qml
// macOS-style floating bottom dock for Quickshell / Hyprland
//
// Drop both files into your Quickshell config directory, then add to shell.qml:
//   Dock {}
//
// Icon theme: set your system icon theme so image://icon/ resolves correctly.
//   e.g. gsettings set org.gnome.desktop.interface icon-theme "Papirus-Dark"
//   or via nwg-look / lxappearance.

import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import "widgets" as QsWidgets

PanelWindow {
    id: root

    // ── Layer shell ───────────────────────────────────────────────────────────
    WlrLayerShell.layer: WlrLayer.Top
    WlrLayerShell.keyboardFocus: WlrKeyboardFocus.None

    // ExclusionMode.Auto  → reserve space at bottom (windows won't overlap dock)
    // ExclusionMode.Ignore → floating overlay (windows slide under)
    exclusionMode: ExclusionMode.Auto

    // Anchor only to bottom: Hyprland will centre the window horizontally
    anchors {
        bottom: true
        left: false
        right: false
        top: false
    }

    // ── Sizing ────────────────────────────────────────────────────────────────
    // Panel is exactly as wide as the pill background; height accommodates
    // magnified icons (maxIconSize) + padding + the running dot row.
    readonly property int baseIconSize: 52
    readonly property int maxIconSize: 80
    readonly property int dockPadding: 10
    readonly property int iconSpacing: 8
    readonly property int bottomMargin: 6   // gap from screen edge

    implicitWidth: dockPill.width
    implicitHeight: maxIconSize + dockPadding * 2 + 10

    color: "transparent"

    // ── Mouse tracking ────────────────────────────────────────────────────────
    // A transparent MouseArea covers the whole panel so we can pass a single
    // globalMouseX value to every DockIcon for magnification math.
    property real globalMouseX: -9999

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton
        propagateComposedEvents: true

        onPositionChanged: mouse => {
            root.globalMouseX = mouse.x;
        }
        onExited: () => {
            root.globalMouseX = -9999;
        }
    }

    // ── App list ─────────────────────────────────────────────────────────────
    // icon: XDG icon name from your active icon theme
    // exec: command forwarded to `hyprctl dispatch exec`
    property var apps: [
        {
            name: "Browser",
            icon: "󰌀",
            exec: "brave-origin"
        },
        {
            name: "Terminal",
            icon: "",
            exec: "ghostty"
        },
        {
            name: "Neovim",
            icon: "",
            exec: "ghostty -e nvim"
        },
        // {
        //     name: "Files",
        //     icon: "system-file-manager",
        //     exec: "thunar"
        // },
        {
            name: "WhatsApp",
            icon: "󰖣",
            exec: "zapzap"
        },
        {
            name: "Xmind",
            icon: "",
            exec: "xmind"
        },
    ]

    // ── Background pill ───────────────────────────────────────────────────────
    // Outer glow halo — soft blue-purple corona behind the pill
    Rectangle {
        id: dockGlow
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: root.bottomMargin - 5

        width: dockPill.width + 28
        height: dockPill.height + 18
        radius: (dockPill.height + 18) / 2

        color: "transparent"
        border.color: Qt.rgba(0.48, 0.63, 0.97, 0.06)  // #7aa2f7 at 6%
        border.width: 9
    }

    Rectangle {
        id: dockPill
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: root.bottomMargin

        width: iconRow.implicitWidth + root.dockPadding * 2
        height: root.baseIconSize + root.dockPadding * 2
        radius: height / 2

        // Liquid glass: keep alpha very low — Hyprland blur fills the rest.
        // Top band: specular white (light hitting glass rim)
        // Mid band: faint blue-purple glass tint (Tokyo Night)
        // Bottom band: slightly denser dark base
        gradient: Gradient {
            GradientStop {
                position: 0.00
                color: Qt.rgba(1.00, 1.00, 1.00, 0.13)
            }
            GradientStop {
                position: 0.30
                color: Qt.rgba(0.10, 0.08, 0.22, 0.07)
            }
            GradientStop {
                position: 1.00
                color: Qt.rgba(0.05, 0.04, 0.12, 0.16)
            }
        }

        // Prismatic rim — blue tint instead of neutral white
        border.color: Qt.rgba(0.48, 0.63, 0.97, 0.22)  // #7aa2f7 at 22%
        border.width: 1

        // 1px specular top-edge line — mimics light catching the glass lip
        Rectangle {
            anchors.top: parent.top
            anchors.topMargin: 1
            anchors.horizontalCenter: parent.horizontalCenter
            width: parent.width - 28
            height: 1
            radius: 1
            color: Qt.rgba(1.0, 1.0, 1.0, 0.45)
        }

        // Inner rim — secondary depth ring
        Rectangle {
            anchors.fill: parent
            anchors.margins: 1
            radius: parent.radius - 1
            color: "transparent"
            border.color: Qt.rgba(1.0, 1.0, 1.0, 0.05)
            border.width: 1
        }
    }

    // ── Icon row ──────────────────────────────────────────────────────────────
    Row {
        id: iconRow
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: root.dockPadding + root.bottomMargin
        spacing: root.iconSpacing

        Repeater {
            model: root.apps

            QsWidgets.DockIcon {
                required property var modelData
                required property int index

                appName: modelData.name
                iconName: modelData.icon
                exec: modelData.exec

                baseSize: root.baseIconSize
                maxSize: root.maxIconSize
                magnifyRadius: 140.0
                mouseXInDock: root.globalMouseX

                // itemCenterX: icon centre in panel coordinates
                // x is relative to iconRow; we add iconRow.x to get panel coords
                itemCenterX: iconRow.x + x + width / 2
            }
        }
    }
}
