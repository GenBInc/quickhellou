FROM redis:bullseye
COPY redis.conf /usr/local/etc/redis/redis.conf
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]

RUN touch /var/log/redis.log
RUN chmod 777 /var/log/redis.log

RUN echo "\nvm.overcommit_memory = 1\n" >> /etc/sysctl.conf