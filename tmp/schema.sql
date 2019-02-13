DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL,
    first text,
    last text,
    primary key(id)
);

INSERT into users(first, last) values ('kent', 'ogisu');
INSERT into users(first, last) values ('john', 'doe');
INSERT into users(first, last) values ('jane', 'doe');