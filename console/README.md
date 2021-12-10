# Quick Hellou helpdesk application.

Manages helpdesk application:
* installable in-page plugins
* adminstration console

## Deployment

Run in the `root` folder

```
virtualenv env
source "env/bin/activate"
pip install -r requirements.txt
```

Update DATABASES in `quickhellou/quickhellou/settings.py` with you postgresql db settings

```javascript
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': '<your_db_name>',
        'USER': '<your_username>',
        'PASSWORD': '<your_password>',
        'HOST': '<your_host>',
        'PORT': '5432',
    }
}
```

Once in env scope (there should be a (env) prefix in the command prompt), run:
```
cd quickhellou
python manage.py migrate
```
#### WSGI and Apache

1. Install [mod_wsgi](https://modwsgi.readthedocs.io/en/develop/) Apache module.
2. Update the configuration file
```
WSGIScriptAlias / /{path_to_project}/quickhellou/quickhellou/wsgi.py
WSGIProcessGroup quickhellou
WSGIApplicationGroup %{GLOBAL}

WSGIDaemonProcess quickhellou python-path=/{path_to_project}/env/lib/python3.7/site-packages:/{path_to_project}/quickhellou display-name=%{GLOBAL}
``` 
3. Restart Apache instance.

#### External Resources

[mod_wsgi Installation Guide](https://modwsgi.readthedocs.io/en/develop/user-guides/quick-installation-guide.html)

[How to use Django with Apache and mod_wsgi](https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/modwsgi/)
