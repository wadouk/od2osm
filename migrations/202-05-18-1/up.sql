create table comment
(
    pid varchar,
    comment varchar
);

create index comment_pid_index
    on comment (pid);

alter table comment
    add qid varchar;

