package main

import (
	"collider"
	"flag"
	"log"
)

var tls = flag.Bool("tls", true, "whether TLS is used")
var port = flag.Int("port", 8099, "The TCP port that the server listens on")
var roomSrv = flag.String("room-server", "https://www.quickhellou.com", "The origin of the room server")

func main() {
	flag.Parse()

	log.Printf("Starting collider: tls = %t, port = %d, room-server=%s", *tls, *port, *roomSrv)

	c := collider.NewCollider(*roomSrv)
	c.Run(*port, *tls)
}
