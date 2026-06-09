// shell.qml
import QtQuick
import "widgets" as Widgets
import "singletons" as Singeltons

ShellRoot {
    // visible widgets outside Variants/Scope
    Singeltons.Time {}
    Bar {}
    Widgets.GpuWidget {}
    Widgets.CpuWidget {}
    Widgets.ClockWidget {}
}
