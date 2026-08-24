--------------------------------------------------------------------
-- Windows-style pointer curve for Razer DeathAdder V2
--
-- libinput's custom profile: x = device units/ms, gain = y/x.
-- x is in RAW device units, so the curve is DPI-specific.
-- Scaling step and points together keeps gain-vs-hand-speed
-- invariant, so DPI is the only number to change.
--------------------------------------------------------------------

local DPI = 2400 -- must match the mouse's active onboard stage
local GAIN = 4.23 -- 1/0.2363 -> ~1:1 factor at slow speeds

local REF_DPI = 1000 -- DPI the source curve was generated for
local REF_STEP = 0.1015789634 -- = 3.86/38, Windows' 3rd knee on point 38
local REF_PTS = {
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

local function win_curve(dpi, gain)
	local scale, pts = dpi / REF_DPI, {}
	for i, y in ipairs(REF_PTS) do
		pts[i] = string.format("%.5f", y * scale * gain)
	end
	return string.format("custom %.10f %s", REF_STEP * scale, table.concat(pts, " "))
end

hl.device({
	name = "razer-razer-deathadder-v2",
	accel_profile = win_curve(DPI, GAIN),
})

--------------------------------------------------------------------
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
