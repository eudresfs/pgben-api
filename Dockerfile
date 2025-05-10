FROM node:20-alpine

WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build

EXPOSE 3000

CMD ["./node_modules/.bin/pm2", "start", "dist/main.js", "--no-daemon", "--name", "ms-crm"]

