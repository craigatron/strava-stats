FROM node:16-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM node:16-slim
WORKDIR /usr/src/app
COPY server.js ./
RUN mkdir dist
COPY --from=builder /usr/src/app/dist dist/
RUN npm i express
EXPOSE 8080
CMD [ "node", "server.js" ]