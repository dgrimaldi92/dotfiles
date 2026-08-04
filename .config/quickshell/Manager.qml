import Quickshell
import QtQuick
import Qt.labs.folderlistmodel
import QtQuick.Layouts

import "widgets" as QsWidgets
import qs.singletons
// usr/bin/qs -p /home/dav/.config/quickshell/Manager.qml

FloatingWindow {
    visible: true
    // QS_PATH="file:///home/dav/pCloudDrive" qs -p .config/quickshell/Manager.qml
    readonly property string path: Quickshell.env("QS_PATH")
    
    Component.onCompleted: console.log(`path_manager: ${path}`)
	color: "transparent" // opaque surface format (see notes above)
	ListView {
		width: screen.width
		height: screen.height
	}

	FolderListModel{
		id: folderModel
		folder: path
		sortField: FolderListModel.Name
		// nameFilters: ["*.qml"]

	}

	FlexboxLayout {
		id: fileDelegate
		anchors.fill: parent
		anchors.topMargin: 32 
		direction: FlexboxLayout.Column
		wrap: FlexboxLayout.Wrap
		gap: 10 
		Repeater {
			model: folderModel
			QsWidgets.DesktopItem { name: fileBaseName; suffix: fileSuffix; isDir: fileIsDir; isFloating: true }
		}
	}
}
