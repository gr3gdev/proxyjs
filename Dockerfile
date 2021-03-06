FROM node:slim

WORKDIR /app
COPY index.html /app/.
COPY index.js /app/.
COPY proxy.js /app/.
COPY package.json /app/.

RUN npm install --omit=dev
RUN echo "[]" > blacklist

CMD [ "npm", "start" ]