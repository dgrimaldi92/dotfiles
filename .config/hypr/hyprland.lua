-- Learn how to configure Hyprland: https://wiki.hypr.land/Configuring/Start/

-- Load user modules from ~/.config/hypr
package.path = os.getenv("HOME") .. "/.config/?.lua;" .. package.path

-- All Omarchy default setups
require("hypr.omarchy.main")

-- Change your own setup in these files and override defaults.
-- require("hypr.monitors")
-- require("hypr.input")
-- require("hypr.bindings")
-- require("hypr.looknfeel")
-- require("hypr.autostart")

-- Toggle config flags dynamically.
require("default.hypr.toggles")

-- Add any other personal Hyprland configuration below.
-- o.window("qemu", { workspace = "5" })

--Nvidia configuration
hl.env("LIBVA_DRIVER_NAME", "nvidia")
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("GBM_BACKEND", "nvidia-drm")
hl.env("__GLX_VENDOR_LIBRARY_NAME", "nvidia")
hl.env("WLR_NO_HARDWARE_CURSORS", "1")
-- AQ_DRM_DEVICES separates devices with ':', so by-path names (which contain
-- colons) can't be used here. Use cardN names; NVIDIA first = primary GPU.
-- Current mapping: card2 = NVIDIA RTX 4070, card1 = AMD iGPU.
-- NOTE: cardN numbers can swap between boots (nvidia/amdgpu module load order).
-- If displays break after a reboot, re-check with: ls -l /dev/dri/by-path/
hl.env("AQ_DRM_DEVICES", "/dev/dri/card2:/dev/dri/card1")
