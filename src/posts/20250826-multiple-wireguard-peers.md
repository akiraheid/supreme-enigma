---
date: 2025-08-26
layout: post.pug
title: Adding another NFS-over-Wireguard peer
---

I have a new PC that I want to have access to my NAS's NFS. This PC's hostname is `client2`.

Similar to my first PC, install Wireguard.

```bash
apt-get install -y wireguard
```

And generate the key pair.

```bash
cd /etc/wireguard
umask 077
wg genkey | tee privatekey | wg pubkey > publickey
```

And create a `wg-nfs.conf` with the following contents:

```text
[Interface]
Address = 10.222.0.3/24
PrivateKey = [client2 private key]
ListenPort = 51820

[Peer]
PublicKey = j2mzNGtF2eZ00NJdqMcMHGsAT3mWbigIfSbdWOxMR1w=
Endpoint = 192.168.0.10:51820
AllowedIPs = 10.222.0.0/24
```

Create the `systemctl` service.

```text
systemctl enable wg-quick@wg-nfs.service
```

Start the service.

```text
systemctl start wg-quick@wg-nfs.service
```

Verify the service is running.

```text
root@client2:/# systemctl status wg-quick@wg-nfs.service
● wg-quick@wg-nfs.service - WireGuard via wg-quick(8) for wg/nfs
     Loaded: loaded (/usr/lib/systemd/system/wg-quick@.service; enabled; preset: enabled)
     Active: active (exited) since Mon 2025-08-25 23:46:59 EDT; 7s ago
       Docs: man:wg-quick(8)
             man:wg(8)
             https://www.wireguard.com/
             https://www.wireguard.com/quickstart/
             https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
             https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
    Process: 591311 ExecStart=/usr/bin/wg-quick up wg-nfs (code=exited, status=0/SUCCESS)
   Main PID: 591311 (code=exited, status=0/SUCCESS)
        CPU: 127ms

Aug 25 23:46:59 client2 wg-quick[591311]: [#] wg setconf wg-nfs /dev/fd/63
Aug 25 23:46:59 client2 wg-quick[591311]: [#] ip -4 address add 10.222.0.3/24 dev wg-nfs
Aug 25 23:46:59 client2 wg-quick[591311]: [#] ip link set mtu 1420 up dev wg-nfs
Aug 25 23:46:59 client2 wg-quick[591311]: [#] wg set wg-nfs fwmark 51820
Aug 25 23:46:59 client2 wg-quick[591311]: [#] ip -4 rule add not fwmark 51820 table 51820
Aug 25 23:46:59 client2 wg-quick[591311]: [#] ip -4 rule add table main suppress_prefixlength 0
Aug 25 23:46:59 client2 wg-quick[591311]: [#] ip -4 route add 0.0.0.0/0 dev wg-nfs table 51820
```

Add the client's public key to the NAS's Wireguard configuration.

```text
[Interface]
Address = 10.222.0.1/24
PrivateKey = [nas private key]
ListenPort = 51820

# client1
[Peer]
PublicKey = /SSdlkbHhL4gM672GRjLUUpP1pgtkf+IXAISYDk8MAI=
AllowedIPs = 10.222.0.0/24

# client2
[Peer]
PublicKey = /z6ZCQcdWOJ2EO3XeSJVKpf058Ka5vw2kDV/9KtN6Ew=
AllowedIPs = 10.222.0.0/24
```

Restart the NAS Wireguard service. And verify the service started correctly.

```text
root@nas:/# systemctl restart wg-quick@wg0.service
$ systemctl status wg-quick@wg0.service
● wg-quick@wg0.service - WireGuard via wg-quick(8) for wg0
     Loaded: loaded (/lib/systemd/system/wg-quick@.service; enabled; preset: enabled)
     Active: active (exited) since Mon 2025-08-25 23:55:06 EDT; 5s ago
       Docs: man:wg-quick(8)
             man:wg(8)
             https://www.wireguard.com/
             https://www.wireguard.com/quickstart/
             https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
             https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
    Process: 694363 ExecStart=/usr/bin/wg-quick up wg0 (code=exited, status=0/SUCCESS)
   Main PID: 694363 (code=exited, status=0/SUCCESS)
        CPU: 26ms

Aug 25 23:55:06 nas systemd[1]: Starting wg-quick@wg0.service - WireGuard via wg-quick(8) for wg0...
Aug 25 23:55:06 nas wg-quick[694363]: [#] ip link add wg0 type wireguard
Aug 25 23:55:06 nas wg-quick[694363]: [#] wg setconf wg0 /dev/fd/63
Aug 25 23:55:06 nas wg-quick[694363]: [#] ip -4 address add 10.222.0.1/24 dev wg0
Aug 25 23:55:06 nas wg-quick[694363]: [#] ip link set mtu 1420 up dev wg0
Aug 25 23:55:06 nas systemd[1]: Finished wg-quick@wg0.service - WireGuard via wg-quick(8) for wg0.
```

Wait a couple seconds to let the peers connect, then display the connection status.

```text
root@nas:/# wg show
interface: wg0
  public key: j2mzNGtF2eZ00NJdqMcMHGsAT3mWbigIfSbdWOxMR1w=
  private key: (hidden)
  listening port: 51820

peer: /SSdlkbHhL4gM672GRjLUUpP1pgtkf+IXAISYDk8MAI=
  endpoint: [peer IP]:51820
  allowed ips: (none)
  latest handshake: 1 minute, 11 seconds ago
  transfer: 148 B received, 124 B sent

peer: /z6ZCQcdWOJ2EO3XeSJVKpf058Ka5vw2kDV/9KtN6Ew=
  endpoint: [peer IP]:46631
  allowed ips: 10.222.0.0/24
  latest handshake: 7 minutes, 16 seconds ago
  transfer: 19.38 KiB received, 2.38 KiB sent
```

However, this shows that the previous peer has no allowed IPs on the NAS.

I modified my WireGuard configs to specify the explicit interface IP the peer would expect a connection from and netmask of `/32` based on the video from the wireguard site.

```text
# client1
[Interface]
Address = 10.222.0.2/24
PrivateKey = [private key]
ListenPort = 51820

[Peer]
PublicKey = j2mzNGtF2eZ00NJdqMcMHGsAT3mWbigIfSbdWOxMR1w=
Endpoint = 192.168.0.10:51820
AllowedIPs = 10.222.0.1/32
```

```text
# client2
[Interface]
Address = 10.222.0.3/24
PrivateKey = [private key]
ListenPort = 51820

[Peer]
PublicKey = j2mzNGtF2eZ00NJdqMcMHGsAT3mWbigIfSbdWOxMR1w=
Endpoint = 192.168.0.10:51820
AllowedIPs = 10.222.0.1/32
```

```text
# nas
[Interface]
Address = 10.222.0.1/24
PrivateKey = [private key]
ListenPort = 51820

# client1
[Peer]
PublicKey = /SSdlkbHhL4gM672GRjLUUpP1pgtkf+IXAISYDk8MAI=
AllowedIPs = 10.222.0.2/32

# client2
[Peer]
PublicKey = /z6ZCQcdWOJ2EO3XeSJVKpf058Ka5vw2kDV/9KtN6Ew=
AllowedIPs = 10.222.0.3/32
```

I can't find an explanation of how the `AllowedIPs` key works, so this is black magic to me.
