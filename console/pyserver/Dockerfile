FROM python:3.11.1-bullseye
ENV PYTHONUNBUFFERED 1

ARG DJANGO_ALLOWED_HOSTS
ARG DJANGO_SECRET_KEY
ARG DJANGO_CORS_ORIGIN_WHITELIST

ENV DJANGO_ALLOWED_HOSTS $DJANGO_ALLOWED_HOSTS
ENV DJANGO_SECRET_KEY $DJANGO_SECRET_KEY
ENV DJANGO_CORS_ORIGIN_WHITELIST $DJANGO_CORS_ORIGIN_WHITELIST

RUN apt-get update
RUN apt-get install gettext -y

RUN mkdir /pyserver
WORKDIR /pyserver
EXPOSE 8081
COPY . /pyserver/
RUN pip install -r requirements.txt

# Install Cron
RUN apt-get install cron -y

# Create the log file
RUN touch /var/log/cron.log

# Add crontab file content to the crontab file
COPY cron /var/spool/cron/crontabs/root

# Give execution rights on the cron job
RUN chmod 0600 /var/spool/cron/crontabs/root

# Run the command on container startup
CMD cron && tail -f /var/log/cron.log