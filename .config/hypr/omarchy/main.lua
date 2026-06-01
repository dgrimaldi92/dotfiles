-- Omarchy Hyprland setup: helpers, defaults, and current theme overrides.

require("hypr.omarchy.helpers")

-- Use Omarchy defaults, but don't edit these directly.
require("hypr.omarchy.autostart")
-- require("hypr.omarchy.bindings.media") TODO
require("hypr.omarchy.bindings.clipboard")
require("hypr.omarchy.bindings.tiling-v2")
-- require("hypr.omarchy.bindings.utilities") TODO
require("hypr.omarchy.envs")
require("hypr.omarchy.looknfeel")
require("hypr.omarchy.input")
require("hypr.omarchy.windows")

-- Read color.toml and strip the # prefix, just like {{ variable_strip }}
local function load_colors(path)
	local colors = {}
	local f = io.open(path, "r")
	if not f then
		return colors
	end
	for line in f:lines() do
		local key, hex = line:match('^(%w+)%s*=%s*"#([0-9a-fA-F]+)"')
		if key then
			colors[key] = hex
		end
	end
	f:close()
	return colors
end

local c = load_colors(os.getenv("HOME") .. "/.config/theme/color.toml")

-- Gradients use the table form { colors = {...}, angle = N } under a nested
-- `col = {}` table — NOT a "rgba(..) rgba(..) 45deg" string with a dotted key.
-- The string form is what caused `invalid color`. See looknfeel.lua for the idiom.
hl.config({
	general = {
		col = {
			active_border = { colors = { "rgba(7aa2f7ee)", "rgba(bb9af7ee)" }, angle = 45 },
			inactive_border = "rgba(414868aa)",
		},
	},
	decoration = {
		shadow = { color = "rgba(1a1b26ee)" },
	},
})
