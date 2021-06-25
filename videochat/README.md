# Video chat application.

The WebRTC based video chat application. It allows:
* multi-peer video chat conferences
* share screen
* schedule meetings

## References

Initially based on the [AppRTC project](https://github.com/webrtc/apprtc).

## External services

In order to run video chat application it's required to have a working signaling server.
```
collider
```

## Requirements

[Python 2.7](https://www.python.org/downloads/release/python-2717)

[PIP](https://pip.pypa.io/en/stable/installing)

[Google App Engine](https://cloud.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python)

[Node.js](https://nodejs.org/en)

[npm](https://www.npmjs.com/get-npm)

## Installation

### Back-end application
1. Update the *run.bat* script with paths:
* Python 2 path (default C:\Python27\python)
* GAE path (default c:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\dev_appserver.py)

2.Run GAE service
```
./run.bat
```

### Front application

1. Install dependencies
```
npm i
```

2. Compile and watch for developmment purposes
```
npm run watch
```

3. Compile and for production purposes
```
npm run production
```


### Links

AppRTC 
[AppRTC project](https://github.com/webrtc/apprtc)

RTCMultiConnection - WebRTC JavaScript Library
[RTCMultiConnection](https://github.com/muaz-khan/RTCMultiConnection)