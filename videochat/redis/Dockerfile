FROM redis:bullseye
COPY redis.conf /usr/local/etc/redis/redis.conf
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]

RUN touch /var/log/redis.log && chown redis:redis /var/log/redis.log
