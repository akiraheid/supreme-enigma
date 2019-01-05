FROM node:11
WORKDIR /app
COPY . /app
EXPOSE 8080
RUN npm install
CMD ["node", "app.js"]
