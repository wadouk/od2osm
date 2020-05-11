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


create table conflation
(
    id serial not null
        constraint conflation_pk
            primary key,
    qid varchar not null,
    pid varchar not null,
    osmid varchar not null,
    inserted date default clock_timestamp()
);

alter table conflation owner to postgres;

create unique index conflation_id_uindex
    on conflation (id);

alter table conflation alter column osmid drop not null;

alter table conflation
    add action varchar;

