---
date: 2020-12-31
layout: post.pug
title: Podman KeePassXC container
---

Let's build a KeePassXC container.

There's an [existing container on DockerHub](https://hub.docker.com/r/jessfraz/keepassxc) by the "make-everything-work-in-containers" guru [`jessfraz`](https://github.com/jessfraz) that is based on `alpine:latest` and is 352MB. The image is built by compiling source, installing the built software, removing the build dependencies, and finally installing runtime dependencies.

Not a bad way to do it, but I want an image that:
* builds in less than a minute
* is smaller

For reference, [this is her Dockerfile](https://github.com/jessfraz/dockerfiles/blob/2a1ddf2e3413657228a37a7971338ff95e9d2bcc/keepassxc/Dockerfile)

[Alpine](https://wiki.alpinelinux.org/wiki/Main_Page)'s `apk` has KeePassXC in its [package repository](https://pkgs.alpinelinux.org/packages?name=keepassxc&branch=v3.12), so building the image that installs it is possible.

```
FROM alpine:latest

RUN apk add --no-cache -v --no-progress keepassxc

ENTRYPOINT ["keepassxc"]
```

The build is successful.

`jessfraz` also has a [bash function](https://github.com/jessfraz/dotfiles/blob/30c4d026bfc71df60f7b05d0bdbb3cc34049c017/.dockerfunc#L402) that has a commmand for running the image (pasted here for reference).

```
docker run -d \
	-v /etc/localtime:/etc/localtime:ro \
	-v /tmp/.X11-unix:/tmp/.X11-unix \
	-v /usr/share/X11/xkb:/usr/share/X11/xkb:ro \
	-e "DISPLAY=unix${DISPLAY}" \
	-v /etc/machine-id:/etc/machine-id:ro \
	--name keypassxc \
	${DOCKER_REPO_PREFIX}/keepassxc
```

My changes:
* switch `docker` with `podman`
* add `--rm` because I don't want the container to stick around after I've exited the application
* mount `$HOME/.config/keepassxc` so that I can retain configuration options across containers
* mount the database file directly because I can't mount a symlink to my file sync directory
* remove mount to `/etc/localtime` because it's not necessary

```
podman run -d --rm \
	--name $NAME \
	-e DISPLAY=unix${DISPLAY} \
	-v ${HOME}/.config/keepassxc/:/root/.config/keepassxc/ \
	-v ${HOME}/syncthing/computers/keepassxc.kdbx:/root/.config/keepassxc/keepassxc.kdbx \
	-v /etc/machine-id:/etc/machine-id:ro \
	-v /tmp/.X11-unix:/tmp/.X11-unix \
	-v /usr/share/X11/xkb/:/usr/share/X11/xkb/:ro \
	localhost/keepassxc
```

Running the container is successful in bringing up a GUI, but the text in the GUI missing. Looking at her Dockerfile, there's an explicit install of a font with the `ttf-dejavu` package. Installing this fixes the missing text in the GUI.

```
FROM alpine:latest

RUN apk add --no-cache -v --no-progress \
	keepassxc \
	ttf-dejavu

ENTRYPOINT ["keepassxc"]
```

With these changes, I've made a couple improvements:

| feature              | jessfraz |  me  | % improvement |
| :------              | :------: | :--: | :-----------: |
| build time (seconds) | 300      | 17   | 94            |
| image size (MB)      | 352      | 133  | 62            |

The build time improvement is significant, but it is important to remember that Alpine only supports one version of a package per version. `jessfraz`'s Dockerfile specifies and builds a specific version of KeePassXC, which can be changed without changing the base image. I don't know if the package repository is updated after a release of Alpine but, if it isn't, bugfixes and features in KeePassXC will require a new version of Alpine to be released.

Image size is also improved, but I'm not sure what could be contributing to this.
