-- Your SQL goes here
create database od2osm;


CREATE EXTENSION if not exists hstore;

create table if not exists opendata
(
	point point,
	properties hstore,
	id VARCHAR primary key
);