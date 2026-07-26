hl.permission("/usr/(bin|local/bin)/hyprpm", "plugin", "allow")
hl.config({
	plugin = {
		hyprbars = {
			bar_height = 28,
			bar_color = "rgba(6f639640)", -- ~25% alpha, blur does the rest
			["col.text"] = "rgba(ffffffee)",
			bar_text_size = 11,
			-- bar_text_font = "Inter Medium", -- or your UI font
			bar_text_align = "left", -- macOS-style; drop for centered
			bar_blur = true,
			bar_part_of_window = true, -- bar inherits window rounding/shadow
			bar_precedence_over_border = true,
			bar_padding = 10,
			bar_button_padding = 6,
			icon_on_hover = true,
			on_double_click = "hyprctl eval 'hl.dispatch(hl.dsp.window.float()); hl.dispatch(hl.dsp.window.center())'",
		},
	},
})
-- icons at https://www.nerdfonts.com/cheat-sheet "nf-md-"
hl.plugin.hyprbars.add_button({
	bg_color = "rgb(f7768e)",
	fg_color = "rgb(1a1b26)",
	size = 14,
	icon = "",
	action = "hyprctl dispatch 'hl.dsp.window.close()'",
})

hl.plugin.hyprbars.add_button({
	bg_color = "rgb(9ece6a)",
	fg_color = "rgb(1a1b26)",
	size = 14,
	icon = "󰧑",
	action = "omarchy-hyprland-window-bar-pop",
})

hl.plugin.hyprbars.add_button({
	bg_color = "rgb(e0af68)",
	fg_color = "rgb(1a1b26)",
	size = 14,
	icon = "󰏩",
	action = "hyprctl eval 'hl.dsp.window.float({ action = \"toggle\" })'",
})
