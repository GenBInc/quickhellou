# Quick Hellou

The application provides helpdesk solution based on WebRTC video communications.

The application includes:
* creating multi-peer video conference sessions
* create instalable in-page plugins and create customer service communications.

[Demo](https://www.quickhellou.com)
 
## The application

The application is built upon two modular applications connected with a shared communication server.  
``
videochat <-> goserver <-> console
``
### Video Chat application

The WebRTC based video chat application.

```
videochat
```

### Helpdesk application

It provides installable in-page client plugins and the customer-operator communication services.
```
console
```

### Websocket server

Server application to manage user-to-user communications.
```
goserver
```

### TURN/STUN server

The TURN server guidelines for relaying the traffic between peers.
```
turn
```


## Development

In order to install the development environment it's required to install the [Docker](https://www.docker.com/) service. 
\
### Install and run
\
Run all services for both the videochat and the console applications.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.yml -f console/docker-compose.yml up
```

Run the videochat services.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.yml up
```

Run the console services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.yml up
```

Run the videochat server services.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.server.yml up
```

Run the videochat client services.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.client.yml up
```

Run the console server services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.server.yml up
```

Run the console client services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.client.yml up
```



