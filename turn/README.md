# TURN/STUN server

## Installation

Install [coturn server](https://github.com/coturn/coturn) according to the documentation.

## Configuration

As outlined in the [original AppRTC documentation](https://github.com/webrtc/apprtc#turnstun)

If using TURN and STUN servers directly

Either:

Comment out `TURN_SERVER_OVERRIDE = []` and then uncomment `TURN_SERVER_OVERRIDE = [ { "urls":...]` three lines below and fill your TURN server details, e.g.

```python
TURN_SERVER_OVERRIDE = [
  {
"urls": [
  "turn:hostnameForYourTurnServer:19305?transport=udp",
  "turn:hostnameForYourTurnServer:19305?transport=tcp"
],
"username": "TurnServerUsername",
"credential": "TurnServerCredentials"
  },
  {
"urls": [
  "stun:hostnameForYourStunServer:19302"
]
  }
]
```

Or:

Set the the comma-separated list of STUN servers in app.yaml. e.g.

```
ICE_SERVER_URLS: "stun:hostnameForYourStunServer,stun:hostnameForYourSecondStunServer"
```