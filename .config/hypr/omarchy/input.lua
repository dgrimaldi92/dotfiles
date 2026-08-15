-- https://wiki.hypr.land/Configuring/Basics/Variables/#input
hl.env("GTK_IM_MODULE", "simple")
hl.config({
	input = {
		kb_layout = "macus",
		kb_variant = "",
		kb_model = "",
		kb_options = "",
		kb_rules = "",
		follow_mouse = 1,
		sensitivity = 0,

		touchpad = {
			natural_scroll = false,
		},
	},

	misc = {
		key_press_enables_dpms = true,
		mouse_move_enables_dpms = true,
	},
})
