FROM node:slim

WORKDIR /app
COPY index.html /app/.
COPY index.js /app/.
COPY proxy.js /app/.
COPY package.json /app/.
COPY proxy.sh /app/.

RUN npm install --omit=dev
RUN echo "[]" > blacklist
RUN chmod +x proxy.sh

ENTRYPOINT [ "/app/proxy.sh" ]