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

alter table conflation alter column qid type integer using qid::integer;

create or replace view conflatedpoints as
select p.qid,
       p.id                 as pid,
       properties -> 'name' as name,
       c.id                 as cid,
       coalesce(c.action, 'todo') as action,
       c.inserted,
       c.osmid
from points p
         left outer join conflation c on (c.qid = p.qid
    and c.pid = p.id)
         left outer join
     (select max(id) id, max(inserted) inserted
      from conflation
      group by qid, pid) t
     on t.id = c.id