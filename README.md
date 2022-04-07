<div align="center">
  <img src="" height="60px" alt="Quick Hellou"/>
</div>


# Quick Hellou

The application provides helpdesk solution based on WebRTC video communications.

The application includes:
* creating multi-peer video conference sessions
* create instalable in-page plugins and create customer service communications.

[Demo](https://www.quickhellou.com)
 

The application is built upon two modular applications connected with a shared communication server.  
``
videochat <-> {goserver - collider}{turn server} <-> helpdesk
``
### Video Chat application

The WebRTC based video chat application.

```
videochat
```

### Helpdesk application

It provides installable in-page client plugins and the customer-operator communication services.
```
helpdesk
```

## Execution environment

In order to install the execution environment it's required to install the [Docker](https://www.docker.com) service. 

!!! Please read also for configurion guides!!!
[Read /videochat/README.md](https://github.com/GenBInc/quickhellou/blob/main/videochat/README.md)


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
[Read /turn/README.md](https://github.com/GenBInc/quickhellou/blob/main/turn/README.md) for installation guidelines.


## Quick Hellou Install and run

##UPDATE/EDIT PARAMS

Edit [.env](https://github.com/GenBInc/quickhellou/blob/main/.env) file
https://github.com/GenBInc/quickhellou/blob/main/.env


##BUILD VIDEOCHAT & HELPDESK

//////////////////////////////////////////////////////////////////////
Build all services for both the videochat and the helpdesk applications.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.yml -f console/docker-compose.yml --env-file ./your-file.env build
```
//////////////////////////////////////////////////////////////////////


##RUN VIDEOCHAT & HELPDESK

//////////////////////////////////////////////////////////////////////
Run all services for both the videochat and the helpdesk applications.
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.yml -f console/docker-compose.yml --env-file ./your-file.env up
```
//////////////////////////////////////////////////////////////////////


##RUN VIDEOCHAT ONLY

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

Run the videochat client services (collider).
```
docker-compose -f docker-compose.yml -f videochat/docker-compose.client.yml --env-file ./your-file.env up
```

##RUN HELPDESK ONLY

///////////////////////////////////
Run the helpdesk services only.
```
docker-compose -f docker-compose.yml -f console/docker-compose.yml --env-file ./your-file.env up
```
///////////////////////////////////

Run the helpdesk server services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.server.yml --env-file ./your-file.env up
```

Run the helpdesk client services.
```
docker-compose -f docker-compose.yml -f console/docker-compose.client.yml --env-file ./your-file.env up
```

## Contributing

Please read our [Contributing Guide](https://github.com/GenBInc/quickhellou/blob/main/CONTRIBUTING.md) before submitting a Pull Request to the project.

## Licensing

Quick Hellou source code is released under the [MIT License](https://github.com/GenBInc/quickhellou/blob/main/LICENSE.md).