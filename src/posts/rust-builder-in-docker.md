---
date: 2020-06-12
layout: post.pug
title: Building/running the Rust guessing game in a container
---

The goal is to build and run the [guessing game tutorial](https://doc.rust-lang.org/book/ch02-00-guessing-game-tutorial.html) in a container.

I took an interest in [Rust](https://www.rust-lang.org/) about a year ago when I first heard about it. I'm finally taking the time now to sit down and play with it and figured I might as well incorporate containers into my workflow when it's still early on.

# Getting started

First is to set up the working environment. I'll be in the good 'ol `~/repos/` and create a folder for this work.

```bash
$ mkcd rust-guess
```

`mkcd` is helper function I got from a friend for creating a directory and then entering it.

The first place to look for a container to build Rust apps in is DockerHub; sure enough, there's a [rust](https://hub.docker.com/_/rust/) container. It even has some instructions that specify how to use it for building/running apps. The container documentation contains an example Dockerfile for building and running the application, so I'll start from there.

```Dockerfile
FROM rust:1.44 as builder
WORKDIR /usr/src/myapp
COPY . .
RUN cargo install --path .

FROM debian:buster-slim
COPY --from=builder /usr/local/cargo/bin/myapp /usr/local/bin/myapp
CMD ["myapp"]
```

The specs for building the image:

| Stage | Build time (s) | Image size (MB) |
| :-: | :-: | :-: |
| start | 40.621 | 71.9 |

Working on and building the app with these alone works... but it could be better. Some improvements to make:
* Caching the dependencies instead of downloading and recompiling them every time the application is built
* Using a smaller base image for the runtime container

# Caching dependencies

Dependencies are specified in the `Cargo.toml` and `Cargo.lock` files and are downloaded/built in a step prior to compiling the source code. This can be leveraged by caching the compiled dependencies in a layer and reusing that layer when building changes to the app source.

The only time this layer needs to be rebuilt is when the dependencies change, which shouldn't be as often as the app source. Shorter build times in the 90% case? Hellz yes!

[whitfin.io](http://whitfin.io/speeding-up-rust-docker-builds/) provides a good method of preserving the dependency cache.
1. Create layer with default project
1. Copy over dependency-specifying files
1. Download/compile dependencies
1. Copy in the app code
1. Compile app

The modified Dockerfile now takes those steps into account.

```
FROM rust:1.44 as builder

# Cache dependencies
RUN USER=root cargo new --bin /usr/src/myapp
WORKDIR /usr/src/myapp
COPY ./Cargo.toml ./Cargo.toml
COPY ./Cargo.lock ./Cargo.lock
RUN cargo build --release
RUN rm -r src/*.rs

# Build app
COPY ./src ./src
RUN cargo install --path .

# Package app
FROM debian:buster-slim
COPY --from=builder /usr/local/cargo/bin/myapp /usr/local/bin/myapp
CMD ["myapp"]
```

The specs with cache utilization:

| Type | Time (s) |
| :-: | :-: |
| initial | 65.167 |
| subsequent | 8.409 |

# Smaller base image

whitfin.io suggests using a smaller base image like `rust:jessie-slim` for the runtime container, since we don't need Rust's `cargo` and compiler to run the app. However, we're already using debian:buster-slim, so we're already smaller than using `rust:jessie-slim` (26.47 MB vs 448.35 MB).

~72MB is already pretty small, but I think it can get smaller by using an Alpine Linux image.

In order to do this, changing both the build _and_ runtime base images are required so that the necessary files are available/compiled into the app.

```
FROM rust:1.44-alpine as builder

# Cache dependencies
# snip

# Package app
FROM alpine:3.12
# snip
```

That's it. Everything else stays the same. 

The results of using the Alpine base images is a much smaller runtime image.

| Image | Image size (MB) |
| :-: | :-: |
| debian:buster-slim | 71.9 |
| alpine:3.12 | 8.51 |

# Conclusion

The tutorial app started with a long build time and fairly large image. After some slight modification, the app build time was reduced by ~79% and the image size was reduced by ~88%.

| Stage | Build time (s) | Image size (MB) |
| :-: | :-: | :-: |
| start | 40.621 | 71.9 |
| cache | 8.409 | 71.9 |
| alpine | 8.488 | 8.51 |
