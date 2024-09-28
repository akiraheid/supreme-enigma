---
date: 2024-09-28
layout: post.pug
title: Obsidian container
---

I want to run Obsidian on my desktop, but in a container.

The repo where
[Obsidian publishes their releases](https://github.com/obsidianmd/obsidian-releases)
provides an [AppImage](https://appimage.org/), which claims to be a format that
can run anywhere, so let's give it a shot.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.AppImage /usr/bin/obsidian
    ENTRYPOINT ["obsidian"]

Running it with `x11docker` results in

    dlopen(): error loading libfuse.so.2

    AppImages require FUSE to run.
    You might still be able to extract the contents of this AppImage
    if you run it with the --appimage-extract option.
    See https://github.com/AppImage/AppImageKit/wiki/FUSE
    for more information

Guess it's not as portable as it claims.

I searched the
[Debian package contents site](https://www.debian.org/distrib/packages#search_contents)
for `libfuse.so` and found it is from the `libfuse-dev` package.

Adding the FUSE install.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.AppImage /usr/bin/obsidian
    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            libfuse-dev \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*
    ENTRYPOINT ["obsidian"]

Now it can't find some device

    fuse: device not found, try 'modprobe fuse' first
    open dir error: No such file or directory

    Cannot mount AppImage, please check your FUSE setup.
    You might still be able to extract the contents of this AppImage
    if you run it with the --appimage-extract option.
    See https://github.com/AppImage/AppImageKit/wiki/FUSE
    for more information

I looked at the
[AppImage docs](https://docs.appimage.org/user-guide/troubleshooting/fuse.html)
to try to figure out if I'm overcomplicating it and found that there's a
separate `fuse3` package.

> This is valid only for distributions not having `fuse3` installed by default.
> To be sure, check whether the `fuse3` package is installed, e.g., by running
> `dpkg -l | grep fuse3` in the terminal and checking for a line starting with
> `ii  fuse3`.

Check if the base image has `fuse3` installed already or not.

    > podman run --rm -it --entrypoint /bin/sh localhost/obsidian:latest
    # dpkg -l | grep fuse3
    #

It is not, so replace `libfuse-dev` with `fuse3` so that FUSE is installed
correctly.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.AppImage /usr/bin/obsidian
    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends fuse3 \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*
    ENTRYPOINT ["obsidian"]

But we're back to the same error about finding `libfuse.so`. I assumed that a
library necessary to use FUSE would be installed by `fuse3` but I guess not.

    dlopen(): error loading libfuse.so.2
    AppImages require FUSE to run.
    You might still be able to extract the contents of this AppImage
    if you run it with the --appimage-extract option.
    See https://github.com/AppImage/AppImageKit/wiki/FUSE
    for more information

Add `libfuse-dev` back.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.AppImage /usr/bin/obsidian
    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            fuse3 \
            libfuse-dev \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*
    ENTRYPOINT ["obsidian"]

Even with `libfuse-dev` installed, I still get the same error about not being
able to find `libfuse.so`. I read more of the AppImage troubleshooting page and
there's a `FUSE and Docker` section at the bottom that states FUSE isn't
permitted inside containers for security reasons. I did see something about FUSE
needing kernel modules or something, so I guess FUSE isn't the way to go for
running the app in a container.

[`linuxserver/obsidian`](https://github.com/linuxserver/docker-obsidian/blob/main/Dockerfile)
extracts the contents of the AppImage, so I guess we can just use the AppImage's
contents to run the app without FUSE.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.AppImage /tmp/obsidian.AppImage
    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            libfuse-dev \
            libglib2.0-dev \
        && /tmp/obsidian.AppImage --appimage-extract \
        && mv squashfs-root /opt/obsidian \
        && mkdir -p /usr/share/icons/hicolor/512x512/apps \
        && ln -s \
            /opt/obsidian/usr/share/icons/hicolor/512x512/apps/obsidian.png \
            /usr/share/icons/hicolor/512x512/apps/obsidian.png \
        && ln -s /opt/obsidian/obsidian /usr/bin/obsidian \
        && rm -rf \
            /config/.cache \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*

    ENTRYPOINT ["/opt/obsidian/obsidian"]

Post-development note: I left `libfuse-dev` in by accident. I don't think it
caused any issues, but you'll see soon enough that I won't even use the AppImage
anyway.

Now there seems to be an `x11docker` issue.

    /x11docker/cmdrc: 92: /opt/obsidian/obsidian: Permission denied

The executable permissions are right; `/opt/obsidian/` has the wrong
permissions, since `x11docker` runs as the host UID/GID. It can't access
`/opt/obsidian/` to run the executable.

    > podman run --rm -it --entrypoint /bin/sh localhost/obsidian:latest
    # ls -l /opt /opt/obsidian
    /opt:
    total 4
    drwx------ 5 root root 4096 Sep 28 11:07 obsidian

    /opt/obsidian:
    total 224192
    -rwxr-xr-x 1 root root      2349 Sep 28 11:07 AppRun
    -rw-r--r-- 1 root root      1096 Sep 28 11:07 LICENSE.electron.txt
    -rw-r--r-- 1 root root  10342694 Sep 28 11:07 LICENSES.chromium.html
    -rwxr-xr-x 1 root root     54248 Sep 28 11:07 chrome-sandbox
    -rw-r--r-- 1 root root    150440 Sep 28 11:07 chrome_100_percent.pak
    -rw-r--r-- 1 root root    226946 Sep 28 11:07 chrome_200_percent.pak
    -rwxr-xr-x 1 root root   1288096 Sep 28 11:07 chrome_crashpad_handler
    -rw-r--r-- 1 root root  10717680 Sep 28 11:07 icudtl.dat
    -rwxr-xr-x 1 root root    252936 Sep 28 11:07 libEGL.so
    -rwxr-xr-x 1 root root   6744496 Sep 28 11:07 libGLESv2.so
    -rwxr-xr-x 1 root root   2717616 Sep 28 11:07 libffmpeg.so
    -rwxr-xr-x 1 root root   4250360 Sep 28 11:07 libvk_swiftshader.so
    -rwxr-xr-x 1 root root   7446648 Sep 28 11:07 libvulkan.so.1
    drwx------ 2 root root      4096 Sep 28 11:07 locales
    -rwxr-xr-x 1 root root 178797984 Sep 28 11:07 obsidian
    -rw-rw-r-- 1 root root       225 Sep 28 11:07 obsidian.desktop
    lrwxrwxrwx 1 root root        49 Sep 28 11:07 obsidian.png -> usr/share/icons/hicolor/512x512/apps/obsidian.png
    drwx------ 3 root root      4096 Sep 28 11:07 resources
    -rw-r--r-- 1 root root   5551206 Sep 28 11:07 resources.pak
    -rw-r--r-- 1 root root    307974 Sep 28 11:07 snapshot_blob.bin
    drwx------ 4 root root      4096 Sep 28 11:07 usr
    -rw-r--r-- 1 root root    656953 Sep 28 11:07 v8_context_snapshot.bin
    -rw-r--r-- 1 root root       107 Sep 28 11:07 vk_swiftshader_icd.json

Fix permissions.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.AppImage /tmp/obsidian.AppImage
    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            libfuse-dev \
            libglib2.0-dev \
        && /tmp/obsidian.AppImage --appimage-extract \
        && mv squashfs-root /opt/obsidian \
        && chmod 755 /opt/obsidian \
        && mkdir -p /usr/share/icons/hicolor/512x512/apps \
        && ln -s \
            /opt/obsidian/usr/share/icons/hicolor/512x512/apps/obsidian.png \
            /usr/share/icons/hicolor/512x512/apps/obsidian.png \
        && ln -s /opt/obsidian/obsidian /usr/bin/obsidian \
        && rm -rf \
            /config/.cache \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*

    ENTRYPOINT ["/opt/obsidian/obsidian"]

Now it can't find `libnss3.so`

    /opt/obsidian/obsidian: error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory

The LinuxServer `Dockerfile` manually installs `libnss3`, but at what point do I
manually install some dependency pakages along with the AppImage instead of
using the DEB package that Obsidian provides?

The answer is now, to keep things simple and consistent. I don't see any
documentation on why LinuxServer chose to use the AppImage instead of the DEB,
but I guess I'll find out.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.deb /tmp/obsidian.deb

    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            /tmp/obsidian.deb \
        && apt-get autoclean \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*

    ENTRYPOINT ["obsidian"]

Still missing libraries.

    obsidian: error while loading shared libraries: libdrm.so.2: cannot open shared object file: No such file or directory

Add `libdrm-dev`.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.deb /tmp/obsidian.deb

    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            libdrm-dev \
            /tmp/obsidian.deb \
        && apt-get autoclean \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*

    ENTRYPOINT ["obsidian"]

Still missing libraries.

    obsidian: error while loading shared libraries: libgbm.so.1: cannot open shared object file: No such file or directory

Add `libgmb-dev`.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.deb /tmp/obsidian.deb

    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            libdrm-dev \
            libgbm-dev \
            /tmp/obsidian.deb \
        && apt-get autoclean \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*

    ENTRYPOINT ["obsidian"]

Still missing libraries.

    obsidian: error while loading shared libraries: libasound.so.2: cannot open shared object file: No such file or director

At this point, I'm just going to `ldd` the binary to get list all the dynamic links at once.

    > podman run --rm -it --entrypoint ldd localhost/obsidian:latest /usr/bin/obsidian

        linux-vdso.so.1 (0x00007ffe99dc8000)
        libffmpeg.so => not found
        libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f18e0fe3000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f18e0fde000)
        libgobject-2.0.so.0 => /lib/x86_64-linux-gnu/libgobject-2.0.so.0 (0x00007f18e0f7f000)
        libglib-2.0.so.0 => /lib/x86_64-linux-gnu/libglib-2.0.so.0 (0x00007f18d62c8000)
        libgio-2.0.so.0 => /lib/x86_64-linux-gnu/libgio-2.0.so.0 (0x00007f18d60e8000)
        libnss3.so => /lib/x86_64-linux-gnu/libnss3.so (0x00007f18d5f8f000)
        libnssutil3.so => /lib/x86_64-linux-gnu/libnssutil3.so (0x00007f18e0f4b000)
        libsmime3.so => /lib/x86_64-linux-gnu/libsmime3.so (0x00007f18e0f1c000)
        libnspr4.so => /lib/x86_64-linux-gnu/libnspr4.so (0x00007f18d5f4d000)
        libdbus-1.so.3 => /lib/x86_64-linux-gnu/libdbus-1.so.3 (0x00007f18d5ef7000)
        libatk-1.0.so.0 => /lib/x86_64-linux-gnu/libatk-1.0.so.0 (0x00007f18e0ef1000)
        libatk-bridge-2.0.so.0 => /lib/x86_64-linux-gnu/libatk-bridge-2.0.so.0 (0x00007f18d5ebb000)
        libcups.so.2 => /lib/x86_64-linux-gnu/libcups.so.2 (0x00007f18d5e1e000)
        libdrm.so.2 => /lib/x86_64-linux-gnu/libdrm.so.2 (0x00007f18d5e08000)
        libgtk-3.so.0 => /lib/x86_64-linux-gnu/libgtk-3.so.0 (0x00007f18d5400000)
        libpango-1.0.so.0 => /lib/x86_64-linux-gnu/libpango-1.0.so.0 (0x00007f18d5d9f000)
        libcairo.so.2 => /lib/x86_64-linux-gnu/libcairo.so.2 (0x00007f18d5c7b000)
        libX11.so.6 => /lib/x86_64-linux-gnu/libX11.so.6 (0x00007f18d52be000)
        libXcomposite.so.1 => /lib/x86_64-linux-gnu/libXcomposite.so.1 (0x00007f18e0eea000)
        libXdamage.so.1 => /lib/x86_64-linux-gnu/libXdamage.so.1 (0x00007f18e0ee5000)
        libXext.so.6 => /lib/x86_64-linux-gnu/libXext.so.6 (0x00007f18d5c66000)
        libXfixes.so.3 => /lib/x86_64-linux-gnu/libXfixes.so.3 (0x00007f18d5c5e000)
        libXrandr.so.2 => /lib/x86_64-linux-gnu/libXrandr.so.2 (0x00007f18d5c51000)
        libgbm.so.1 => /lib/x86_64-linux-gnu/libgbm.so.1 (0x00007f18d5c40000)
        libexpat.so.1 => /lib/x86_64-linux-gnu/libexpat.so.1 (0x00007f18d5293000)
        libxcb.so.1 => /lib/x86_64-linux-gnu/libxcb.so.1 (0x00007f18d5269000)
        libxkbcommon.so.0 => /lib/x86_64-linux-gnu/libxkbcommon.so.0 (0x00007f18d5223000)
        libasound.so.2 => not found
        libatspi.so.0 => /lib/x86_64-linux-gnu/libatspi.so.0 (0x00007f18d51e8000)
        libm.so.6 => /lib/x86_64-linux-gnu/libm.so.6 (0x00007f18d5109000)
        libgcc_s.so.1 => /lib/x86_64-linux-gnu/libgcc_s.so.1 (0x00007f18d50e9000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f18d4f08000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f18e0fed000)
        libffi.so.8 => /lib/x86_64-linux-gnu/libffi.so.8 (0x00007f18d5c34000)
        libpcre2-8.so.0 => /lib/x86_64-linux-gnu/libpcre2-8.so.0 (0x00007f18d4e6e000)
        libgmodule-2.0.so.0 => /lib/x86_64-linux-gnu/libgmodule-2.0.so.0 (0x00007f18d5c2c000)
        libz.so.1 => /lib/x86_64-linux-gnu/libz.so.1 (0x00007f18d4e4f000)
        libmount.so.1 => /lib/x86_64-linux-gnu/libmount.so.1 (0x00007f18d4dec000)
        libselinux.so.1 => /lib/x86_64-linux-gnu/libselinux.so.1 (0x00007f18d4dbe000)
        libplc4.so => /lib/x86_64-linux-gnu/libplc4.so (0x00007f18d5c25000)
        libplds4.so => /lib/x86_64-linux-gnu/libplds4.so (0x00007f18d4db9000)
        libsystemd.so.0 => /lib/x86_64-linux-gnu/libsystemd.so.0 (0x00007f18d4ce9000)
        libgssapi_krb5.so.2 => /lib/x86_64-linux-gnu/libgssapi_krb5.so.2 (0x00007f18d4c96000)
        libavahi-common.so.3 => /lib/x86_64-linux-gnu/libavahi-common.so.3 (0x00007f18d4c88000)
        libavahi-client.so.3 => /lib/x86_64-linux-gnu/libavahi-client.so.3 (0x00007f18d4c75000)
        libgnutls.so.30 => /lib/x86_64-linux-gnu/libgnutls.so.30 (0x00007f18d4a00000)
        libgdk-3.so.0 => /lib/x86_64-linux-gnu/libgdk-3.so.0 (0x00007f18d48f6000)
        libpangocairo-1.0.so.0 => /lib/x86_64-linux-gnu/libpangocairo-1.0.so.0 (0x00007f18d4c64000)
        libharfbuzz.so.0 => /lib/x86_64-linux-gnu/libharfbuzz.so.0 (0x00007f18d47f2000)
        libpangoft2-1.0.so.0 => /lib/x86_64-linux-gnu/libpangoft2-1.0.so.0 (0x00007f18d4c4b000)
        libfontconfig.so.1 => /lib/x86_64-linux-gnu/libfontconfig.so.1 (0x00007f18d47a7000)
        libfribidi.so.0 => /lib/x86_64-linux-gnu/libfribidi.so.0 (0x00007f18d4c2d000)
        libcairo-gobject.so.2 => /lib/x86_64-linux-gnu/libcairo-gobject.so.2 (0x00007f18d4c22000)
        libgdk_pixbuf-2.0.so.0 => /lib/x86_64-linux-gnu/libgdk_pixbuf-2.0.so.0 (0x00007f18d4779000)
        libepoxy.so.0 => /lib/x86_64-linux-gnu/libepoxy.so.0 (0x00007f18d464a000)
        libXi.so.6 => /lib/x86_64-linux-gnu/libXi.so.6 (0x00007f18d4636000)
        libthai.so.0 => /lib/x86_64-linux-gnu/libthai.so.0 (0x00007f18d462b000)
        libpixman-1.so.0 => /lib/x86_64-linux-gnu/libpixman-1.so.0 (0x00007f18d4580000)
        libfreetype.so.6 => /lib/x86_64-linux-gnu/libfreetype.so.6 (0x00007f18d44b6000)
        libpng16.so.16 => /lib/x86_64-linux-gnu/libpng16.so.16 (0x00007f18d4480000)
        libxcb-shm.so.0 => /lib/x86_64-linux-gnu/libxcb-shm.so.0 (0x00007f18d447b000)
        libxcb-render.so.0 => /lib/x86_64-linux-gnu/libxcb-render.so.0 (0x00007f18d446d000)
        libXrender.so.1 => /lib/x86_64-linux-gnu/libXrender.so.1 (0x00007f18d4460000)
        libwayland-server.so.0 => /lib/x86_64-linux-gnu/libwayland-server.so.0 (0x00007f18d444a000)
        libXau.so.6 => /lib/x86_64-linux-gnu/libXau.so.6 (0x00007f18d4445000)
        libXdmcp.so.6 => /lib/x86_64-linux-gnu/libXdmcp.so.6 (0x00007f18d4200000)
        libblkid.so.1 => /lib/x86_64-linux-gnu/libblkid.so.1 (0x00007f18d41a9000)
        libcap.so.2 => /lib/x86_64-linux-gnu/libcap.so.2 (0x00007f18d4439000)
        libgcrypt.so.20 => /lib/x86_64-linux-gnu/libgcrypt.so.20 (0x00007f18d4062000)
        liblzma.so.5 => /lib/x86_64-linux-gnu/liblzma.so.5 (0x00007f18d440a000)
        libzstd.so.1 => /lib/x86_64-linux-gnu/libzstd.so.1 (0x00007f18d3fa6000)
        liblz4.so.1 => /lib/x86_64-linux-gnu/liblz4.so.1 (0x00007f18d3f80000)
        libkrb5.so.3 => /lib/x86_64-linux-gnu/libkrb5.so.3 (0x00007f18d3ea6000)
        libk5crypto.so.3 => /lib/x86_64-linux-gnu/libk5crypto.so.3 (0x00007f18d3e79000)
        libcom_err.so.2 => /lib/x86_64-linux-gnu/libcom_err.so.2 (0x00007f18d3e73000)
        libkrb5support.so.0 => /lib/x86_64-linux-gnu/libkrb5support.so.0 (0x00007f18d3e65000)
        libp11-kit.so.0 => /lib/x86_64-linux-gnu/libp11-kit.so.0 (0x00007f18d3d31000)
        libidn2.so.0 => /lib/x86_64-linux-gnu/libidn2.so.0 (0x00007f18d3d00000)
        libunistring.so.2 => /lib/x86_64-linux-gnu/libunistring.so.2 (0x00007f18d3b4a000)
        libtasn1.so.6 => /lib/x86_64-linux-gnu/libtasn1.so.6 (0x00007f18d3b35000)
        libnettle.so.8 => /lib/x86_64-linux-gnu/libnettle.so.8 (0x00007f18d3ae7000)
        libhogweed.so.6 => /lib/x86_64-linux-gnu/libhogweed.so.6 (0x00007f18d3a9e000)
        libgmp.so.10 => /lib/x86_64-linux-gnu/libgmp.so.10 (0x00007f18d3a1d000)
        libwayland-client.so.0 => /lib/x86_64-linux-gnu/libwayland-client.so.0 (0x00007f18d3a09000)
        libwayland-cursor.so.0 => /lib/x86_64-linux-gnu/libwayland-cursor.so.0 (0x00007f18d39ff000)
        libwayland-egl.so.1 => /lib/x86_64-linux-gnu/libwayland-egl.so.1 (0x00007f18d39fa000)
        libXcursor.so.1 => /lib/x86_64-linux-gnu/libXcursor.so.1 (0x00007f18d39ed000)
        libXinerama.so.1 => /lib/x86_64-linux-gnu/libXinerama.so.1 (0x00007f18d39e8000)
        libgraphite2.so.3 => /lib/x86_64-linux-gnu/libgraphite2.so.3 (0x00007f18d39ba000)
        libjpeg.so.62 => /lib/x86_64-linux-gnu/libjpeg.so.62 (0x00007f18d3927000)
        libdatrie.so.1 => /lib/x86_64-linux-gnu/libdatrie.so.1 (0x00007f18d391d000)
        libbrotlidec.so.1 => /lib/x86_64-linux-gnu/libbrotlidec.so.1 (0x00007f18d3910000)
        libbsd.so.0 => /lib/x86_64-linux-gnu/libbsd.so.0 (0x00007f18d38fa000)
        libgpg-error.so.0 => /lib/x86_64-linux-gnu/libgpg-error.so.0 (0x00007f18d38d0000)
        libkeyutils.so.1 => /lib/x86_64-linux-gnu/libkeyutils.so.1 (0x00007f18d38c9000)
        libresolv.so.2 => /lib/x86_64-linux-gnu/libresolv.so.2 (0x00007f18d38b8000)
        libbrotlicommon.so.1 => /lib/x86_64-linux-gnu/libbrotlicommon.so.1 (0x00007f18d3895000)
        libmd.so.0 => /lib/x86_64-linux-gnu/libmd.so.0 (0x00007f18d3886000)

Add missing libs.

    FROM docker.io/library/debian:12-slim

    COPY ./obsidian.deb /tmp/obsidian.deb

    RUN DEBIAN_FRONTEND=noninteractive \
        && apt-get update \
        && apt-get install -y --no-install-recommends \
            libasound2-dev \
            libdrm-dev \
            libgbm-dev \
            qmmp \
            /tmp/obsidian.deb \
        && apt-get autoclean \
        && rm -rf \
            /var/lib/apt/lists/* \
            /var/tmp/* \
            /tmp/*

    ENTRYPOINT ["obsidian"]

Finally getting the executable to run.

    Check failed: sys_chroot("/proc/self/fdinfo/") == 0
    [71:0928/075010.271018:FATAL:zygote_host_impl_linux.cc(215)] Check failed: . : Invalid argument (22)
    Trace/breakpoint trap

Not sure what this is. Looks like it's trying to find process information about
itself. [This](https://stackoverflow.com/q/68364633) StackOverflow post has a
more verbose version of this issue.

    Failed to launch chrome!
    [0702/102126.236473:FATAL:zygote_host_impl_linux.cc(116)] No usable sandbox! Update your kernel or see https://chromium.googlesource.com/chromium/src/+/master/docs/linux_suid_sandbox_development.md for more information on developing with the SUID sandbox. If you want to live dangerously and need an immediate workaround, you can try using --no-sandbox.
    #0 0x55e0286ccaf9 ... Core file will not be generated.

    TROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md

    at onClose (/home/ec2-user/credence/microservices/reporting-server/node_modules/puppeteer/lib/Launcher.js:342:14)
    at Interface.helper.addEventListener (/home/ec2-user/credence/microservices/reporting-server/node_modules/puppeteer/lib/Launcher.js:331:50)
    at Interface.emit (events.js:203:15)
    at Interface.close (readline.js:397:8)
    at Socket.onend (readline.js:173:10)
    at Socket.emit (events.js:203:15)
    at endReadableNT (_stream_readable.js:1143:12)
    at process._tickCallback (internal/process/next_tick.js:63:19)

It seems to suggest that it's Chromium trying to use a sandbox but failing (in
my case likely because it's in a container). The suggested fix is to run with
the `--no-sandbox` argument (which is also used by LinuxServer), so probably our
best bet.

The error message itself warns:

    If you want to live dangerously and need an immediate workaround, you can try using --no-sandbox.

And a
[comment](https://stackoverflow.com/questions/68364633/failed-to-launch-chrome-fatalzygote-host-impl-linux-cc116-no-usable-sandbox#comment133018320_68364634)
notes that the Puppeteer docs state:

    If you absolutely trust the content you open in Chrome, you can launch Chrome with the --no-sandbox argument

In our case, we're running in a container as a non-root user, so I'm not too concerned.

When I run with `--no-sandbox`, the GUI shows up! There are quite a few error messages, though.

    2024-09-28 11:59:56 Loading main app package /opt/Obsidian/resources/obsidian.asar
    Ignored: Error: ENOENT: no such file or directory, open '/home/user/.config/obsidian/obsidian.json'
    [71:0928/075956.231664:ERROR:bus.cc(407)] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
    [71:0928/075956.231756:ERROR:bus.cc(407)] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
    [71:0928/075956.233467:ERROR:bus.cc(407)] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
    [71:0928/075956.233636:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [71:0928/075956.233666:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [71:0928/075956.233685:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [71:0928/075956.233701:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [170:0928/075956.293804:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.296029:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.296211:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [170:0928/075956.296704:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.296869:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.297087:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [170:0928/075956.297269:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [170:0928/075956.297366:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [170:0928/075956.299414:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.299567:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.299654:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [170:0928/075956.299869:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.299964:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [170:0928/075956.300031:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [170:0928/075956.300097:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [170:0928/075956.300199:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [170:0928/075956.302667:ERROR:viz_main_impl.cc(198)] Exiting GPU process due to errors during initialization
    [71:0928/075956.323418:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    2024-09-28 11:59:56 Checking for update using Github
    [192:0928/075956.368059:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368192:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368233:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [192:0928/075956.368347:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368390:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368424:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [192:0928/075956.368458:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [192:0928/075956.368494:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [170:0928/075956.302667:ERROR:viz_main_impl.cc(198)] Exiting GPU process due to errors during initialization
    [71:0928/075956.323418:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    2024-09-28 11:59:56 Checking for update using Github
    [192:0928/075956.368059:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368192:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368233:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [192:0928/075956.368347:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368390:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.368424:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [192:0928/075956.368458:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [192:0928/075956.368494:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [192:0928/075956.369710:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.369789:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.369827:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [192:0928/075956.369922:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.369965:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [192:0928/075956.370000:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [192:0928/075956.370033:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [192:0928/075956.370066:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [192:0928/075956.371182:ERROR:viz_main_impl.cc(198)] Exiting GPU process due to errors during initialization
    2024-09-28 11:59:56 Failed to check for update using Github (net::ERR_INTERNET_DISCONNECTED)
    Error: net::ERR_INTERNET_DISCONNECTED
        at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/browser_init:2:114352)
        at SimpleURLLoaderWrapper.emit (node:events:519:28)
    2024-09-28 11:59:56 Checking for update using obsidian.md
    2024-09-28 11:59:56 Failed to check for update using obsidian.md (net::ERR_INTERNET_DISCONNECTED)
    Error: net::ERR_INTERNET_DISCONNECTED
        at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/browser_init:2:114352)
        at SimpleURLLoaderWrapper.emit (node:events:519:28)
    [191:0928/075956.432785:ERROR:command_buffer_proxy_impl.cc(131)] ContextResult::kTransientFailure: Failed to send GpuControl.CreateCommandBuffer.
    Ignored: Error: ENOENT: no such file or directory, open '/home/user/.config/obsidian/5edc305682d8bd3f.json'
    [71:0928/080018.634446:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")

At least it prints out where it stores its configuration. I'll add `/home/user/.config/obsidian/` as a mounted volume so that the configuration is persistent.

    [67:0928/080813.122148:ERROR:bus.cc(407)] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
    2024-09-28 12:08:13 Loading main app package /opt/Obsidian/resources/obsidian.asar
    Ignored: Error: ENOENT: no such file or directory, open '/home/user/.config/obsidian/obsidian.json'
    [67:0928/080813.283094:ERROR:bus.cc(407)] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
    [67:0928/080813.283141:ERROR:bus.cc(407)] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
    [67:0928/080813.284228:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [67:0928/080813.284407:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [67:0928/080813.284433:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    [67:0928/080813.284468:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    Fontconfig error: No writable cache directories
    Fontconfig error: No writable cache directories
    Fontconfig error: No writable cache directories
    Fontconfig error: No writable cache directories
    [165:0928/080813.339954:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.341338:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.341370:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [165:0928/080813.341611:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.341713:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.341799:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [165:0928/080813.341970:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [165:0928/080813.342057:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [165:0928/080813.344296:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.344524:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.344524:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.344662:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [165:0928/080813.344893:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.344968:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [165:0928/080813.345017:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [165:0928/080813.345073:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [165:0928/080813.345176:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [165:0928/080813.348005:ERROR:viz_main_impl.cc(198)] Exiting GPU process due to errors during initialization
    Fontconfig error: No writable cache directories
    Fontconfig error: No writable cache directories
    Fontconfig error: No writable cache directories
    Fontconfig error: No writable cache directories
    [67:0928/080813.370997:ERROR:bus.cc(407)] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
    2024-09-28 12:08:13 Checking for update using Github
    [188:0928/080813.417068:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.417164:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.417190:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [188:0928/080813.417411:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.417455:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.417488:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [188:0928/080813.417510:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [188:0928/080813.417529:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [188:0928/080813.418162:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.419064:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.419103:ERROR:gl_display.cc(786)] eglInitialize OpenGL failed with error EGL_NOT_INITIALIZED, trying next display type
    [188:0928/080813.419192:ERROR:angle_platform_impl.cc(44)] Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    ERR: Display.cpp:1086 (initialize): ANGLE Display::initialize error 12289: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.419216:ERROR:gl_display.cc(515)] EGL Driver message (Critical) eglInitialize: Unsupported GLX version (requires at least 1.3).
    [188:0928/080813.419236:ERROR:gl_display.cc(786)] eglInitialize OpenGLES failed with error EGL_NOT_INITIALIZED
    [188:0928/080813.419256:ERROR:gl_display.cc(820)] Initialization of all EGL display types failed.
    [188:0928/080813.419277:ERROR:gl_ozone_egl.cc(26)] GLDisplayEGL::Initialize failed.
    [188:0928/080813.420404:ERROR:viz_main_impl.cc(198)] Exiting GPU process due to errors during initialization
    2024-09-28 12:08:13 Failed to check for update using Github (net::ERR_INTERNET_DISCONNECTED)
    Error: net::ERR_INTERNET_DISCONNECTED
        at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/browser_init:2:114352)
        at SimpleURLLoaderWrapper.emit (node:events:519:28)
    2024-09-28 12:08:13 Checking for update using obsidian.md
    2024-09-28 12:08:13 Failed to check for update using obsidian.md (net::ERR_INTERNET_DISCONNECTED)
    Error: net::ERR_INTERNET_DISCONNECTED
        at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/browser_init:2:114352)
        at SimpleURLLoaderWrapper.emit (node:events:519:28)
    [185:0928/080813.475694:ERROR:command_buffer_proxy_impl.cc(131)] ContextResult::kTransientFailure: Failed to send GpuControl.CreateCommandBuffer.

I'm not too concerned about the dbus or font cache errors right now because I don't need either of those and the app seems to work without them.

The app works on the desktop! Time to make some documents!

The latest version of the Dockerfile is
[here](https://github.com/akiraheid/containerfiles/blob/master/obsidian/Dockerfile)
and the image itself is [here](https://hub.docker.com/r/akiraheid/obsidian).
