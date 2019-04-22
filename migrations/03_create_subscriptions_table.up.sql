CREATE TABLE subscriptions (
       id SERIAL PRIMARY KEY,
       email TEXT NOT NULL,
       notify_email BOOLEAN NOT NULL,
       notify_push BOOLEAN NOT NULL,
       verify_token TEXT NOT NULL,
       verified BOOLEAN NOT NULL,
       UNIQUE(email),
       UNIQUE(verify_token)
)
