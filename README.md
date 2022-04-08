<div align="center">
  <img src="https://github.com/GenBInc/quickhellou/blob/main/social_assets/repo_header_cropped.png" alt="Quick Hellou"/>
</div>
<h3 align="center">
  Quick Hellou, lets you do just that: connect for a quick hello with anyone you like!
</h3>

<p align="center">
    Super easy for integrations! No accounts to setup and no hoops to jump through, with a single click of the mouse, you’re up and running with a sharable link to a private video chat room.
</p>
<p align="center">
    <a href="https://github.com/GenBInc/quickhellou">
        <img alt="License" src="https://img.shields.io/github/license/genbinc/quickhellou" />
    </a>
    <a href="https://github.com/GenBInc/quickhellou/pulls">
        <img alt="Contribs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" />
    </a>
    <a href="http://commitizen.github.io/cz-cli/">
        <img alt="Commitizen friendly" src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" />
    </a>
</p>

# Quick Hellou

<div align="center">
  <img src="https://github.com/GenBInc/quickhellou/blob/main/social_assets/qh-screens.png" alt="Quick Hellou Stay Connected"/>
</div>

The application provides direct video chat and helpdesk solution based on WebRTC video communications.

The application includes:
* creating multi-peer video conference sessions
* create instalable in-page plugins and create customer service communications.

[Demo https://www.quickhellou.com](https://www.quickhellou.com)
 

The application is built upon two modular applications connected with a shared communication server.  
``
videochat <-> {goserver - collider}{turn server} <-> helpdesk
``

### Tech Stack
Docker, WebRTC, Redis, Collider(Goserver), Coturn, Python (Django), PostgreSQL

<div align="center">
  <img src="https://github.com/GenBInc/quickhellou/blob/main/social_assets/techstack.png" alt="Tech Stack"/>
</div>


### Video Chat application

The WebRTC based video chat application.

```
videochat
```

### Helpdesk application

It provides installable in-page client plugins and the customer-operator communication services.

<div align="center">
  <img src="https://github.com/GenBInc/quickhellou/blob/main/social_assets/helpdesk.png" alt="Quick Hellou Help Desk"/>
</div>


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


## Quick Hellou Install and Run

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

Run the videochat client services.
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