"""
Django settings for qhv2 project.

Generated by 'django-admin startproject' using Django 3.2.5.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.2/ref/settings/
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-gv*^x*l!1v6w0@^*x!i0w1j(5&m*aph)k(*!a*3z#=tr6#@5u^'

WSTLS = os.environ.get('SERVER_GATEWAY_INTERFACE') == 'Web'
if not WSTLS:
    WSTLS = False

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = WSTLS == False

if WSTLS:
    ALLOWED_HOSTS = ['<your_app_url>']
    VERIFY = '<your_ssl_certificate_file_url>'
    HOST_URL = '<your_host_url>'
else:
    ALLOWED_HOSTS = []
    VERIFY = False
    HOST_URL = 'localhost'
	
X_FRAME_OPTIONS = 'SAMEORIGIN'

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
	'corsheaders',
    'rest_framework',
    'videochat'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
	'corsheaders.middleware.CorsMiddleware',
]

ROOT_URLCONF = 'qhv2.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'qhv2.wsgi.application'


# Database
# https://docs.djangoproject.com/en/3.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/

STATIC_URL = '/static/'

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


REST_FRAMEWORK = {
    # Use Django's standard `django.contrib.auth` permissions,
    # or allow read-only access for unauthenticated users.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.DjangoModelPermissionsOrAnonReadOnly'
    ]
}

# Videochat


# Deprecated domains which we should to redirect to REDIRECT_URL.
REDIRECT_DOMAINS = []
# URL which we should redirect to if matching in REDIRECT_DOMAINS.
REDIRECT_URL = '<app_url>'

ICE_SERVER_BASE_URL = '<turn_server_name:port>'
ICE_SERVER_URL_TEMPLATE = '%s/turn?key=%s&username=<username>'
ICE_SERVER_API_KEY = '<username>'
CEOD_KEY = '<username>'

# Dictionary keys in the collider instance info constant.
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
else:
    WSS_INSTANCE_HOST_KEY = 'localhost:8089'
    WSS_INSTANCE_NAME_KEY = 'vm_name'
    WSS_INSTANCE_ZONE_KEY = 'zone'
    WSS_INSTANCES = [{
        WSS_INSTANCE_HOST_KEY: 'localhost:8089',
        WSS_INSTANCE_NAME_KEY: 'wsserver-std',
        WSS_INSTANCE_ZONE_KEY: 'us-central1-a'
    }, {
        WSS_INSTANCE_HOST_KEY: 'localhost:8089',
        WSS_INSTANCE_NAME_KEY: 'wsserver-std-2',
        WSS_INSTANCE_ZONE_KEY: 'us-central1-f'
    }]
    # memcache key for the active collider host.
    WSS_HOST_ACTIVE_HOST_KEY = 'localhost:8089'

WSS_HOST_PORT_PAIRS = [ins[WSS_INSTANCE_HOST_KEY] for ins in WSS_INSTANCES]

# Dictionary keys in the collider probing result.
WSS_HOST_IS_UP_KEY = 'is_up'
WSS_HOST_STATUS_CODE_KEY = 'status_code'
WSS_HOST_ERROR_MESSAGE_KEY = 'error_message'

# Turn/Stun server override. This allows AppRTC to connect to turn servers
# directly rather than retrieving them from an ICE server provider.
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

RESPONSE_ERROR = 'ERROR'
RESPONSE_ROOM_FULL = 'FULL'
RESPONSE_UNKNOWN_ROOM = 'UNKNOWN_ROOM'
RESPONSE_UNKNOWN_CLIENT = 'UNKNOWN_CLIENT'
RESPONSE_DUPLICATE_CLIENT = 'DUPLICATE_CLIENT'
RESPONSE_SUCCESS = 'SUCCESS'
RESPONSE_INVALID_REQUEST = 'INVALID_REQUEST'

CORS_ORIGIN_ALLOW_ALL = True