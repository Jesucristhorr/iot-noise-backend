FROM node:16-alpine

WORKDIR /app

# app port
EXPOSE ${PORT}

COPY . .

RUN npm i
RUN npm run build

CMD [ "npm", "run", "start" ]
