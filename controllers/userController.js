const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateUser, validateUserLogin, } = require('../middleware/validator');
const sendEmail = require('../email');
const { generateDynamicEmail } = require('../emailText');
const { resetFunc } = require('../forgot');
require('dotenv').config();

//Function to register a new user
const signUp = async (req, res) => {
  try {
    const { error } = validateUser(req.body);
    if (error) {
      return res.status(500).json({
        message: error.details[0].message
      })
    } else {

      const userData = {
        Fullname: req.body.Fullname.trim(),
        email: req.body.email.trim(),
        phoneNumber: req.body.phoneNumber.trim(),
        password: req.body.password,
        confirmPassword: req.body.password,
      }

      const emailExists = await userModel.findOne({ email: userData.email.toLowerCase() });
      if (emailExists) {
        return res.status(200).json({
          message: 'Email already exists',
        })
      }

      const salt = bcrypt.genSaltSync(12)
      const hashpassword = bcrypt.hashSync(userData.password, salt);
      const user = new userModel({
        Fullname: userData.Fullname.toLowerCase(),
        email: userData.email.toLowerCase(),
        phoneNumber: userData.phoneNumber,
        password: hashpassword,
      });
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        })
      }
      const token = jwt.sign({
        Fullname: user.Fullname,
        email: user.email,
      }, process.env.SECRET, { expiresIn: "300s" });
      user.token = token;
      const subject = 'Email Verification'
      //jwt.verify(token, process.env.secret)
      const link = `${req.protocol}://${req.get('host')}/verify/${user.id}/${user.token}`
      const html = generateDynamicEmail(user.Fullname, link)
      sendEmail({
        email: user.email,
        html,
        subject
      })
      await user.save()
      return res.status(200).json({
        message: 'User profile created successfully',
        data: user,
      })

    }
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error: " + err.message,
    })
  }
};


//Function to verify a new user with a link
const verify = async (req, res) => {
  try {
    const id = req.params.id;
    const token = req.params.token;
    const user = await userModel.findById(id);

    // Verify the token
    jwt.verify(token, process.env.SECRET);

    // Update the user if verification is successful
    const updatedUser = await userModel.findByIdAndUpdate(id, { isVerified: true }, { new: true });

    if (updatedUser.isVerified === true) {
      return res.status(200).send("You have been successfully verified. Kindly visit the login page.");
    }

  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      // Handle token expiration
      const id = req.params.id;
      const updatedUser = await userModel.findById(id);
      const newtoken = jwt.sign({ email: updatedUser.email, Fullname: updatedUser.Fullname, }, process.env.SECRET, { expiresIn: "120s" });
      updatedUser.token = newtoken;
      updatedUser.save();

      const link = `${req.protocol}://${req.get('host')}/verify/${id}/${updatedUser.token}`;
      sendEmail({
        email: updatedUser.email,
        html: generateDynamicEmail(updatedUser.Fullname, link),
        subject: "RE-VERIFY YOUR ACCOUNT"
      });
      return res.status(401).send("This link is expired. Kindly check your email for another email to verify.");
    } else {
      return res.status(500).json({
        message: "Internal server error: " + err.message,
      });
    }
  }
};


//Function to login a verified user
const logIn = async (req, res) => {
  try {
    const { error } = validateUserLogin(req.body);
    if (error) {
      return res.status(500).json({
        message: error.details[0].message
      })
    } else {
      const { email, password } = req.body;
      const checkEmail = await userModel.findOne({ email: email.toLowerCase() });
      if (!checkEmail) {
        return res.status(404).json({
          message: 'User not registered'
        });
      }
      const checkPassword = bcrypt.compareSync(password, checkEmail.password);
      if (!checkPassword) {
        return res.status(404).json({
          message: "Password is incorrect"
        })
      }
      const token = jwt.sign({
        userId: checkEmail._id,
        userName: checkEmail.Fullname,
        isAdmin: checkEmail.isAdmin
      }, process.env.SECRET, { expiresIn: "5h" });

      if (checkEmail.isVerified === true) {
        res.status(200).json({
          message: "Login Successfully! Welcome " + checkEmail.Fullname,
          token: token
        })
        checkEmail.token = token;
        await checkEmail.save();
      } else {
        res.status(400).json({
          message: "Sorry user not verified yet."
        })
      }
    }

  } catch (err) {
    return res.status(500).json({
      message: "Internal server error: " + err.message,
    });
  }
};



//Function for the user incase password is forgotten
const forgotPassword = async (req, res) => {
  try {
    const checkUser = await userModel.findOne({ email: req.body.email });
    if (!checkUser) {
      return res.status(404).json({
        message: 'Email does not exist'
      });
    }
    else {
      const subject = 'Kindly reset your password'
      const link = `${req.protocol}://${req.get('host')}/reset/${checkUser.id}`
      const html = resetFunc(checkUser.Fullname, link)
      sendEmail({
        email: checkUser.email,
        html,
        subject
      })
      return res.status(200).json({
        message: "Kindly check your email to reset your password",
      })
    }
  } catch (err) {
    return res.status(500).json({
      message: 'Internal Server Error: ' + err.message,
    })
  }
};




//Function to reset the user password
const resetPassword = async (req, res) => {
  try {
    const userId = req.params.userId;
    const password = req.body.password;

    if (!password) {
      return res.status(400).json({
        message: "Password cannot be empty",
      });
    }

    const salt = bcrypt.genSaltSync(12);
    const hashPassword = bcrypt.hashSync(password, salt);

    const reset = await userModel.findByIdAndUpdate(userId, { password: hashPassword }, { new: true });
    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Internal Server Error: ' + err.message,
    })
  }
};


//Function to signOut a user
const signOut = async (req, res) => {
  try {
    const userId = req.user.userId
    const newUser = await userModel.findById(userId)
    if (!newUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    newUser.token = null;
    await newUser.save();
    return res.status(201).json({
      message: `user has been signed out successfully`
    })
  }
  catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error: ' + error.message,
    })
  }
}


// //Function to make a user an admin
// const makeAdmin = async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     const user = await userModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         message: "User not found"
//       });
//     }
//     const makeAdmin = await userModel.findByIdAndUpdate(userId, { isAdmin: true }, { new: true });
//     return res.status(200).json({
//       message: "User have been made an Admin successfully",
//       data: makeAdmin
//     })

//   } catch (error) {
//     return res.status(500).json({
//       message: "Internal server error: " + error.message,
//     });
//   }
// };




module.exports = {
  signUp,
  verify,
  logIn,
  forgotPassword,
  resetPassword,
  signOut,
  //makeAdmin,

}