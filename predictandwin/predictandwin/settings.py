from pathlib import Path
import os
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qsl

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Security
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',

    'main',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Static files middleware
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'predictandwin.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates'
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'predictandwin.wsgi.application'


# Database
if DEBUG:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    tmpPostgres = urlparse(os.getenv("DATABASE_URL"))

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': tmpPostgres.path.replace('/', ''),
            'USER': tmpPostgres.username,
            'PASSWORD': tmpPostgres.password,
            'HOST': tmpPostgres.hostname,
            'PORT': 5432,
            'OPTIONS': dict(parse_qsl(tmpPostgres.query)),
        }
    }

AUTH_USER_MODEL = "main.User"

# Password validation
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
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Kathmandu'
USE_TZ = True

USE_I18N = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'

# STATIC_ROOT is where collectstatic gathers everything for deployment
STATIC_ROOT = BASE_DIR / 'staticfiles'

# STATICFILES_DIRS must be set regardless of DEBUG, otherwise collectstatic
# won't pick up files from your project-level 'static' folder in production
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

if not DEBUG:
    STATICFILES_STORAGE = (
        'whitenoise.storage.CompressedManifestStaticFilesStorage'
    )

# MEDIA FILES (Images, Uploads)

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# DEFAULT PRIMARY KEY
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ]
}

# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp.gmail.com"
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_TIMEOUT = 10
# EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
# EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

RESEND_API_KEY = os.getenv('RESEND_API_KEY')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')