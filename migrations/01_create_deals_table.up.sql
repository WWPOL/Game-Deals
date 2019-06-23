CREATE TABLE deals (
       id SERIAL PRIMARY KEY,
       game TEXT NOT NULL,
       title TEXT NOT NULL,
       start_time TIMESTAMP NOT NULL,
       end_time TIMESTAMP,
       published_time TIMESTAMP,
       price DECIMAL NOT NULL,
       link TEXT NOT NULL,
       description TEXT
)       
