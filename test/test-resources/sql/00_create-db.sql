DROP DATABASE IF EXISTS vdev_db;
DROP USER IF EXISTS vdev_user;
CREATE USER vdev_user PASSWORD 'welcome';
CREATE DATABASE vdev_db owner vdev_user ENCODING = 'UTF-8';


\c vdev_db
CREATE EXTENSION hstore;
CREATE EXTENSION pgcrypto;