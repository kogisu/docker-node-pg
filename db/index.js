const config = require('../server/config');
const { Client } = require('pg');

if (process.env.NODE_ENV === 'development') {
    require('dotenv').config();
}
console.log('env: ', process.env.POSTGRES_USER);

const client = new Client({
    host: config.HOST,
    port: config.POSTGRES_PORT,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD
});

client.connect(err => {
    if (err) {
        console.error('connection error', err.stack);
    } else {
        console.log('connected');
    }
});

module.exports = {
    getAllUsers: async function() {
        try {
            const res = await client.query('SELECT * from users', []);
            return res;
        } catch(err) {
            return `error occured in getting users from db: ${err}`;
        }
    }
}


