FROM redis:bullseye
COPY redis.conf /usr/local/etc/redis/redis.conf
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]

RUN touch /var/log/redis.log
RUN chmod 777 /var/log/redis.log

RUN chmod 777 -R /data
RUN chmod 777 -R /etc

RUN echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf