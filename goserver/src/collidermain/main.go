package main

import (
	"collider"
	"flag"
	"log"
)

var tls = flag.Bool("tls", false, "whether TLS is used")
var port = flag.Int("port", 8089, "The TCP port that the server listens on")
var roomSrv = flag.String("room-server", "http://localhost:8080", "The origin of the room server")

func main() {
	flag.Parse()

	log.Printf("Starting collider: tls = %t, port = %d, room-server=%s", *tls, *port, *roomSrv)

	c := collider.NewCollider(*roomSrv)
	c.Run(*port, *tls)
}
