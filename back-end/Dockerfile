FROM node

WORKDIR /usr/app

COPY nodemon.json .
COPY package*.json .

RUN npm install


CMD ["npm", "run", "dev"]