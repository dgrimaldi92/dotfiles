import Quickshell
import QtQuick
import QtQuick.Effects
import QtQuick.Layouts
import qs.singletons
import Quickshell.Hyprland

Rectangle {
	property string name
	property string suffix 
	property bool isDir
	property string path
	property bool isFloating
	property int iconSize: 42
	antialiasing: false
	width: 95
	height: 99 
	radius: 10 
	color: Qt.rgba(0,0,0,0.35)

	
	// gradient: "SunnyMorning" 
	gradient: Gradient {
		orientation: Gradient.Vertical
		GradientStop { position: 0.06; color: "#80FFFFFF" }
		GradientStop { position: 0.14; color: "#BF000000" }  // ~75%
		GradientStop { position: 0.30; color: "#CC000000" }  // ~80%
		GradientStop { position: 0.48; color: "#C4000000" }  // ~77%
		GradientStop { position: 0.52; color: "#C4000000" }  // ~77%
		GradientStop { position: 0.75; color: "#CC000000" }  // ~80%
		GradientStop { position: 0.86; color: "#BF000000" }  // ~75%
	}
	transform: Scale {
		origin.x: Config.data.iconSize / 2
		origin.y: Config.data.iconSize / 2
		xScale: itemMouseArea.containsPress ? 0.9 : 1
		yScale: itemMouseArea.containsPress ? 0.9 : 1
	
	}
	MouseArea {
		id: itemMouseArea
		anchors.fill: parent
		hoverEnabled: true
		onClicked: {
			if (isDir) {
				return Quickshell.execDetached({
					command: ["qs", "-p", Quickshell.shellPath("Manager.qml")],
					environment: {"QS_PATH": `file://${path}`}
				})
			}
			switch (suffix){
					case "xmind": 
						return Quickshell.execDetached(["xmind","--ozone-platform=x11", path])
					case "pdf":
						return Quickshell.execDetached(["brave-origin", path])
					case "md":
						return Quickshell.execDetached(["brave-origin", path])
					case "jpg":
					case "png":
						return Quickshell.execDetached(["uwsm-app", "--","brave-origin", path])
					case "docx":
						// return Quickshell.execDetached(["brave-origin", path])
					case "zip":
						// return Quickshell.execDetached(["brave-origin", path])
				}
		}
	}
        FlexboxLayout {
            anchors.top: parent.top
            anchors.horizontalCenter: parent.horizontalCenter
            height: parent.length
	    direction: FlexboxLayout.Column
	    width: parent.width 
	    wrap: FlexboxLayout.Wrap
	    gap: 5
	    Rectangle {
                width: parent.width
                height:iconSize 

                color: "transparent"
	    Text {
                    width: parent.width
                    height: width
		    text: {
			    if (isDir) {
				    return ""
				}
			    switch (suffix){
					case "xmind": 
						return ""
					case "pdf":
						return "󰈦"
					case "md":
						return ""
					case "jpg":
					case "png":
						return ""
					case "docx":
						return ""
					case "zip":
						return ""
				}
			}
                    font.family: "JetBrainsMono Nerd Font"
                    font.pixelSize: iconSize
                    horizontalAlignment: Text.AlignHCenter
                    color: "#eecdb4f8"
        	}
	}

            Rectangle {
                width: parent.width
                height: parent.height - iconSize 

                color: "transparent"
		border.width: 0
		
                Text {
                    width: parent.width
                    text: name 
                    font.family: "JetBrainsMono Nerd Font"
                    font.pixelSize: 10 
                    horizontalAlignment: Text.AlignHCenter
                    color: "#FFFFFF"
		    elide: Text.ElideRight
		    wrapMode: Text.WrapAnywhere 
		    layer.enabled: true

		    layer.effect: MultiEffect {
			shadowEnabled: true
			shadowColor: "#99000000"
			shadowBlur: 0.6
			shadowVerticalOffset: 1
		    }
                }

            }
    	}
    }
