require('./config/dbConfig');
const express = require('express');
require('dotenv').config();
const router = require('./routes/pollRouter')
const cors = require('cors');

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors("*"));
app.get('/', (req, res) => {
    res.send("Welcome to Curve Poll API")
});

app.use('/', router);


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
