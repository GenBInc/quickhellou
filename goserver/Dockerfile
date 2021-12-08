FROM golang:alpine

EXPOSE 8089

RUN mkdir /goserver
WORKDIR /goserver/src/collidermain
COPY . /goserver/

RUN go mod tidy
RUN go install

CMD ["collidermain"]