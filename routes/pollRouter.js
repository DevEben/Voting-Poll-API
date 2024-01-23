const express=require('express');

const router=express.Router();

const { signUp, verify, resendOTP, logIn, forgotPassword, resetPassword, signOut, makeAdmin, } = require('../controllers/userController');
const { createPoll, getPoll, votePoll, verifyVoter, viewWinner, deletePoll, deleteOption, viewAllPoll, } =require('../controllers/pollController');
const { authenticate } = require('../middleware/authentation');

//endpoint to register a new user
router.post('/signup', signUp);

//endpoint to verify a registered user
router.post('/verify/:id/', verify);

//endpoint to resend OTP to the user
router.get('/resend-otp/:id', resendOTP)

//endpoint to login a verified user
router.post('/login', logIn);

//endpoint for forget Password
router.post('/forgot', forgotPassword);

//endpoint to reset user Password
router.post('/reset-user/:userId', resetPassword);

//endpoint to sign out a user
router.post("/signout/", authenticate, signOut)

// //endpoint to make a user an Admin
// router.put('/makeadmin', authenticate, makeAdmin);




// API to create a new poll
router.post('/api/polls', authenticate, createPoll);

// API to get poll details
router.get('/api/polls/:pollId', getPoll);

// API to vote on a poll
router.post('/api/polls/:id/vote', votePoll);

// API to verify voter's email
router.post('/api/verify-voters/:pollId', verifyVoter);

// API to get the winner of a poll
router.get('/api/polls/:id/winner', viewWinner);

// API to delete a poll
router.delete('/api/polls/:id', authenticate, deletePoll);

// API to delete an option from a poll
router.delete('/api/polls/:pollId/options/:optionId', authenticate, deleteOption);

// API to get all polls
router.get('/api/polls/viewall', viewAllPoll);


module.exports = router;