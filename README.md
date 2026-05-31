# hyprland setup — arch linux (omarchy structure)

    needs to install all /bin/bash file before starting. they are located in .local/bin
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
| `mako` `libnotify` | notification daemon (wayland-native) | `pacman -s mako libnotify` |
| `waybar` | status bar | `pacman -s waybar` |
| `swaybg` | wallpaper | `pacman -s swaybg` |
| `uwsm uwsm-app` | session manager (wraps app launches) | `pacman -s uwsm uwsm-app` |

---

other packages: chromium,bluetui,wiremix, chawa, ghostyy, yazi, nvim 
