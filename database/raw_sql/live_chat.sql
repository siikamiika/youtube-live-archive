-- ---------
-- migration
-- ---------
CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP TABLE IF EXISTS youtube_live_chat_message;

CREATE TABLE youtube_live_chat_message (
    video_id varchar(255),
    seq integer,
    time_range int4range,
    data jsonb
);
CREATE UNIQUE INDEX youtube_live_chat_message_pkey ON youtube_live_chat_message (video_id, seq);
CREATE INDEX youtube_live_chat_message_video_time_range ON youtube_live_chat_message USING GIST (video_id, time_range);
ALTER TABLE youtube_live_chat_message ADD CONSTRAINT youtube_live_chat_message_videos_fk FOREIGN KEY (video_id) REFERENCES videos (id);

-- ---------
-- cluster
-- ---------
CLUSTER youtube_live_chat_message USING youtube_live_chat_message_pkey;

-- ---------
-- examples
-- ---------

-- get all messages at video starting point
SELECT *
FROM youtube_live_chat_message
WHERE video_id = 'xxxxxxxxxxx'
    AND time_range @> 0;

-- get next 100 messages
SELECT *
FROM youtube_live_chat_message
WHERE video_id = 'xxxxxxxxxxx'
    AND seq > 433
LIMIT 100;

-- get all messages in video offset range [520000, 530000)
-- when previous sequence is unknown (after seek)
SELECT *
FROM youtube_live_chat_message
WHERE video_id = 'xxxxxxxxxxx'
    AND time_range && int4range(520000, 530000);

-- search text
SELECT
    video_id,
    seq,
    time_range,
    jsonb_agg(message_run->'text')
FROM (
    SELECT
        video_id,
        seq,
        time_range,
        jsonb_array_elements(renderer->'message'->'runs') AS message_run
    FROM (
        SELECT
            video_id,
            seq,
            time_range,
            coalesce(
                action->'addChatItemAction'->'item'->'liveChatTextMessageRenderer',
                action->'addChatItemAction'->'item'->'liveChatPaidMessageRenderer'
            ) AS renderer
        FROM (
            SELECT
                video_id,
                seq,
                time_range,
                jsonb_array_elements(data->'replayChatItemAction'->'actions') AS action
            FROM youtube_live_chat_message
            WHERE video_id = 'xxxxxxxxxxx'
        ) AS t
    ) AS t2
) AS t3
WHERE message_run->>'text' LIKE '%草%'
GROUP BY video_id, seq, time_range;
