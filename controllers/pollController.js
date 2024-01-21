const Poll = require('../models/pollModel');
const userModel = require("../models/userModel");
const {validateVoteEmail} = require("../middleware/validator");


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


// Function to get poll details
const getPoll = async (req, res) => {
   try {
      const pollId = req.params.id;

      const poll = await Poll.findById(pollId);

      if (!poll) {
         return res.status(404).json({ error: 'Poll not found' });
      }

      res.status(200).json(poll);
   } catch (error) {
      console.error(error);
      res.status(500).json({ 
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
            error: "Please provide both email and phone number"
         });
      }

      // Additional validation for email and phoneNumber formats can be added here
      const checkEmail = await Poll.findOne({ email });
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
      if (!option || option < 1 || option > poll.options.length) {
         return res.status(400).json({ error: 'Invalid option' });
      }

      // Save the user's email in the poll document
      poll.email.push(email);

      // Update the poll with the vote
      poll.votes[option - 1]++;
      await poll.save();

      res.json({
         message: `Congratulations ${email}, you've successfully voted for ${poll.options[option - 1].text}`,
         success: true,
      });
   }
   } catch (error) {
      console.error(error);
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
   viewWinner,
   deletePoll,
   deleteOption,
   viewAllPoll,

}