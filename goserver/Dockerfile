FROM golang:alpine

RUN mkdir /goserver
WORKDIR /goserver/src/collidermain
COPY . /goserver/

RUN go mod tidy
RUN go install collidermain

CMD ["collidermain"]