FROM node:22-alpine

WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build

EXPOSE 3000

CMD yarn start:pm2

