---
date: 2025-07-18
layout: post.pug
title: A Kubernetes control plane with Raspberry Pis
---

**Goal**

Host a [Kubernetes](https://kubernetes.io/) (k8s) cluster at home with [Raspberry Pis](https://www.raspberrypi.com/) (rpi) as the control plane.

**Rationale**

Use low-power hardware redundancies to keep the cluster operational. Resource-intensive work is done by transient agents.

# Architecture

Each rpi:

- Has embedded etcd
- Runs [k3s](https://docs.k3s.io/) server node
- Runs [kubelet](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)

Running at least three of these nodes in a cluster provides low-power High Availability (HA) in my home lab.

# Setting up

## Configuring an rpi

This section covers how to set up an rpi for use.

Flash the SD card with Raspbian 64-bit. This creates 3 partitions:

- Free space (8.4 MB)
- bootfs (537 MB FAT)
- rootfs (2.2 GB Ext4)
- Free space

Modify the last "free space" partition to be `ext4` so the rpi can use it to store miscellaneous data.

Assuming bootfs is mounted as `/mnt/rpi-bootfs`, create an empty file to enable SSH on boot.

```text
touch /mnt/rpi-bootfs/ssh
```

Create a default user to have an account to log in to.

```bash
pass=$(echo "changeme123" | openssl passwd -6 -stdin)
echo "pi:$pass" >> /mnt/rpi-bootfs/userconf.txt
```

Eject the SD card and insert it into the rpi. Connect the rpi to the network via an Ethernet cable and power it on.

SSH to the rpi. The rpi conveniently supports mDNS and can be found at `raspberrypi.local`.

```text
ssh pi@raspberrypi.local
```

Add the PC's SSH key so that I don't have to have to enter a password each time I connect via SSH.

```text
ssh-copy-id pi@raspberrypi.local
```

Configure the rpi.

```text
raspi-config
```

Set up:

1. WiFi connection.
2. Change the password for the `pi` user.
3. Disable password authentication for SSH.
4. Set a unique hostname.
5. Update the system.

Shutdown and disconnect the rpi.

Repeat for each rpi.

## Add the rpis to the cluster

Create a `k8s` group and add the `pi` user to it so that I can SSH to any server node and run kubectl commands.

```text
sudo groupadd -f --system "$k8sGroup" --users "$USER"
```

Add the rpi to the cluster.

```text
sudo ./k3s_install.sh server \
    --write-kubeconfig-group k8s \
    --write-kubeconfig-mode 640
    --token token \
    --server server:6443
```

Set the systemd service to `640` because the installer sets it to `644` by default, which exposes the token.

```text
sudo chmod 640 /etc/systemd/system/k3s.service
```

However, running this on the Raspberry Pi 4 results in the following error message during install:

```
--->8 snip 8<---
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  Failed to find memory cgroup, you may need to add "cgroup_memory=1 cgroup_enable=memory" to your linux cmdline (/boot/cmdline.txt on a Raspberry Pi)
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
--->8 snip 8<---
```

Rpis do not support k8s.
