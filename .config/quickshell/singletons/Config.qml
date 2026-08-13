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
                exec: [ "uwsm-app", "--", "brave-origin"],
                class: "brave-origin"
            },
            {
                name: "Terminal",
                icon: "",
                exec: ["ghostty"],
                class: "com.mitchellh.ghostty"
            },
            {
                name: "Neovim",
                icon: "",
                exec: ["setsid", "uwsm-app", "--", "ghostty", "-e", "nvim"],
                class: "nvim"
            },
            {
                name: "ChatGPT",
                icon: "",
                exec: ["omarchy-launch-webapp","https://chatgpt.com"],
                class: "chatgpt"
            },
            // {
            //     name: "Files",
            //     icon: "system-file-manager",
            //     exec: "thunar",
            //     class: ""
            // },     
            {
                name: "WhatsApp",
                icon: "󰖣",
                exec: ["zapzap"],
                class: "com.rtosta.zapzap"
            },
            {
                name: "Xmind",
                icon: "",
                exec: ["xmind","--ozone-platform=x11","--force-device-scale-factor=1.5"],
                class: "Xmind"
            },
            {
                name: "Grok",
                icon: "",
                exec: ["omarchy-launch-webapp","https://grok.com"],
                class: "grok"
            },
            {
                name: "Gmail",
                icon: "󰊫",
                exec: ["omarchy-launch-webapp","https://gmail.com"],
                class: "gmail"
            }, 
            {
                name: "Google Documents",
                icon: "",
                exec: ["omarchy-launch-webapp","https://docs.google.com/document"],
                class: "document"
            },
            {
                name: "Steam",
                icon: "",
                exec: ["uwsm-app", "--", "steam"],
                class: "steam"
            },
            {
                name: "Folder",
                icon: "",
                exec: ["env","QS_APP_ID='file-manager'", "qs", "-p", ".config/quickshell/Manager.qml"],
                class: "file-manager"
            },
            {
                name: "Heroic",
                icon: "󰖺",
                exec: ["uwsm-app", "--", "heroic"],
                class: "heroic"
                
            }
        ]
        // property Gradient glassGradient: Gradient {
        //     orientation: Gradient.Vertical
        //     GradientStop { position: 0.00; color: "#D9FFFFFF" }  // top specular
        //     GradientStop { position: 0.06; color: "#38FFFFFF" }
        //     GradientStop { position: 0.12; color: "#14FFFFFF" }
        //     GradientStop { position: 0.30; color: "#0DB4D2FF" }  // glass body
        //     GradientStop { position: 0.48; color: "#08A0C8FF" }
        //     // GradientStop { position: 0.50; color: "#2EFFFFFF" }  // mid crease
        //     // GradientStop { position: 0.52; color: "#08A0C8FF" }
        //     GradientStop { position: 0.75; color: "#0FB4CDFF" }  // lower body
        //     GradientStop { position: 0.88; color: "#1FC8E1FF" }
        //     GradientStop { position: 0.94; color: "#66FFFFFF" }  // bottom rim
        //     GradientStop { position: 1.00; color: "#0DFFFFFF" }
        // } 
    }
}
