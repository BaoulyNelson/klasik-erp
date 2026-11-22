#!/bin/sh
set -eu

python manage.py migrate --noinput

if [ "${DJANGO_CACHE_BACKEND:-database}" = "database" ]; then
    python manage.py createcachetable "${DJANGO_CACHE_TABLE:-django_cache}"
fi

python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${WEB_CONCURRENCY:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --error-logfile -
