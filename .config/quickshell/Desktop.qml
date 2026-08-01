import Quickshell
import Quickshell.Wayland
import QtQuick
import Qt.labs.folderlistmodel


PanelWindow {
	WlrLayershell.layer: WlrLayer.Background
        exclusionMode: ExclusionMode.Ignore
        anchors {
        	top: true
                bottom: true
                left: true
                right: true
        }
	color: "transparent" // opaque surface format (see notes above)
	ListView {
		width: screen.width
		height: screen.height
	}

	FolderListModel{
		id: folderModel
		folder: "file:///home/dav/dotfiles/.config/quickshell/"
		// nameFilters: ["*.qml"]

	}

	Column {
		id: fileDelegate
		// anchors.centerIn: parent
		topPadding: 35
		Repeater {
			model: folderModel
			required property string fileName
			Text { text: fileName; color: "white" }
		}
	}
}
