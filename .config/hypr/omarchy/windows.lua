-- See https://wiki.hypr.land/Configuring/Basics/Window-Rules/

o.window(".*", { suppress_event = "maximize" })

-- Tag all windows for default opacity (apps can override with -default-opacity tag).
o.window(".*", { tag = "+default-opacity" })

-- Fix some dragging issues with XWayland.
hl.window_rule({
	match = {
		class = "^$",
		title = "^$",
		xwayland = true,
		float = true,
		fullscreen = false,
		pin = false,
	},
	no_focus = true,
})

-- App-specific tweaks (may remove default-opacity tag).
-- apps/ is an extension-style folder of individual *.lua files, not a single
-- module, so load every file in it (same pattern as bindings.lua).
local paths = require("hypr.omarchy.paths")
local require_all = require("hypr.omarchy.require_all")
require_all.files(paths.config_home .. "/hypr/omarchy/apps", "hypr.omarchy.apps")

-- Apply default opacity after apps have had a chance to opt out.
o.window({ tag = "default-opacity" }, { opacity = "0.97 0.9" })

-- Move the launcher window to the center of the screen
hl.window_rule({
	match = { --[[class = "com.mitchellh.ghostty",]]
		title = "otter-launcher",
	},
	float = true,
})
hl.window_rule({
	match = { --[[class = "com.mitchellh.ghostty",]]
		title = "otter-launcher",
	},
	center = true,
})
hl.window_rule({
	match = { --[[class = "com.mitchellh.ghostty",]]
		title = "otter-launcher",
	},
	size = { 800, 500 },
})
