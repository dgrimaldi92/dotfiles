local WIN_STEP = 0.1015789634
local WIN_PTS = {
	0.000,
	0.024,
	0.049,
	0.073,
	0.097,
	0.131,
	0.167,
	0.204,
	0.240,
	0.277,
	0.313,
	0.350,
	0.386,
	0.436,
	0.491,
	0.547,
	0.602,
	0.658,
	0.713,
	0.769,
	0.824,
	0.880,
	0.935,
	0.991,
	1.046,
	1.102,
	1.157,
	1.212,
	1.268,
	1.323,
	1.379,
	1.434,
	1.490,
	1.545,
	1.601,
	1.656,
	1.712,
	1.767,
	1.823,
	1.937,
}

local GAIN = 3.8 -- tune 3.0–4.5 by feel

local pts = {}
for i, y in ipairs(WIN_PTS) do
	pts[i] = string.format("%.5f", y * GAIN)
end

hl.device({
	name = "razer-razer-deathadder-v2",
	accel_profile = "custom " .. WIN_STEP .. " " .. table.concat(pts, " "),
})

hl.config({
	input = {
		sensitivity = 0.0,
		force_no_accel = false, -- leave this off; flat profile is the correct knob
	},

	cursor = {
		no_hardware_cursors = false,
		use_cpu_buffer = true, -- the NVIDIA fix
		hide_on_key_press = true,
		warp_on_change_workspace = 1,
	},

	misc = {
		vrr = 2, -- stays numeric, not a bool
	},
})
