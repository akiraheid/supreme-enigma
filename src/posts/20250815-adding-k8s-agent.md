---
date: 2025-08-15
layout: post.pug
title: Set up home lab k3s agent
---

Now I'll add a k8s agent to my home lab cluster.

I download the k3s installer script to inspect it before running it instead of executing the command to download and pipe the script into bash from the [k3s documentation](https://docs.k3s.io/quick-start).

This provides a couple benefits:

1. Remove things I don't want
2. Learn new ways to code and approach solutions

Download the k3s install script.

```bash
curl -o k3s_installer.sh https://get.k3s.io
```

It's important that the k3s version installed on all server nodes be [at most one minor version apart](https://github.com/k3s-io/k3s/discussions/11768). For example, mixing 1.26 and 1.27 server node versions.

I use `v1.31.6+k3s1`.

Install the k3s agent, directing the installer to the server's IP and the cluster token and version.

```bash
K3S_URL=https://192.168.0.2:6443 K3S_TOKEN=xxx INSTALL_K3S_VERSION=v1.31.6+k3s1 ./k3s_installer.sh agent
```

k3s is unable to resolve hostnames on the network, so provide the host IP instead of the host name.
