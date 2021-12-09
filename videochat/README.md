# Video chat application.

The WebRTC based video chat application. It allows:
* multi-peer video chat conferences
* share screen between peers

## References

Initially based on the [AppRTC project](https://github.com/webrtc/apprtc).
Currently it's a Py3/Django application that uses the Redis server for memory caching.

## Python application installation guide

### Windows

Update keys in the `qhv2/qhv2/settings.py` configuration file with your settings.

```javascript

if WSTLS:
    ALLOWED_HOSTS = ['<your_app_url>']
    VERIFY = '<your_ssl_certificate_file_url>'
    HOST_URL = '<your_host_url>'

ICE_SERVER_BASE_URL = '<turn_server_name:port>'
ICE_SERVER_URL_TEMPLATE = '%s/turn?key=%s&username=<username>'
ICE_SERVER_API_KEY = '<username>'
CEOD_KEY = '<username>'

if WSTLS:
    WSS_INSTANCE_HOST_KEY = '<host_name:port>'
    WSS_INSTANCE_NAME_KEY = 'vm_name'
    WSS_INSTANCE_ZONE_KEY = 'zone'
    WSS_INSTANCES = [{
        WSS_INSTANCE_HOST_KEY: '<host_name:port>',
        WSS_INSTANCE_NAME_KEY: 'wsserver-std',
        WSS_INSTANCE_ZONE_KEY: 'us-central1-a'
    }, {
        WSS_INSTANCE_HOST_KEY: '<host_name:port>',
        WSS_INSTANCE_NAME_KEY: 'wsserver-std-2',
        WSS_INSTANCE_ZONE_KEY: 'us-central1-f'
    }]
    WSS_HOST_ACTIVE_HOST_KEY = '<host_name:port>'

ICE_SERVER_OVERRIDE = [
    {
        "credential": "<username>",
        "username": "<username>",
        "urls": [
            "turn:<turn_server_name:port>?transport=udp",
            "turn:<turn_server_name:port>?transport=tcp"
        ]
    },
    {
        "urls": [
            "stun:<sturn_server_name:stun_port>"
        ]
    }
]
```

### Configure Django WSGI application in the Apache server.

1. Install [mod_wsgi](https://modwsgi.readthedocs.io/en/develop/) Apache module.
2. Update the configuration file
```
WSGIScriptAlias / /{path_to_project}/qhv2/qhv2/wsgi.py
WSGIProcessGroup qhv2
WSGIApplicationGroup %{GLOBAL}

WSGIDaemonProcess qhv2 python-path=/{path_to_project}/env/lib/python3.7/site-packages:/{path_to_project}/qhv2 display-name=%{GLOBAL}
``` 
3. Restart Apache instance.

## Front application

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

### Useful links

AppRTC
[AppRTC project (based on GAE/Py2)](https://github.com/webrtc/apprtc)

RTCMultiConnection - WebRTC JavaScript Library
[RTCMultiConnection](https://github.com/muaz-khan/RTCMultiConnection)