const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    Fullname: {
        type: String,
    }, 
    email: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    password: {
        type: String,
    },
    confirmPassword: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    token: {
        type: String,
    },
    polls: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
    }]

}, {timestamps: true});

const userModel = mongoose.model('Users', userSchema);

module.exports = userModel;