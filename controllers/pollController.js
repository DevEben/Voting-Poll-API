const Poll = require('../models/pollModel');
const userModel = require("../models/userModel");
const {validateVoteEmail} = require("../middleware/validator");
const { generateDynamicEmail } = require('../emailText');
const sendEmail = require('../email');


// Function to create a new poll
const createPoll = async (req, res) => {
   try {
      const userId = req.user.userId;
      const { question, options } = req.body;

      const user = await userModel.findById(userId);

      if (!question || !options || options.length < 2) {
         return res.status(400).json({
            error: 'Invalid poll data'
         });
      }
      const poll = await Poll.create({
         question,
         options: options.map(option => ({ text: option })),
         votes: Array(options.length).fill(0),
      });

      res.status(200).json({
         id: poll._id,
         link: `${req.protocol}://${req.get('host')}/api/polls/${poll._id}/vote`
      });

      user.polls.push(poll);
      await user.save();

   } catch (error) {
      res.status(500).json({
         error: 'Internal Server Error' + error.message,
      });
   }
};


// Function to get  a poll details
const getPoll = async (req, res) => {
   try {
      const pollId = req.params.pollId;

      const poll = await Poll.findById(pollId);

      if (!poll) {
         return res.status(404).json({ error: 'Poll not found' });
      }

      res.status(200).json(poll);
   } catch (error) {
      return res.status(500).json({ 
         error: 'Internal Server Error' +error.message 
   });
   }
};


// Function to vote on a poll
const votePoll = async (req, res) => {
   try {
      const { error } = validateVoteEmail(req.body);
    if (error) {
      return res.status(500).json({
        message: error.details[0].message
      })
    } else {
      const pollId = req.params.id;
      const { option, email } = req.body;

      // Validate required parameters
      if (!email) {
         return res.status(400).json({
            error: "Please provide the email"
         });
      }

      // Additional validation for email and phoneNumber formats can be added here
      const checkEmail = await Poll.findOne({ "email": { $elemMatch: { $eq: email } } });
      if (checkEmail) {
         return res.status(400).json({
            message: "User with this Email has already voted"
         });
      }

      const poll = await Poll.findById(pollId);

      if (!poll) {
         return res.status(404).json({ error: 'Poll not found' });
      }

      // Validate the option
      if (!option || option > poll.options.length) {
         return res.status(400).json({ error: 'Invalid option' });
      }

      // Save the user's email in the poll document
      poll.email.push(email);

      const generateOTP = () => {
         const min = 1000;
         const max = 9999;
         return Math.floor(Math.random() * (max - min + 1)) + min;
     }
     const subject = 'Email Verification'
     const otp = generateOTP();
 
       poll.newCode = otp
       const html = generateDynamicEmail(email, otp)
       sendEmail({
         email: email,
         html,
         subject
       })

      res.json({
         message: `Congratulations ${email}, Please check your email for an OTP to verify your email address`,
         success: true,
      });

      // Get's the index of the the option seleted 
      let optIndex = poll.options.findIndex(item => item.text === option);

      if (optIndex !== -1) {
         // Update the poll with the vote
         poll.votes[optIndex]++;
     } else {
         return res.status(404).json("Option not found in the poll");
     }
      await poll.save();

   }
   } catch (error) {
      res.status(500).json({ 
         error: 'Internal Server Error: ' + error.message 
      });
   }
};



//Function to verify Voters Email 
const verifyVoter = async (req, res) => {
   try {
     const pollId = req.params.pollId;
     const poll = await Poll.findById(pollId);
     const { userInput } = req.body;
 
     if (poll && poll.newCode.includes(userInput)) {
       return res.status(200).json("You have been successfully verified.");
     } else {
       return res.status(400).json({
         message: "Incorrect OTP, Please check your email for the code"
       });
     }
   } catch (error) {
     res.status(500).json({
       error: 'Internal Server Error: ' + error.message
     });
   }
 };
 




// Function to get the winner of a poll
const viewWinner = async (req, res) => {
   try {
      const pollId = req.params.id;

      const poll = await Poll.findById(pollId);

      if (!poll) {
         return res.status(404).json({ error: 'Poll not found' });
      }

      const maxVotes = Math.max(...poll.votes);
      const winningOption = poll.options.find((Option, index) => poll.votes[index] === maxVotes);

      res.json({ winner: winningOption, votes: maxVotes });
   } catch (error) {
      console.error(error);
      res.status(500).json({ 
         error: 'Internal Server Error' +error.message 
   });
   }
};



// Function to delete a poll
const deletePoll = async (req, res) => {
   const pollId = req.params.id;

   try {
      const deletedPoll = await Poll.findByIdAndDelete(pollId);

      if (!deletedPoll) {
         return res.status(404).json({ error: 'Poll not found' });
      }

      res.json({ 
         message: 'Poll deleted successfully', 
         success: true 
   });
   } catch (error) {
      console.error(error);
      res.status(500).json({ 
         error: 'Internal Server Error' +error.message 
      });
   }
};



// Function to delete an option from a poll
const deleteOption = async (req, res) => {
   const pollId = req.params.pollId;
   const optionId = req.params.optionId;

   try {
      const poll = await Poll.findById(pollId);

      if (!poll) {
         return res.status(404).json({ error: 'Poll not found' });
      }

      const optionIndex = poll.options.findIndex(option => option._id == optionId);

      if (optionIndex === -1) {
         return res.status(404).json({ error: 'Option not found' });
      }

      const votesForOption = poll.votes[optionIndex];

      if (votesForOption > 0) {
         return res.status(400).json({
            error: 'Cannot delete option with existing votes',
            votes: votesForOption,
         });
      }

      // Remove the option from the options array
      poll.options.splice(optionIndex, 1);

      // Update the poll with the modified options
      await poll.save();

      res.json({ success: true, message: 'Option deleted successfully' });
   } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
   }
};



// Function to get all polls
const viewAllPoll = async (req, res) => {
   try {
      const allPolls = await Poll.find();

      res.json(allPolls);
   } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
   }
};



module.exports = {
   createPoll,
   getPoll,
   votePoll,
   verifyVoter,
   viewWinner,
   deletePoll,
   deleteOption,
   viewAllPoll,

}