# hyprland setup — arch linux (omarchy structure)

    needs to install all /bin/bash file before starting. they are located in .local/bin. 
    chmod +x ~/.local/bin/*
---

## architecture overview

```
your config (keybindings.lua, autostart.lua, ...)
    ↓ calls
o.*()          ← omarchy's lua abstraction layer (helpers.lua)
    ↓ calls
hl.*()         ← hyprland's native lua api
    ↓
hyprland internals
```
---
## sending hyper notification

hl.dispatch

---

## dependencies

### core (already in arch `base`)
| package | provides |
|---|---|
| `systemd` | `systemctl` |
| `dbus` | `dbus-update-activation-environment` |

### must install manually
| package | purpose | install |
|---|---|---|
| `hyprpolkitagent` | gui sudo popups (needed by file managers, package managers, etc.) | `pacman -s hyprpolkitagent` |
| `fnott` | notification daemon (wayland-native) | `pacman -s fnott` |
| `quickshell` | status bar | `pacman -s quickshell` |
| `quickshell` | wallpaper | `pacman -s quickshell` |
| `uwsm uwsm-app` | session manager (wraps app launches) | `pacman -s uwsm uwsm-app` |
| `wireplumber` | for audio manager | `sudo pacman -S wireplumber pipewire pipewire-alsa wiremix alsa-utils ` |
---

**other packages**: qutebrowser,bluetui,wiremix, ghostyy, yazi, nvim, lib32-nvidia-utils, btop, lm_sensors, impala

**optional**: upower, retroarch, heroic-games-launcher-bin
