FROM node:17-alpine

WORKDIR /src

COPY package* .

RUN npm ci

ENTRYPOINT ["node", "app.js"]
