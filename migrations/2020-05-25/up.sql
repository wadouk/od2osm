create view conflatedpoints(qid, pid, name, cid, action, inserted, osmid) as
SELECT p.qid,
       p.id                                                                AS pid,
       COALESCE(p.properties -> 'name'::text, p.properties -> 'ref'::text) AS name,
       c.id                                                                AS cid,
       COALESCE(c.action, 'todo'::character varying)                       AS action,
       c.inserted,
       c.osmid
FROM points p
         LEFT JOIN (SELECT u.id,
                           u.qid,
                           u.pid,
                           u.osmid,
                           u.inserted,
                           u.action
                    FROM conflation u
                             JOIN (SELECT max(conflation.id)       AS id,
                                          max(conflation.inserted) AS inserted,
                                          conflation.qid,
                                          conflation.pid
                                   FROM conflation
                                   GROUP BY conflation.qid, conflation.pid) t ON t.id = u.id) c
                   ON c.qid = p.qid AND c.pid::text = p.id::text;