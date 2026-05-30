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

hl.config({
	general = {
		["col.active_border"] = "rgba(" .. c.accent .. "ee) rgba(" .. c.color5 .. "ee) 45deg",
		["col.inactive_border"] = "rgba(" .. c.color0 .. "aa)",
		-- ...
	},
	decoration = {
		shadow = { color = "rgba(" .. c.background:sub(1, 6) .. "ee)" },
		-- ...
	},
	-- etc.
})
