---
date: 2024-04-20
layout: post.pug
title: Handling spaces in file names in Bash
---

In the container running scripts in [`containerfiles` repo](https://github.com/akiraheid/containerfiles), I couldn't find a way to handle spaces in file names for mounting into a container.

This would be easy if I knew the file name beforehand.

```bash
podman run \
    --rm \
	--entrypoint /bin/bash \
    -v "my file.txt:my file.txt:rw" \
    docker.io/library/ubuntu:22.04 "my file.txt"
```

But I don't. The user may not provide a file and just start the application by default, so the volume command may not exist. I can make the volume mount flag and argument a variable.

```bash
if [ -n "$1" ]; then
	_file=$1
    hpath=$(readlink -f "$_file")
    cpath=/app/$(basename "$hpath")
    mount="-v ${hpath}:${cpath}"
fi

podman run \
    --rm \
	--entrypoint /bin/bash \
    $mount \
    docker.io/library/ubuntu:22.04 "$cpath"
```

Which results in podman trying to run an image called `with` because of the spaces.

```bash
> bash deleteme.sh "echo with spaces.sh"
+ '[' -n 'echo with spaces.sh' ']'
+ _file='echo with spaces.sh'
++ readlink -f 'echo with spaces.sh'
+ hpath='/path/deleteme/echo with spaces.sh'
++ basename '/path/deleteme/echo with spaces.sh'
+ cpath='/app/echo with spaces.sh'
+ mount='-v /path/deleteme/echo with spaces.sh:/app/echo with spaces.sh'
+ podman run --rm --entrypoint /bin/bash -v /path/deleteme/echo with spaces.sh:/app/echo with spaces.sh docker.io/library/ubuntu:22.04 '/app/echo with spaces.sh'
Error: short-name "with" did not resolve to an alias and no unqualified-search registries are defined in "/etc/containers/registries.conf"
```

Using quotes around `$mount` won't work.

```bash
if [ -n "$1" ]; then
	_file=$1
    hpath=$(readlink -f "$_file")
    cpath=/app/$(basename "$hpath")
    mount="-v ${hpath}:${cpath}"
fi

podman run \
    --rm \
	--entrypoint /bin/bash \
    "$mount" \
    docker.io/library/ubuntu:22.04 "$cpath"
```

It results in podman trying to create a named volume with a leading space in the name instead of mounting the file.

```bash
> bash deleteme.sh "echo with spaces.sh"
+ '[' -n 'echo with spaces.sh' ']'
+ _file='echo with spaces.sh'
++ readlink -f 'echo with spaces.sh'
+ hpath='/path/deleteme/echo with spaces.sh'
++ basename '/path/deleteme/echo with spaces.sh'
+ cpath='/app/echo with spaces.sh'
+ mount='-v /path/deleteme/echo with spaces.sh:/app/echo with spaces.sh'
+ podman run --rm --entrypoint /bin/bash '-v /path/deleteme/echo with spaces.sh:/app/echo with spaces.sh' docker.io/library/ubuntu:22.04 '/app/echo with spaces.sh'
Error: creating named volume " /path/deleteme/echo with spaces.sh": running volume create option: names must match [a-zA-Z0-9][a-zA-Z0-9_.-]*: invalid argument
```

I'm not entirely sure why podman can parse out the `-v` to know to create a volume, but fail to remove the following space.

[Shell parameter expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html) was the trick.

```bash
if [ -n "$1" ]; then
	_file=$1
    hpath=$(readlink -f "$_file")
    cpath=/app/$(basename "$hpath")
fi

podman run \
    --rm \
	--entrypoint /bin/bash \
    ${_file+-v "${hpath}:${cpath}"} \
    docker.io/library/ubuntu:22.04 "$cpath"
```

This handles the spaces in the file name and mounts it if a file was given to the script.

```bash
> bash deleteme.sh "echo with spaces.sh"
+ '[' -n 'echo with spaces.sh' ']'
+ _file='echo with spaces.sh'
++ readlink -f 'echo with spaces.sh'
+ hpath='/path/deleteme/echo with spaces.sh'
++ basename '/path/deleteme/echo with spaces.sh'
+ cpath='/app/echo with spaces.sh'
+ podman run --rm --entrypoint /bin/bash -v '/path/deleteme/echo with spaces.sh:/app/echo with spaces.sh' docker.io/library/ubuntu:22.04 '/app/echo with spaces.sh'
Hello with spaces!
```

This is nice if there is only ever one file to open, but I want to be able to specify multiple files. Arrays will let me do this.

```bash
hargs=("--rm" "--entrypoint" "/bin/ls")
cargs=()

for token in "${@}"; do
	if [ -f "$token" ]; then
		hpath=$(readlink -f "${token}")
		noleading=$(echo "${hpath}" | cut -c2-)
		cpath=/app/${noleading}

		hargs+=("-v" "${hpath}:${cpath}")
		cargs+=("${cpath}")
	elif [ -d "$token" ]; then
		hpath=$(readlink -f "${token}")
		noleading=$(echo "${hpath}" | cut -c2-)
		cpath=/app/${noleading}

		hargs+=("-v" "${hpath}/:${cpath}/")
		cargs+=("${cpath}")
	else
		cargs+=("${token}")
	fi
done

podman run "${hargs[@]}" docker.io/library/ubuntu:22.04 "${cargs[@]}"
```

An added bonus is that this also lets me pass arguments to the entrypoint.

```text
> bash deleteme.sh -l "echo with spaces.sh" echo.sh
+ hargs=("--rm" "--entrypoint" "/bin/ls")
+ cargs=()
+ for token in "${@}"
+ '[' -f -l ']'
+ '[' -d -l ']'
+ cargs+=("${token}")
+ for token in "${@}"
+ '[' -f 'echo with spaces.sh' ']'
++ readlink -f 'echo with spaces.sh'
+ hpath='/path/deleteme/echo with spaces.sh'
++ echo '/path/deleteme/echo with spaces.sh'
++ cut -c2-
+ noleading='path/deleteme/echo with spaces.sh'
+ cpath='/app/path/deleteme/echo with spaces.sh'
+ hargs+=("-v" "${hpath}:${cpath}")
+ cargs+=("${cpath}")
+ for token in "${@}"
+ '[' -f echo.sh ']'
++ readlink -f echo.sh
+ hpath=/path/deleteme/echo.sh
++ echo /path/deleteme/echo.sh
++ cut -c2-
+ noleading=path/deleteme/echo.sh
+ cpath=/app/path/deleteme/echo.sh
+ hargs+=("-v" "${hpath}:${cpath}")
+ cargs+=("${cpath}")
+ podman run --rm --entrypoint /bin/ls -v '/path/deleteme/echo with spaces.sh:/app/path/deleteme/echo with spaces.sh' -v /path/deleteme/echo.sh:/app/path/deleteme/echo.sh docker.io/library/ubuntu:22.04 -l '/app/path/deleteme/echo with spaces.sh' /app/path/deleteme/echo.sh
-rw-r--r-- 1 root root 26 Apr 20 19:55 /app/path/deleteme/echo with spaces.sh
-rw-r--r-- 1 root root 14 Apr 20 19:53 /app/path/deleteme/echo.sh
```
