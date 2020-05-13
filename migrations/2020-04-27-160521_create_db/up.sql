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

create table points
(
    point point,
    properties hstore,
    id varchar not null
        constraint opendata_pkey
            primary key,
    qid integer
);

create table conflation
(
    id serial not null
        constraint conflation_pk
            primary key,
    qid varchar not null,
    pid varchar not null,
    osmid varchar not null,
    inserted timestamp with time zone default clock_timestamp()
);

create unique index conflation_id_uindex
    on conflation (id);

alter table conflation alter column osmid drop not null;

alter table conflation
    add action varchar;

alter table conflation alter column qid type integer using qid::integer;

create or replace view conflatedpoints as
SELECT p.qid,
       p.id                                          AS pid,
       p.properties -> 'name'::text                  AS name,
       c.id                                          AS cid,
       COALESCE(c.action, 'todo'::character varying) AS action,
       c.inserted,
       c.osmid
FROM points p
         left outer JOIN
     (select u.*
      from conflation u
               JOIN (SELECT max(conflation.id)       AS id,
                            max(conflation.inserted) AS inserted,
                            conflation.qid,
                            conflation.pid
                     FROM conflation
                     GROUP BY conflation.qid, conflation.pid) t
                    ON
                            t.id = u.id
     ) c ON c.qid = p.qid AND c.pid = p.id;