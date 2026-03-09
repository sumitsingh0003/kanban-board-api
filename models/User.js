const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

  name:{
    type:String,
    required:true,
    trim:true
  },

  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true
  },

  phone:{
    type:String
  },

  password:{
    type:String,
    required:true
  },
  
  resetOTP: String,
  otpExpiry: Date,
  createdAt: { type: Date, default: Date.now }

},{timestamps:true});

module.exports = mongoose.model("User",UserSchema);