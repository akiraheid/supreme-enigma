---
date: 2025-08-13
layout: post.pug
title: Installing NFS for home NAS
---

My home [Network-Attached Storage (NAS)](https://en.wikipedia.org/wiki/Network-attached_storage) will act as a storage location for all of my [Kubernetes (k8s)](https://kubernetes.io/) nodes.

Network File System (NFS) protocol is not encrypted by default and encrypting it would require setting up Kerberos, which I'm not familiar with, so I'll use Wireguard to secure the End-to-End (E2E) connection between peers. This shouldn't be too difficult to maintain in my home lab.

Because everything is called a "peer" in Wireguard's terms, the actual connections will follow the [spoke-hub paradigm](https://en.wikipedia.org/wiki/Spoke%E2%80%93hub_distribution_paradigm) where the NAS will be a hub and all the clients will be spokes.

I found this [useful guide](https://d.sb/2020/12/nfs-howto) that lays out all the steps pretty clearly.

## Generate NFS server Wireguard key pairs

First, install Wireguard on the NAS, which will be the NFS server.

```bash
root@nfs-server# apt-get install -y wireguard
```

Generate the private and public key pair.

```bash
root@nfs-server# cd /etc/wireguard
root@nfs-server# umask 077
root@nfs-server# wg genkey | tee privatekey | wg pubkey > publickey
```

The print the public key and save this for configuring the NFS client wireguard configuration file later.

```bash
root@nfs-server# cat publickey
```

For example, we'll say the NFS server public key is `server-12345`.

Create the quick-start configuration file `wg-nfs.conf`.

```text
[Interface]
Address = 10.222.0.1/24
PrivateKey = server-12345
ListenPort = 51820
```

I set `Address` to `10.222.0.1` because, according to [RFC 1918](https://www.rfc-editor.org/info/rfc1918):

> The Internet Assigned Numbers Authority (IANA) has reserved the
> following three blocks of the IP address space for private internets:
>
>   10.0.0.0        -   10.255.255.255  (10/8 prefix)
>   172.16.0.0      -   172.31.255.255  (172.16/12 prefix)
>   192.168.0.0     -   192.168.255.255 (192.168/16 prefix)

This means that I have a lot of freedom within the `10.0.0.0` 24-bit block. Here's an explanation of why I chose what I did for the different octets:

- `10` is an easy first octect to remember
- `222` because
    - Sum of `w` (`119`) and `g` (`103`)
    - Easy to remember and type
    - Unlikely to be taken by other software like k3s, which sets up a Container Network Interface (CNI) at `10.42.0.1`
- `0` is easy to remember, type, and expand on
- `1` first server in the IP range

Configure the interface to start on system start.

```bash
root@nfs-server# systemctl enable wg-quick@wg-nfs.service
```

The configuration file still requires peer information before we start the interface, so I created the NFS client key pairs.

## Generate NFS client Wireguard key pairs

Each NFS client will have to run through these steps.

Like the NFS server, install wireguard and generate the key pair.

```bash
root@nfs-client1# apt-get install -y wireguard
root@nfs-client1# cd /etc/wireguard
root@nfs-client1# umask 077
root@nfs-client1# wg genkey | tee privatekey | wg pubkey > publickey
```

Print and save the NFS client public key for each NFS client (because they'll be unique to the client) and save it for configuring the NFS server wireguard configuration later.

```bash
root@nfs-client1# cat publickey
```

For example, we'll say the first NFS client, `client-1`, public key is `client1-12345` and the second NFS client public key is `client2-12345`.

Now, we create the NFS client wireguard configuration.

For `client-1`, the configuration file would be called `wg-nfs.conf` and look like:

```text
[Interface]
Address = 10.222.0.X/24
Privatekey = [privatekey-contents]
ListenPort = 51820

[Peer]
PublicKey = server-12345
Endpoint = [server IP]:51820
AllowedIPs = 10.222.0.0/24
```

The `X` in `Address` is a unique number for the octet.

Configure the interface to start on system start.

```bash
root@nfs-client1# systemctl enable wg-quick@wg-nfs.service
root@nfs-client1# systemctl start wg-nfs.service
```

Add the following text to the NFS server's `wg-nfs.conf` file.

```text
[Peer]
PublicKey = clientX-12345
AllowedIPs = 10.222.0.0/24
```

After all the clients have been added to the NFS sever's `wg-nfs.conf` file, restart the interface on the NFS server.

```bash
root@nfs-server# systemctl restart wg-nfs
```

## Configure NFS server

Install NFS.

```bash
root@nfs-server# apt-get install -y nfs-kernel-server
```

Change the NFS configuration to use only NFSv4, set in `/etc/default/nfs-common`.

```text
NEED_STATD="no"
NEED_IDMAPD="yes"
```

Uncomment the following lines under in `/etc/nfs.conf`

```text
[nfsd]
...
host=10.222.0.1
...
udp=n
tcp=y
vers3=n
vers4=y
```

Modify `/etc/default/nfs-kernel-server` to match the following arguments.

```text
RPCNFSDOPTS="--no-nfs-version 2 --no-nfs-version 3 --host 10.222.0.1"
RPCMOUNTDOPTS="--manage-gids --no-nfs-version 2 --no-nfs-version 3"
```

- `RPCNFSDOPTS`: See details with `man rpc.nfsd`
    - `--no-nfs-version` disables the specified version of NFS. In this case, NFSv2 and NFSv3.
    - `--nfs-version` enable the specified version of NFS. In this case, NFSv4.
    - `--host` specifies a particular hostname/address that NFS requests will be accepted on.
    - `--no-udp` disables UDP connections.
- `RPCMOUNTDOPTS`: See details with `man rpc.mountd`
    - `--manage-gids` allows mapping the list of group IDs received from the client is replaced with a list of group IDs from the server. Requires Linux kernel >= 2.6.21.
    - `--no-nfs-version` disables the specified version of NFS. In this case, NFSv2 and NFSv3.
    - `--nfs-version` enable the specified version of NFS. In this case, NFSv4.
    - `--no-udp` disables UDP connections.

With these settings, the NFS server will only accept NFSv4 connection requests from the Wireguard interface via TCP on port 2049. This will prevent any connections that aren't explicitly allowed in the NFS server's `/etc/wireguard/wg-nfs.conf`.

Now, disable rpcbind and all the unnecessarily ports it opens.

```bash
root@nfs-server# systemctl disable --now rpcbind.service rpcbind.socket
root@nfs-server# systemctl mask rpcbind.service rpcbind.socket
```

A nice explanation of the ports is provided by [peteris.rocks](https://peteris.rocks/blog/nfs4-single-port/).

Export a filesystem to be visible to clients by adding the following to `/etc/exports`.

```
/nfs/data 10.222.0.0/24(rw,sync,no_subtree_check)
```

- `/nfs/data` is the directory to expose to the specified NFS clients.
- `10.222.0.0/24` is all clients from the `10.222.0.0`-`10.222.0.255` IP range.
- `rw` allows reading and writing.
- `sync` writes changes to disk before responding to clients.
- `no_subtree_check` disables subtree checking because files will change frequently and keeping it enabled will affect performance.

## Configure NFS client

Install the NFS client.

```bash
root@nfs-client1# apt-get install -y nfs-common
```

Mount the exposed NFS directory.

```bash
root@nfs-client1# mkdir /mnt/data
root@nfs-client1# mount -t nfs4 -o vers=4.2,async 10.222.0.1:/nfs/data /mnt/data
```

- `async` allows the system to optimize when to write changes to disk. Using `sync` instead is very inefficient for mechanical disks like HDDs.

Now the NFS server contents are available at `/mnt/data`.

Automatically mount this directory on system start by modifying `/etc/fstab`.

```text
10.222.0.1:/nfs/data /mnt/data nfs4 auto,rw,async,nodev,noexec,nosuid,vers=4.2
```

- `auto` automatically mounts this filesystem on boot.
- `rw` allows reading and writing the files.
- `nodev` prevents interpreting character or block special devices on the filesystem to prevent misuse.
- `noexec` prevents direct execution of binaries on the mounted filesystem.
- `nosuid` prevents executing files with elevated permissions from the filesystem.

## Final thoughts

It feels good to be able to have all my files securely accessible from my regular PCs instead of having to `rsync` them over, look at and edit them and then send them back.

Any delay I've seen is for folders with >100 directories and files, so this is understandable and negligible. Accessing individual files is near-instant.
