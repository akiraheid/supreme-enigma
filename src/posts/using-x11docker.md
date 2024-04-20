---
date: 2024-04-20
layout: post.pug
title: Using x11docker
---

I've added several desktop applications to the [`containerfiles` repo](https://github.com/akiraheid/containerfiles) as well as a new laptop that no longer displays some of the applications because of the migration of [Debian to Wayland instead of Xorg](https://wiki.debian.org/Wayland).

The way I've been getting app GUIs from a container is to mount my host's Xorg information for the container to use. Here's an example `podman run` command for GIMP.

```bash
podman run \
	-d \
	-e DISPLAY=unix${DISPLAY} \
	--name GIMP \
	--network none \
	--rm \
	-v $HOST_DIR/:$CONTAINER_DIR/:rw \
	-v /tmp/.X11-unix:/tmp/.X11-unix:rw \
	-v /usr/share/fonts/:/usr/share/fonts:ro \
	${MOUNT_FILE+-v "$fullpath":"$ARG":rw} \
	$IMAGE ${ARG+"$ARG"}
```

Ignore the janky use of variables to mount files into the image. That's being improved later.

Enter [`x11docker`](https://github.com/mviereck/x11docker/tree/master) to handle figuring out displaying container GUIs with Wayland for me. Not only does it handle various X servers, but it also isolates the container's display server so that an app can be configured to be blocked from seeing my clipboard and other running displays.

While this privacy enhancement is great, app GUIs float in a gray display void instead of behaving like native windows. It's not a deal-breaker, but it's not ideal.

Even so, I've started integrating `x11docker` into `containerfiles` for the privacy and display-handling benefits.
