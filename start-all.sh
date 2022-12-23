docker-compose -f docker-compose.yml -f videochat/docker-compose.yml -f console/docker-compose.yml --env-file ./prod.env up >> /home/webapps/quickhellou/log/qh-all.log &

