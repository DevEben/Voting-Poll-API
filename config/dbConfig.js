const mongoose = require('mongoose');
require('dotenv').config();

const DB = process.env.DATABASE

// Connect to MongoDB (Make sure you have MongoDB running)
mongoose.connect(DB)
.then(() => {
    console.log('Connection to database established successfully');
})
.catch((err) => {
    console.log('Error connecting to database: ' + err.message);
})