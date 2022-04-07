# Quick Hellou Video Chat application

The WebRTC based video chat application. It allows:
* multi-peer video chat conferences
* share screen between peers

# Configuration

## Environment params

Update keys in the `.env` configuration file.

## Redis port
[/videochat/redis/redis.conf](https://github.com/GenBInc/quickhellou/blob/main/videochat/redis/redis.conf)

port 6380 -> should be the same as in .env file


## App port
[/videochat/pyserver/Dockerfile](https://github.com/GenBInc/quickhellou/blob/main/videochat/pyserver/Dockerfile)

EXPOSE 8080 -> should be the same as in .env file

## App ssl_cert/key paths
Place your SSL cert and matching key here -> [/videochat/pyserver/ssl](https://github.com/GenBInc/quickhellou/tree/main/videochat/pyserver/ssl)
Files should match cert & key names in .env file

## Collider port/tls
[/goserver/src/collidermain/main.go](https://github.com/GenBInc/quickhellou/blob/main/goserver/src/collidermain/main.go)

var port -> -> should be the same as in .env file
var tls -> true/false (recommended true)

## Collider ssl_cert/key paths

[/goserver/src/collider/collider.go](https://github.com/GenBInc/quickhellou/blob/main/goserver/src/collider/collider.go)

e = server.ListenAndServeTLS("/goserver/ssl/your.crt", "/goserver/ssl/your.key")

Place your SSL cert and matching key here -> [/goserver/ssl](https://github.com/GenBInc/quickhellou/tree/main/goserver/ssl)


