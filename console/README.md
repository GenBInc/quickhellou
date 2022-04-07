# Quick Hellou Helpdesk application.

Manages helpdesk application:
* installable in-page plugins
* adminstration console

# Configuration

## Environment params

Update keys in the `.env` configuration file.

## App port
[/console/pyserver/Dockerfile](https://github.com/GenBInc/quickhellou/blob/main/console/pyserver/Dockerfile)

EXPOSE 8081 -> should be the same as in .env file


## App ssl_cert/key paths
Place your SSL cert and matching key here -> [/console/pyserver/ssl](https://github.com/GenBInc/quickhellou/tree/main/console/pyserver/ssl)
Files should match cert & key names in .env file

## Collider port/tls
[/goserver/src/collidermain/main.go](https://github.com/GenBInc/quickhellou/blob/main/goserver/src/collidermain/main.go)

var port -> -> should be the same as in .env file
var tls -> true/false (recommended true)

## Collider ssl_cert/key paths

[/goserver/src/collider/collider.go](https://github.com/GenBInc/quickhellou/blob/main/goserver/src/collider/collider.go)

e = server.ListenAndServeTLS("/goserver/ssl/your.crt", "/goserver/ssl/your.key")

Place your SSL cert and matching key here -> [/goserver/ssl](https://github.com/GenBInc/quickhellou/tree/main/goserver/ssl)
