const mongoose = require('mongoose');

// Define MongoDB schema and model
const pollSchema = new mongoose.Schema({
    question:{ 
        type: String
    },

    options: [{
         text: String 
        }],

    email: [
        String
    ],
    votes: [ Number ],
});

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;