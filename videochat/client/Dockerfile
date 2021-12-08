FROM node:17
USER root

RUN apt-get update && apt-get install -y inotify-tools

RUN mkdir /client
WORKDIR /client
COPY . /

RUN npm i
RUN npm i -g webpack webpack-cli