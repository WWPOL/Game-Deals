CREATE TABLE deals (
       id SERIAL PRIMARY KEY,
       game_id INTEGER NOT NULL REFERENCES games,
       start_time TIMESTAMP NOT NULL,
       end_time TIMESTAMP,
       price DECIMAL NOT NULL,
       link TEXT NOT NULL,
       description TEXT
)       
