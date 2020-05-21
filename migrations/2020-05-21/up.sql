alter table quests
    add uuid uuid;

create unique index quests_uuid_uindex
    on quests (uuid);

update quests set uuid=md5(random()::text || clock_timestamp()::text)::uuid;

alter table quests alter column uuid set not null;
