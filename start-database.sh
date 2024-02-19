#!/bin/bash
# Use this script to start a docker container for a local development database

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-database.sh`

# On Lunux and macOS you can run this script directly - `./start-database.sh`

DB_CONTAINER_NAME="nx-local"

if ! [ -x "$(command -v docker)" ]; then
  echo "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi
postgresStarted=false
minioStarted=false
if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME-postgres)" ]; then
  docker start $DB_CONTAINER_NAME-postgres
  echo "Database container started"
  postgresStarted=true
fi
if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME-minio)" ]; then
  docker start $DB_CONTAINER_NAME-minio
  echo "Minio container started"
  minioStarted=true
fi

# import env variables from .env
set -a
source .env

DB_PASSWORD=$(echo $DATABASE_URL | awk -F':' '{print $3}' | awk -F'@' '{print $1}')

if [ "$DB_PASSWORD" = "password" ]; then
  echo "You are using the default database password"
  read -p "Should we generate a random password for you? [y/N]: " -r REPLY
  if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set a password in the .env file and try again"
    exit 1
  fi
  DB_PASSWORD=$(openssl rand -base64 12)
  sed -i -e "s/:password@/:$DB_PASSWORD@/" .env
fi

if [ $postgresStarted = false ]; then
  docker run --name $DB_CONTAINER_NAME-postgres -e POSTGRES_PASSWORD=$DB_PASSWORD -e POSTGRES_DB=nx-local -d -p 5432:5432 docker.io/postgres
  echo "Postgres container was succesfuly created"
fi

if [ $minioStarted = false ]; then
  docker run --name $DB_CONTAINER_NAME-minio -e MINIO_ROOT_USER=$AWS_ACCESS_KEY_ID -e MINIO_ROOT_PASSWORD=$AWS_SECRET_ACCESS_KEY -d -p 9000:9000 -p 9001:9001 quay.io/minio/minio server /data --console-address ":9001"
  echo "Minio container was succesfuly created"
fi
