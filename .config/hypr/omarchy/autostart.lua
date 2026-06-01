-- o.launch_on_start("hypridle")
o.launch_on_start("mako")
o.lanuch_on_start("waybar")
o.launch_on_start("swaybg -i ~/.config/theme/backgrounds -m fill")
o.exec_on_start("systemctl --user enable --now hyprpolkitagent.service")

-- Slow app launch fix -- set systemd vars.
o.exec_on_start("systemctl --user import-environment $(env | cut -d'=' -f 1)")
o.exec_on_start("dbus-update-activation-environment --systemd --all")
