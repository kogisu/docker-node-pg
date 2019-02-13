# Docker (Nodejs App with React and Express)
Node app in docker container with postgres/ express / react integration

  - [Dockerfile](#dockerfile)
  - [Docker compose (production)](#docker-compose-production)
    - [Questions](#questions)
    - [Compose file](#compose-file)
    - [Properties](#properties)
     - [running docker compose](#running-docker-compose-dev)
  - [Postgres](#postgres)
    - [Starting postgres](#starting-postgres)
    - [Seed db](#seed-db)
    - [Run server after database is created](#run-server-after-database-is-created)
  - [Docker compose dev (development)](#docker-compose-dev-development)
    - [Questions](#questions)
    - [Compose file](#compose-file)
    - [Differences](#differences)
    - [Main-ui](#main-ui-docker-service)
    - [Proxy](#proxy)
    - [running docker compose dev](#running-docker-compose-dev)
  - [Using a corporate proxy](#using-a-corporate-proxy)
  - [Resources](#resources)
    - [corporate proxy](#corporate-proxy)
    - [building node app in docker & docker refs](building-node-app-in-docker--docker-refs)
    - [debugging](#debugging)
    - [networking](#networking)
    - [postgres](#postgres)
    
## dockerfile
This is the build step of docker image.  When running `docker build -t docker-node-pg:latest`, docker will run through the docker file run by line as if it is setting up the app and its' dependencies from scratch.  

```
# starting point.  Runs all commands from a node image (from dockerhub)
FROM node:10
# sets the working directory of the app.  If the direcoty does not exist, it will be created.
WORKDIR /app
# copies the package.json file from root of host directory to working directory in docker container
COPY ./package.json .
# runs npm install all (production + development) (verbose to show any errors if any)
RUN npm install --verbose
#copies all files from host root directory to working directory in container.  Copies from prior are cached and will not be duplicated
COPY . .
# runs node server
CMD "npm start"
```

## docker compose (production)

### Questions
A list of things we need to know before all of this is configured...
1. What are the credentials for the postgres db (username, password, host, port)?
   - For postgres, we add environment variables `POSTGRES_USER`, `POSTGRES_PASSWORD`, `HOST`, `POSTGRES_PORT`, where...
   - `POSTGRES_USER=postgres` // This can be anything
   - `POSTGRES_PASSWORD=docker` // This can be anything
   - `HOST=db` // This is important... It is the name of the service the postgres docker container is created from
   - `POSTGRES_PORT=5432` // This is by convention
2. What port is the server listening on?
   -  `PORT=3000` // This can be anything, as long as it is not already used on the host.  
3. How do we start the postgres db (createdb, add our credentials)?
   - This is generally done using a start script.  We will get to this later
4. How do we seed the db?
   - This is done on the server docker container.  We would run some `schema.sql` file or `node seed.js` script.  
5. How do we wait for the db to be seeded before we can connect the server to it?
   - This is using a `wait-for-it.sh` file.  This is a provided file for the postgres image, and can be replaced.   
6. How do we connect to the db?
   - This is done through the bridge network.  By default, all services on a `docker-compose.yml` are connected through a bridge network.  This can be changed to a different network type, but for this case, a bridge network will work best.  The way we can connect the web container to the db container is by using `HOST` mentioned before.  By naming the postgres container `db`, we are specifying the host of the postgres container to be `db`.  This hostname can be used in other containers by adding a property on the web container `depends_on` to `db`.  
   
Now that we have all the info we need for this, we can get started on the `docker-compose` file...

### Compose file
```
#Docker-compose.yml (production)
version: '2'
services:
  server:
    build: .
    image: docker-pg
    environment:
      - PORT=3000
      - HOST=db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=docker
      - POSTGRES_PORT=5432
    depends_on: 
      - db
    ports:
      - "3001:3000"
    command: ["./wait-for-it.sh", "db:5432", "--", "npm", "run", "start"]
  
  db:
    image: postgres
    ports: 
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=docker
    volumes:
      - ./tmp:/docker-entrypoint-initdb.d
```
There is some stuff we didn't mention before, so let's go through what all of this is...

### Properties
- `server` is the service container name
- `build` is the context where the docker image is built.  If `.`, this means root of the directory
- `image` is the image name when it is created
- `environment` is a list of environment variables available to the container, and is automatically provided through `process.env`
- `depends_on` was mentioned before, but is how we link the web container to the db container.  The web container depends on the db.  
- `ports` is how we add port mapping.  This is not to be confused with port exposing.  "3001:3000" means that port 3001 will be used on the host machine where the docker container listens on port 3000.  Exposing is not required unless you want to connect these containers with containers outside of the network.
- `command` is the execution script to start the container.  This will start the app
- `volumes` is how you mount volumes in the docker container or mount volumes from the container to the local machine.


### Running docker compose
```
#In order to run the docker-compose file, run:    
docker-compose up
#To shut down the containers, run:
docker-compose down
```

## Postgres

### Starting postgres
Once the `docker-compose` file is created, we can figure out how to start postgres.  We can do this by using a start script.  Within the volumes property of the `db` container, we see `- ./tmp:/docker-entrypoint-initdb.d`.  This is a specific volume inside the postgres container, which is built in.  Anything copied to the directory `/docker-entrypoint-initdb.d` is automatically executed when the container is started.  We mount this volume to a `./tmp` directory on the host machine.  Within the directory is a shell script with the following... 
```
#!/bin/bash

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER docker;
    CREATE DATABASE docker;
    GRANT ALL PRIVILEGES ON DATABASE docker TO docker;
EOSQL
```
This is not a shell scripting tutorial, so I will not go over this.  All this does is create default credentials superUser `docker` (no password required) and database `docker`.  It will also add additional credentials to the postgres db with the credentials provided in the `environment` property of the `docker-compose.yml` file.   

`POSTGRES_USER` and `POSTGRES_PASSWORD` are also added to the postgres docker container exclusively for the start script above and utilized as variables.  

### Seed db
As mentioned above, anything added in the mounted volume to `/docker-entrypoint-initdb.d` will be executed, including `*.sql`, `*.sql.gz`, or `*.sh` will be run.  So we add our `schema.sql` file in the directory.       

```
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
```
The database was already created as `docker` so we don't need to create it again nor do we need to check if it was created.  

### Run server after database is created
If you ran the docker container as is, you'd most likely get issues connecting to the db, mainly because the server is running before the postgres docker container is run.  Something along the lines of ...
```
psql: could not connect to server: Connection refused
    Is the server running on host "0.0.0.0" and accepting
    TCP/IP connections on port 5432?
```
But wait.... Didn't we specify `depends_on` on the web container, which tells docker to run `db` first???  
yes, that is true, but docker does not wait for `db` to finish running before running the web container `server`.  In order to wait for the db, we need to run a script that loops a timer until the db credentials are set.  

A `wait-for-it.sh` file was added to the root directory of the app.  This file is provided by the `postgres` open source community, and can be copied from [wait-for-it script](https://github.com/vishnubob/wait-for-it).  For more info see [control postgres startup and shutdown](https://docs.docker.com/compose/startup-order/).  
Once the file is copied, an execution command needs to be provided to the server container, which will start the node app when and only when the db is created.  
The execution script is as follows:   
 - `command: ["./wait-for-it.sh", "db:5432", "--", "npm", "run", "start"]`    
 
This executes the `.sh` file, sets the `host:port`, and then runs node.  

## Docker compose dev (development)

### Questions
Setting up the docker containers for development is more complex, but only by a little.  A couple things to know before we start:
1. Is the client also listening on a port? 
   - If you are using `create-react-app`, yes.  `npm start` on a `react-app` will open a port and listen on it.  It defaults at port 3000, so if express is listening on this port, the port needs to be changed to something else.  If using webpack, no additional port is opened.  
2. What build directory are we serving up and where is it located?
   - In development, we want to listen to any client code changes, so we use `npm start`.  This will build a `build` directory in the root directory.  If production, it will build the directory in the `./client` directory.
3. How do we set the proxy for the client?
   - This is done in the `package.json`.  We will go in more detail later

### Compose file
```
#Docker-compose-dev.yml (development)
version: '2'
services:
  server:
    build: .
    image: docker-pg
    environment:
      - PORT=3000
      - HOST=db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=docker
      - POSTGRES_PORT=5432
    volumes:
      - ./:/app
      - /app/node_modules
    depends_on: 
      - db
    ports:
      - "3000:3000"
    command: ["./wait-for-it.sh", "db:5432", "--", "npm", "run", "dev-server"]
  
  db:
    image: postgres
    ports: 
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=docker
    volumes:
      - ./tmp:/docker-entrypoint-initdb.d

  main-ui:
    image: docker-pg
    environment:
      - PORT=3002
    volumes:
      - ./client/src/:/app/client/src
      - /app/build
      - /app/client/node_modules
    ports:
      - "3002:3002"
    links:
      - server
    command: "npm run dev-client"
```
This file is almost the same.  

### Differences
Differences on `server`:
1. `ports`: The first thing you notice is we changed the port mapping on the `server` from `3001:3000` to `3000:3000`.  This is just for simplicity.  Since the client will be hosted on it's own port, there is no need for port mapping on the server unless it's already being used on the host.  
2. `command`: the last index value was changed from `start` to `dev-server`. This was not set to `dev-start` because we want to separate the run commands for the client and the server.

### Main ui (docker service)
This is the client-side container created specifically to run react in `create-react-app`.  If `create-react-app` was not used, a different approach will be used.  
- `image` used is the same image used in the server container.  A different image container may have been created, but for simplicity, it is not required. This is only for a dev setup, and it works.
- `environment` sets the port to `3002`.  This is not to be confused with the express port.  This the port that remaps `react-app` `npm start` port from 3000 to 3002.  This is required or the app will run on port 3000.  
- `ports` is set to any available port `3002:3002`
- `links`: we add `- server` to add a networking link between the web and server.  This is so that any fetch requests to the express server may use a proxy. 

### Proxy
the proxy is set in the client `package.json` file, where a property `proxy` is added.    
In the `package.json`, we see `"proxy": "http://server:3000"`.  The `server` is not something built-in like `localhost`.  In fact, this is the service name of the web server container we set in the docker-compose file.  If we look back at it, we see the web service is named `server`.  If named `main-server`, we would change the proxy to `"proxy": "http://main-server:3000"`.  Note that the port set here is not the port of the client, but the port of express, since any requests on the client side need to route to the correct server port.  If the proxy is not provided, a cors (cross-origin-resource-sharing) error will occur.  

### Running docker compose dev
To run the development docker-compose file, we need to replace the production file in the docker-compose script.
```
#In order to run the docker-compose-dev file, run:    
docker-compose -f docker-compose.yml -f docker-compose-dev.yml up
#To shut down the containers, run:
docker-compose down
```

## Using a corporate proxy
When using a corporate proxy, docker becomes a little tricky.  It may be that you may only install npm packages inside a docker container.  In order to do so, `npm` proxies need to be added to the `Dockerfile`.  
Right after the `From Node:10` line, add:   
```
RUN npm config set proxy http://<company_proxy>:<port>
RUN npm config set https-proxy http://<company_proxy>:<port>
```
Also, certificates may also be required.  Add..
`ADD <location/of/certificates_name.cer> /root/certificates_name.cer` This adds the certificates to the root directory of the container.   
Then, set the certificates file as `cafile`:    
`RUN npm config set cafile /root/certificates_name.cer`

Sometimes, adding the proxy still does not enable you to download npm packages at docker build time.  In order to fix this issue, there are a couple of fixes.  
1. Add `--build-arg` arguments for the proxies during the `docker build` step.
   - `docker build --build-arg HTTP_PROXY=<corporate_proxy>:<port> --build-arg HTTPS_PROXY=<corporate_proxy>:<port> -t docker-node-pg:latest . `
2. If this issue persists, add `--network=host`.
   - `docker build --network=host --build-arg HTTP_PROXY=<corporate_proxy>:<port> --build-arg HTTPS_PROXY=<corporate_proxy>:<port> -t docker-node-pg:latest . `
   
## Resources

### corporate proxy
- [configuring a corporate proxy](https://www.jhipster.tech/configuring-a-corporate-proxy/)
- [corporate proxy debugging](https://stackoverflow.com/questions/7559648/is-there-a-way-to-make-npm-install-the-command-to-work-behind-proxy)

### building node app in docker & docker refs
- [Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Dockerfile reference](https://docs.docker.com/engine/reference/builder/)
- [Docker-compose for Nodejs](https://blog.codeship.com/using-docker-compose-for-nodejs-development/)
- [MERN app docker](https://medium.com/codebase/mern-ep01-setting-up-a-development-environment-with-docker-1bb0b6e4d464)
- [Docker Development with Nodemon](https://medium.com/lucjuggery/docker-in-development-with-nodemon-d500366e74df)
- [Nodejs Dockerizing web-app](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker bind-mounts](https://docs.docker.com/storage/bind-mounts/)
- [Building a node app with docker](https://www.javascriptjanuary.com/blog/building-your-first-node-app-using-docker)
- [Nodejs docker workflow](https://medium.com/datreeio/node-js-docker-workflow-b9d936c931e1)
- [Exclude subdirectories in volumes](https://stackoverflow.com/questions/29181032/add-a-volume-to-docker-but-exclude-a-sub-folder)
- [Separating compose files](https://serversforhackers.com/dockerized-app/compose-separated)

### debugging
- [live debugging docker](https://blog.docker.com/2016/07/live-debugging-docker/)
- [live debugging docker with nodemon](https://github.com/Microsoft/vscode-recipes/tree/master/nodemon)

### networking
- [Networking in compose](https://docs.docker.com/compose/networking/)
- [Basic networking in docker](https://runnable.com/docker/basic-docker-networking)

### postgres
- [docker postgres image](https://hub.docker.com/_/postgres)
- [control postgres startup and shutdown](https://docs.docker.com/compose/startup-order/)
- [persist postgres data in volume](https://stackoverflow.com/questions/41637505/how-to-persist-data-in-a-dockerized-postgres-database-using-volumes)

