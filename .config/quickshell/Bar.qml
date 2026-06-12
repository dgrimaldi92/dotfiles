import Quickshell
import "widgets" as QsWidgets

Scope {
    // no more time object

    Variants {
        model: Quickshell.screens

        PanelWindow {
            property var modelData
            screen: modelData

            anchors {
                top: true
                left: true
                right: true
            }

            implicitHeight: 30
            color: "transparent"
            surfaceFormat.opaque: false

            // Background rectangle – glass style
            Rectangle {
                id: background
                anchors.fill: parent
                color: Qt.rgba(ThemeManager.bgBase.r, ThemeManager.bgBase.g, ThemeManager.bgBase.b, 0.70)
                radius: 10
                border.width: 0
                border.color: Qt.rgba(ThemeManager.accentBlue.r, ThemeManager.accentBlue.g, ThemeManager.accentBlue.b, 0.35)
                z: -1

                Behavior on radius {
                    NumberAnimation {
                        duration: 200
                        easing.type: Easing.OutCubic
                    }
                }
                Behavior on border.width {
                    NumberAnimation {
                        duration: 150
                    }
                }

                // Bottom edge accent line — only when docked without a full border
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: 1
                    color: Qt.rgba(ThemeManager.accentBlue.r, ThemeManager.accentBlue.g, ThemeManager.accentBlue.b, 0.35)
                    visible: true
                }

                // Top specular highlight — only when no border is shown
                Rectangle {
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: 1
                    color: Qt.rgba(1, 1, 1, 0.10)
                    visible: true
                }
            }
            // QsWidgets.ClockWidget {
            //     anchors.centerIn: parent
            //
            //     // no more time binding
            // }

            //
            // property alias clockComponent: clockComponent
            // property alias archComponent: archComponent

            // LEFT SECTION
            RowLayout {
                anchors.left: parent.left
                anchors.leftMargin: 8
                anchors.verticalCenter: parent.verticalCenter
                spacing: 8

                // ArchButton {
                //     id: archComponent
                // }
                QsWidgets.CpuWidget {
                    anchors.centerIn: parent
                }
                QsWidgets.Workspace {}
                QsWidgets.Separator {}
            }
            QsWidgets.Clock {
                id: clockComponent
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.verticalCenter: parent.verticalCenter
            }

            // RIGHT SECTION
            Item {
                anchors.right: parent.right
                anchors.rightMargin: bar.floating ? 8 : 4
                anchors.verticalCenter: parent.verticalCenter
                height: parent.height
                width: rightRow.width

                Row {
                    id: rightRow
                    anchors.right: parent.right
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 8

                    QsWidgets.Terminal {}
                }
            }
        }
    }
}
