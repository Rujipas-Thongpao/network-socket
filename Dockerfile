FROM node:lts-alpine3.17

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install

RUN npm install -g nodemon

COPY . .

CMD ["sh", "-c", "npm run db:deploy && npm run dev"]