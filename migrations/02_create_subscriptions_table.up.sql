CREATE TABLE subscriptions (
       id SERIAL PRIMARY KEY,
       registration_token TEXT NOT NULL,
       UNIQUE(registration_token)
)
