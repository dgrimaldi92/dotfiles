-- Omarchy Hyprland setup: helpers, defaults, and current theme overrides.

require("hypr.omarchy.helpers")

-- Use Omarchy defaults, but don't edit these directly.
require("hypr.omarchy.autostart")
require("hypr.omarchy.envs")
require("hypr.omarchy.looknfeel")
require("hypr.omarchy.input")
require("hypr.omarchy.windows")
require("hypr.omarchy.plain-bindings")

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

		rounding = 14, -- glass panels are rounder
		active_opacity = 0.92, -- translucency is what sells "liquid"
		inactive_opacity = 0.85,
		dim_inactive = true,
		dim_strength = 0.1,

		blur = {
			enabled = true,
			size = 8, -- smaller size + passes = tighter, glassier
			passes = 3,
			brightness = 1.15,
			contrast = 0.9, -- slightly lower = milkier glass
			vibrancy = 0.45, -- this is the iridescence knob, 0.2 is subtle
			vibrancy_darkness = 0.3,
			noise = 0.02, -- frosted grain, key to the Apple look
			new_optimizations = true,
			ignore_opacity = true, -- blur shows through translucent windows
			xray = false,
			popups = true, -- blur menus/tooltips too
			special = true, -- blur special workspace
		},

		shadow = {
			enabled = true,
			range = 24,
			render_power = 3,
			color = "rgba(1a1b26ee)", -- soft, diffuse depth
		},
	},
})
