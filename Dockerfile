FROM alpine:latest

RUN apk add --no-progress -v npm

COPY image-entrypoint.sh /image-entrypoint.sh

ENTRYPOINT ["/image-entrypoint.sh"]
