require('./config/dbConfig');
const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const router = require('./routes/options');
const routerQ = require('./routes/pollRouter');
const cors = require('cors');

const app = express();

const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors("*"));
app.get('/', (req, res) => {
    res.send("Welcome to Polling API");
})
app.use('/', router);
app.use('/', routerQ);

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})