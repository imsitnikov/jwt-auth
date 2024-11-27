MIGRATION

```sql
CREATE SEQUENCE counter_seq;

CREATE OR REPLACE FUNCTION get_id(OUT result bigint) AS $$
DECLARE
	our_epoch bigint := 1514754000000;
	seq_id bigint;
	now_millis bigint;
	shard_id int := 10;
BEGIN
	SELECT nextval('counter_seq') % 4096 INTO seq_id;

	SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
	result := (now_millis - our_epoch) << 23;
	result := result | (shard_id << 10);
	result := result | (seq_id);
END;
$$ LANGUAGE PLPGSQL;

--

CREATE TABLE users (
	user_id TEXT PRIMARY KEY,
	display_name TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	login TEXT,
	password TEXT
);

ALTER TABLE users ADD CONSTRAINT local_required_login_password_constraint CHECK (
	user_id NOT LIKE 'local:%' OR
	(
		user_id LIKE 'local:%' AND
		login IS NOT NULL AND
		password IS NOT NULL
	)
);

--

CREATE TABLE sessions (
	session_id BIGINT NOT NULL PRIMARY KEY DEFAULT get_id(),
	user_id TEXT NOT NULL,
	user_agent TEXT NOT NULL,
	user_ip  TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	expired_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE sessions
	ADD CONSTRAINT sessions_user_id_ref FOREIGN KEY (user_id)
	REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

--

CREATE TABLE refresh_tokens (
	refresh_token_id BIGINT NOT NULL PRIMARY KEY DEFAULT get_id(),
	session_id BIGINT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	expired_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE refresh_tokens
	ADD CONSTRAINT refresh_tokens_session_id_ref FOREIGN KEY (session_id)
	REFERENCES sessions(session_id) ON UPDATE CASCADE ON DELETE CASCADE;

```

ROLLBACK

```sql
DROP TABLE refresh_tokens;
DROP TABLE sessions;
DROP TABLE users;
```