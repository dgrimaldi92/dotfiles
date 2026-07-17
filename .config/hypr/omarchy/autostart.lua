o.launch_on_start("quickshell")
o.exec_on_start("systemctl --user enable --now hyprpolkitagent.service")

-- Slow app launch fix -- set systemd vars.
o.exec_on_start("systemctl --user import-environment $(env | cut -d'=' -f 1)")
o.exec_on_start("dbus:q-update-activation-environment --systemd --all")
o.exec_on_start("ghostty")
-- o.exec_on_start("hyprpaper") -- sudo pacman -R hyprpaper

o.exec_on_start("wl-paste --type text --watch cliphist store")
o.exec_on_start("wl-paste --type image --watch cliphist store")
o.exec_on_start("hyprpm reload -n")
