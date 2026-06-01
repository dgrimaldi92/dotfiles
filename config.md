
```
# Connect to the internet

# Method 1: iwd

# Install iwd package
sudo pacman -S iwd

# Enable iwd service daemon
sudo systemctl enable iwd.service

# Start iwd service daemon
sudo systemctl start iwd.service

# Check the status of iwd service daemon (Optional)
sudo systemctl status iwd.service

# Enable built-in network configuration

# Create/edit iwd network configuration file
/etc/iwd/main.conf
---
[General]
EnableNetworkConfiguration=true
---

# Disable IPv6 support (Optional)

# Since version 1.10, iwd supports IPv6, but it is disabled by default in version below 2.0.
# Since version 2.0, it is enabled by default.
# Create/edit iwd network configuration file
---
[Network]
EnableIPv6=false
---

# Scan for nearby networks
# iwctl station interface scan
iwctl station wlan1 scan

# List nearby networks
# iwctl station interface get-networks
iwctl station wlan1 get-networks

# Connect to a network
# iwctl station interface connect ssid
iwctl station wlan1 connect freewifi

# Disconnect from the current network (Optional)
# iwctl station interface disconnect
iwctl station wlan1 disconnect



# Method 2: iwd and standalone DHCP client (dhcpcd)

# Install iwd and dhcpcd package
sudo pacman -S iwd dhcpcd

# Enable iwd and dhcpcd service daemon
sudo systemctl enable iwd.service
sudo systemctl enable dhcpcd.service

# Start iwd and dhcpcd service daemon
sudo systemctl start iwd.service
sudo systemctl start dhcpcd.service

# Check the status of iwd and dhcpcd service daemon (Optional)
sudo systemctl status iwd.service
sudo systemctl status dhcpcd.service

# Scan for nearby networks
# iwctl station interface scan
iwctl station wlan1 scan

# List nearby networks
# iwctl station interface get-networks
iwctl station wlan1 get-networks

# Connect to a network
# iwctl station interface connect ssid
iwctl station wlan1 connect freewifi

# Disconnect from the current network (Optional)
# iwctl station interface disconnect
iwctl station wlan1 disconnect



# Method 3: networkmanager

# Install networkmanager package
sudo pacman -S networkmanager

# Enable networkmanager service daemon
sudo systemctl enable NetworkManager.service

# Start networkmanager service daemon
sudo systemctl start NetworkManager.service

# Check the status of networkmanager service daemon (Optional)
sudo systemctl status NetworkManager.service

# List nearby networks
nmcli device wifi list

# Connect to a network
# nmcli device wifi connect ssid_or_bssid password password ifname interface
nmcli device wifi connect freewifi password 123456 ifname wlan1

# Disconnect from the current network (Optional)
# nmcli device disconnect ifname interface
nmcli device disconnect ifname wlan1
```
