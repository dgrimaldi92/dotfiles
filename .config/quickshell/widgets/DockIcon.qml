// DockIcon.qml
// Individual dock icon with macOS-style magnification
// Requires: Quickshell.Io (Process)
import QtQuick
import QtQuick.Controls
import Quickshell.Io

Item {
    id: root

    // --- Public API ---
    property string appName: ""
    property string iconName: ""   // XDG icon theme name
    property string exec: ""   // command to launch via hyprctl

    property int baseSize: 52
    property int maxSize: 80
    property real magnifyRadius: 130.0   // px radius of magnification influence
    property real mouseXInDock: -9999   // mouse X in dock-panel coordinates
    property real itemCenterX: 0       // this icon's center X in dock-panel coords

    // --- Magnification math ---
    // Distance from pointer to icon center, clamped
    readonly property real _dist: mouseXInDock >= 0 ? Math.abs(mouseXInDock - itemCenterX) : magnifyRadius + 1.0

    // Smooth cosine bell: 1.0 at center, 0.0 at radius edge
    readonly property real _factor: {
        const t = Math.max(0.0, 1.0 - _dist / magnifyRadius);
        return (1.0 - Math.cos(t * Math.PI)) / 2.0;
    }

    readonly property real _targetSize: baseSize + (maxSize - baseSize) * _factor

    // Animated current size — spring physics for that macOS snap feel
    property real currentSize: baseSize
    onTargetSizeChanged: currentSize = _targetSize  // alias for binding clarity
    property real targetSizeAlias: _targetSize
    onTargetSizeAliasChanged: currentSize = _targetSize

    Behavior on currentSize {
        SpringAnimation {
            spring: 8.0
            damping: 0.65
            mass: 1.0
            epsilon: 0.25
        }
    }

    // Icon rises as it grows — the lift matches macOS feel
    readonly property real _lift: _factor * 10.0

    // Fixed slot width prevents the Row from shuffling as icons scale
    width: maxSize
    height: maxSize + 8   // 8px reserved for the running dot

    // --- Process launcher ---
    // Uses hyprctl so the window is properly managed by Hyprland
    Process {
        id: launcher
        command: ["hyprctl", "dispatch", "exec", root.exec]
        running: false
    }

    // --- Icon image ---
    // image://icon/ resolves through Qt's platform theme (XDG icon theme)
    Text {
        id: iconImg
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: runDot.top
        anchors.bottomMargin: 4

        width: root.currentSize
        height: root.currentSize
        y: -root._lift

        text: root.iconName
        font.family: "JetBrainsMono Nerd Font"
        font.pixelSize: root.currentSize
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        color: "white"

        Behavior on y {
            SpringAnimation {
                spring: 8.0
                damping: 0.65
                mass: 1.0
            }
        }

        // Click bounce
        transform: Scale {
            id: clickScale
            origin.x: iconImg.width / 2
            origin.y: iconImg.height / 2
            xScale: 1.0
            yScale: 1.0
        }
    }

    // --- Running indicator dot ---
    // Set opacity: 1 when you wire up an active-window tracker
    Rectangle {
        id: runDot
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        width: 4
        height: 4
        radius: 2
        color: "#c0c0c0"
        opacity: 0
    }

    // --- Click interaction ---
    MouseArea {
        id: mArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor

        onClicked: {
            bounceAnim.start();
            launcher.running = true;
        }
    }

    SequentialAnimation {
        id: bounceAnim
        NumberAnimation {
            target: clickScale
            property: "xScale"
            to: 0.82
            duration: 70
            easing.type: Easing.InQuad
        }
        NumberAnimation {
            target: clickScale
            property: "xScale"
            to: 1.0
            duration: 180
            easing.type: Easing.OutBack
            overshoot: 1.5
        }
    }
    // Keep yScale in sync
    Binding {
        target: clickScale
        property: "yScale"
        value: clickScale.xScale
    }

    // --- Tooltip ---
    ToolTip {
        id: tip
        parent: root
        visible: mArea.containsMouse && !mArea.pressed
        text: root.appName
        delay: 500

        contentItem: Text {
            text: tip.text
            color: "#e8e8e8"
            font.pixelSize: 12
            font.family: "sans-serif"
        }
        background: Rectangle {
            color: Qt.rgba(0.10, 0.10, 0.13, 0.92)
            radius: 6
            border.color: Qt.rgba(1, 1, 1, 0.12)
            border.width: 1
        }
    }
}
