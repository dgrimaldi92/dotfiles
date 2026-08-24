-- o.launch_on_start("quickshell")
-- o.launch_on_start("ghostty")
-- -- o.exec_on_start("systemctl --user start hyprland-session.target")
-- o.exec_on_start("systemctl --user enable --now hyprpolkitagent.service")
--
-- -- Slow app launch fix -- set systemd vars.
-- o.exec_on_start("sh -c 'pgrep -x pcloudcc >/dev/null || pcloudcc -n -u giulylike@gmail.com -d'")
-- o.exec_on_start("systemctl --user import-environment $(env | cut -d'=' -f 1)")
-- -- o.exec_on_start("systemctl --user enable --now hyprwhspr.service")
-- o.exec_on_start("dbus-update-activation-environment --systemd --all")
-- o.exec_on_start("systemctl --user start pipewire pipewire-pulse wireplumber")
-- o.exec_on_start("systemctl start bluetooth")
-- o.exec_on_start("systemctl start openrazer-daemon")
-- o.exec_on_start("systemctl start hyprwhspr")
--
-- -- o.exec_on_start("hyprpaper") -- sudo pacman -R hyprpaper
--
-- o.exec_on_start("wl-paste --type text --watch cliphist store")
-- o.exec_on_start("wl-paste --type image --watch cliphist store")
-- o.exec_on_start("hyprpm reload -n")

-- 1. ENVIRONMENT SETUP (Do this first!)
-- These commands ensure all subsequent apps know where Wayland/DBus is.
o.exec_on_start("dbus-update-activation-environment --systemd --all")
o.exec_on_start("systemctl --user import-environment $(env | cut -d'=' -f 1)")

-- 2. CLIPBOARD PERSISTENCE (Crucial for your zapzap issue)
-- This must run early so it is ready to catch copies immediately.
o.exec_on_start("wl-clip-persist --clipboard regular")

-- 3. ESSENTIAL SERVICES
o.exec_on_start("systemctl --user enable --now hyprpolkitagent.service")
o.exec_on_start("systemctl --user start pipewire pipewire-pulse wireplumber")
o.exec_on_start("systemctl --user start bluetooth")
o.exec_on_start("systemctl --user start openrazer-daemon")
o.exec_on_start("systemctl --user start hyprwhspr")

-- 4. APPLICATIONS
o.launch_on_start("quickshell")
o.launch_on_start("ghostty")

-- Slow app launch fix
o.exec_on_start("sh -c 'pgrep -x pcloudcc >/dev/null || pcloudcc -n -u giulylike@gmail.com -d'")

-- 5. UTILITIES
o.exec_on_start("wl-paste --type text --watch cliphist store")
o.exec_on_start("wl-paste --type image --watch cliphist store")
o.exec_on_start("hyprpm reload -n")
