pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Layouts
import QtQml.Models
import Quickshell
import Quickshell.Widgets
import Quickshell.Wayland
import Quickshell.Services.Notifications

// Drop-in notification layer.
// Instantiate from shell.qml:  NotificationLayer {}
//
// Adapted to hyprwhspr's stock show_notification(), which sends:
//   critical -> expire_timeout 0  (spec: never expire)
//   normal   -> expire_timeout 5000 + hint transient:true
//               followed by CloseNotification(id) ~5s later
//   app_name -> always "notify-send" (script never passes -a)
Scope {
    id: root

    // ---- tunables ------------------------------------------------------
    property int criticalClamp: 30000    // expire_timeout == 0 -> clamp, not forever
    property int fallbackTimeout: 5000   // expire_timeout <  0 -> "server decides"
    property int maxHistory: 50
    property int cardWidth: 380

    property color bgColor: "#1e1e2e"
    property color fgColor: "#cdd6f4"
    property color dimColor: "#a6adc8"
    property color lowColor: "#585b70"
    property color normalColor: "#89b4fa"
    property color criticalColor: "#f38ba8"

    // ---- history -------------------------------------------------------
    property list<Notification> history: []

    function pushHistory(notif: Notification) {
        const h = root.history.slice();
        h.unshift(notif);
        if (h.length > root.maxHistory)
            h.length = root.maxHistory;
        root.history = h;
    }

    function clearHistory() {
        root.history = [];
    }

    // ---- helpers -------------------------------------------------------

    // Spec: 0 == never expire, negative == server picks. Neither is a
    // literal millisecond value, so both need translating before use.
    function effectiveTimeout(notif: Notification): int {
        if (notif.expireTimeout === 0)
            return root.criticalClamp;
        if (notif.expireTimeout < 0)
            return root.fallbackTimeout;
        return notif.expireTimeout;
    }

    function isTransient(notif: Notification): bool {
        return notif.hints && notif.hints["transient"] === true;
    }

    function urgencyColor(notif: Notification): color {
        switch (notif.urgency) {
        case NotificationUrgency.Critical:
            return root.criticalColor;
        case NotificationUrgency.Low:
            return root.lowColor;
        default:
            return root.normalColor;
        }
    }

    // hyprwhspr is indistinguishable by appName ("notify-send"), so match
    // on the icon path it passes. Adjust to whatever $ICON_PATH resolves to.
    function isHyprwhspr(notif: Notification): bool {
        return !!notif.appIcon && notif.appIcon.indexOf("hyprwhspr") !== -1;
    }

    // ---- server --------------------------------------------------------
    NotificationServer {
        id: server

        imageSupported: true
        actionsSupported: false      // the script sends none
        bodyMarkupSupported: true
        persistenceSupported: true
        keepOnReload: false

        onNotification: notif => {
            notif.tracked = true;
            if (!root.isTransient(notif))
                root.pushHistory(notif);
        }
    }

    // Keeps history entries alive after the sender calls CloseNotification.
    // Non-visual, so Instantiator rather than Repeater.
    Instantiator {
        model: root.history
        delegate: RetainableLock {
            required property Notification modelData
            object: modelData
            locked: true
        }
    }

    // ---- popups --------------------------------------------------------
    // One window per screen. Drop the Variants wrapper for single-monitor.
    Variants {
        model: Quickshell.screens

        PanelWindow {
            id: win
            required property ShellScreen modelData

            screen: win.modelData
            visible: column.children.length > 0

            anchors {
                top: true
                right: true
            }
            margins {
                top: 12
                right: 12
            }

            implicitWidth: root.cardWidth
            implicitHeight: Math.max(1, column.implicitHeight)

            color: "transparent"
            exclusionMode: ExclusionMode.Ignore
            WlrLayershell.layer: WlrLayer.Overlay
            WlrLayershell.keyboardFocus: WlrKeyboardFocus.None

            ColumnLayout {
                id: column
                anchors.fill: parent
                spacing: 8

                Repeater {
                    model: server.trackedNotifications

                    delegate: Rectangle {
                        id: card
                        required property Notification modelData

                        Layout.fillWidth: true
                        implicitHeight: layout.implicitHeight + 20
                        radius: 10
                        color: root.bgColor
                        border.width: 1
                        border.color: root.urgencyColor(card.modelData)
                        opacity: 0

                        Component.onCompleted: opacity = 1
                        Behavior on opacity {
                            NumberAnimation {
                                duration: 140
                            }
                        }

                        // Dismissing untracks it, which removes it from
                        // trackedNotifications and destroys this delegate.
                        Timer {
                            interval: root.effectiveTimeout(card.modelData)
                            running: true
                            onTriggered: card.modelData.expire()
                        }

                        MouseArea {
                            anchors.fill: parent
                            onClicked: card.modelData.dismiss()
                        }

                        RowLayout {
                            id: layout
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 10

                            IconImage {
                                visible: source !== ""
                                source: card.modelData.image || card.modelData.appIcon || ""
                                implicitSize: 32
                                Layout.alignment: Qt.AlignTop
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Text {
                                    Layout.fillWidth: true
                                    text: card.modelData.summary
                                    color: root.fgColor
                                    font.bold: true
                                    font.pixelSize: 13
                                    elide: Text.ElideRight
                                }

                                Text {
                                    Layout.fillWidth: true
                                    visible: text !== ""
                                    text: card.modelData.body
                                    color: root.dimColor
                                    font.pixelSize: 12
                                    wrapMode: Text.WordWrap
                                    maximumLineCount: 4
                                    elide: Text.ElideRight
                                    textFormat: Text.StyledText
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
