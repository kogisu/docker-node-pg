FROM node:10

WORKDIR /app
COPY ./package.json .

RUN npm install --verbose
COPY . .

CMD "npm run dev"