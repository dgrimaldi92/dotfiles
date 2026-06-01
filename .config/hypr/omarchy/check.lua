-- ~/check-hypr.lua — load the Hyprland Lua config without the compositor.
-- Run on the Arch box:   lua ~/check-hypr.lua
local home = assert(os.getenv("HOME"))

-- 1) Resolve require("hypr.omarchy.*") against ~/.config, like Hyprland does.
package.path = table.concat({
	home .. "/.config/?.lua",
	home .. "/.config/?/init.lua",
	package.path,
}, ";")

-- 2) Fake Hyprland's native `hl` API: every access/call returns the same stub,
--    so hl.env(...), hl.config{...}, hl.dsp.exec_cmd(...), hl.on(...) all no-op.
local stub = setmetatable({}, {
	__index = function(t)
		return t
	end,
	__call = function(t)
		return t
	end,
})
_G.hl = stub
_G.o = nil -- helpers.lua creates the global `o`

-- 3) Load each module main.lua loads, in order. Report the first failure
--    with a full traceback. KEEP THIS LIST IN SYNC WITH YOUR main.lua.
local steps = {
	"hypr.omarchy.helpers",
	"hypr.omarchy.autostart",
	"hypr.omarchy.bindings.clipboard",
	"hypr.omarchy.bindings.tiling-v2",
	"hypr.omarchy.envs",
	"hypr.omarchy.looknfeel",
	"hypr.omarchy.input",
	"hypr.omarchy.windows",
}

for _, mod in ipairs(steps) do
	io.write(("loading %-34s "):format(mod))
	local ok, err = xpcall(require, debug.traceback, mod)
	print(ok and "OK" or "FAILED")
	if not ok then
		print("\n" .. err)
		os.exit(1)
	end

	-- Right after helpers: dump what `o` actually provides. This instantly shows
	-- whether o.launch_on_start / o.exec_on_start exist on THIS machine.
	if mod == "hypr.omarchy.helpers" then
		local names = {}
		for k, v in pairs(_G.o or {}) do
			names[#names + 1] = k .. "(" .. type(v) .. ")"
		end
		table.sort(names)
		print("  o.* = " .. table.concat(names, ", "))
	end
end
print("\nAll modules loaded — no Lua errors.")
