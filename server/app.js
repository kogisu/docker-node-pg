const express = require('express');
const logger = require('morgan');
const path = require('path');
const db = require('../db');

const port =  process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));

//Static files
app.use(express.static(path.join(__dirname, '../client/build')));
app.use(express.static(path.join(__dirname, '../client/public')));

//Request handling
app.get('/api/users', async (req, res) => {
    console.log('getting users');
    try {
        const users = await db.getAllUsers();
        res.status(200).json(users.rows);
    } catch(err) {
        console.log(err);
    }
});

app.listen(port, () => {
    console.log(`running on port ${port}`);
});