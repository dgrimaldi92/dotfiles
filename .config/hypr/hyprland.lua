-- Learn how to configure Hyprland: https://wiki.hypr.land/Configuring/Start/

-- Load user modules from ~/.config/hypr
package.path = os.getenv("HOME") .. "/.config/?.lua;" .. package.path

-- All Omarchy default setups
require("hypr.omarchy.main")
require("hypr.hyprbars.main")
require("hypr.quickshell.dock")
-- Change your own setup in these files and override defaults.
-- require("hypr.monitors")
-- require("hypr.input")
-- require("hypr.bindings")
-- require("hypr.looknfeel")
-- require("hypr.autostart")
--
-- Toggle config flags dynamically.
-- require("default.hypr.toggles")

-- Add any other personal Hyprland configuration below.
-- o.window("qemu", { workspace = "5" })

--Nvidia configuration
hl.env("LIBVA_DRIVER_NAME", "nvidia")
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("GBM_BACKEND", "nvidia-drm")
hl.env("__GLX_VENDOR_LIBRARY_NAME", "nvidia")
hl.env("WLR_NO_HARDWARE_CURSORS", "1")
hl.env("AQ_DRM_DEVICES", "/dev/dri/card0")

-- hl.env("AQ_DRM_DEVICES", "/dev/dri/by-path/pci-0000:01:00.0-card:/dev/dri/by-path/pci-0000:10:00.0-card")
hl.env("AQ_DRM_DEVICES", "/dev/dri/card2:/dev/dri/card1")

-- hl.config({ debug = { disable_logs = false, enable_stdout_logs = true, suppress_errors = false, gl_debugging = true } })
