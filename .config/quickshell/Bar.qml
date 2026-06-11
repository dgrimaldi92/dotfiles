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

            QsWidgets.ClockWidget {
                anchors.centerIn: parent

                // no more time binding
            }
            // QsWidgets.CpuWidget {
            //     anchors.centerIn: parent
            // }
            QsWidgets.Power {
                anchors.centerIn: parent
            }
        }
    }
}
