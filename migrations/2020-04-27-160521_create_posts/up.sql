-- Your SQL goes here
create database od2osm;


CREATE EXTENSION if not exists hstore;

create table if not exists opendata
(
	point point,
	properties hstore,
	id VARCHAR primary key
);

create table quests
(
	id serial,
	name varchar,
	url varchar
);

create unique index quests_id_uindex
	on quests (id);

create unique index quests_name_uindex
	on quests (name);

alter table quests
	add constraint quests_pk
		primary key (id);

