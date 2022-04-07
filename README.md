<div align="center">
  <img src="" height="60px" alt="Quick Hellou"/>
</div>


# Quick Hellou

The application provides helpdesk solution based on WebRTC video communications.

The application includes:
* creating multi-peer video conference sessions
* create instalable in-page plugins and create customer service communications.

[Demo](https://www.quickhellou.com)
 
## The application

The application is built upon two modular applications connected with a shared communication server.  
``
videochat <-> {goserver - collider}{turn server} <-> console
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

In order to install the development environment it's required to install the [Docker](https://www.docker.com) service. 

!!! Please read also !!!
/videochat/README.md


### Install and run

Edit .env file
https://github.com/GenBInc/quickhellou/blob/main/.env


##VIDEOCHAT & CONSOLE

//////////////////////////////////////////////////////////////////////
Run all services for both the videochat and the console applications.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.yml -f console/docker-compose.yml --env-file ./your-file.env up
```
//////////////////////////////////////////////////////////////////////


##VIDEOCHAT

///////////////////////////////////
Run the videochat services only.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.yml --env-file ./your-file.env up
```
///////////////////////////////////


Run the videochat server services.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.server.yml --env-file ./your-file.env up
```

Run the videochat client services.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.client.yml --env-file ./your-file.env up
```

##CONSOLE

///////////////////////////////////
Run the console services only.
```
docker-compose -f docker-compose.yml -f console/docker-compose.yml --env-file ./your-file.env up
```
///////////////////////////////////

Run the console server services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.server.yml --env-file ./your-file.env up
```

Run the console client services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.client.yml --env-file ./your-file.env up
```

## Contributing

Please read our [Contributing Guide](https://github.com/GenBInc/quickhellou/blob/main/CONTRIBUTING.md) before submitting a Pull Request to the project.

## Licensing

Quick Hellou source code is released under the [MIT License](https://github.com/GenBInc/quickhellou/blob/main/LICENSE.md).