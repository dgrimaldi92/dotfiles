pragma Singleton
import QtQuick

QtObject {
    id: root

    readonly property QtObject data: QtObject {

        // ── Magnification ──────────────────────────────────────────────
        // How many icon slots the magnification wave spans on each side
        property real falloff: 3

        // Peak scale addition at the hovered icon (e.g. 0.5 = 50% larger)
        property real scaleFactor: 0.6

        // Damping divisor for non-peak icons; higher = sharper drop-off
        property real damp: 1.0

        // ── Layout ─────────────────────────────────────────────────────
        property int iconSize: 48           // base icon px (also drives breadth)
        property string orientation: "horizontal"  // "horizontal" | "vertical"
        property var apps: [
            {
                name: "Browser",
                icon: "󰌀",
                exec: ["brave-origin"]
            },
            {
                name: "Terminal",
                icon: "",
                exec: ["ghostty"]
            },
            {
                name: "Neovim",
                icon: "",
                exec: ["ghostty", "-e", "nvim"]
            },
            // {
            //     name: "Files",
            //     icon: "system-file-manager",
            //     exec: "thunar"
            // },
            {
                name: "WhatsApp",
                icon: "󰖣",
                exec: ["zapzap"]
            },
            {
                name: "Xmind",
                icon: "",
                exec: ["xmind"]
            },
        ]
    }
}
