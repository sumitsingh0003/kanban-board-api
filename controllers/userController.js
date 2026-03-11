const User = require("../models/User");

//Get current user by token
exports.getCurrentUser = async (req, res) => {
  try {
    // User already attached to req from auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error' 
    });
  }
};

exports.getUsers = async (req,res,next)=>{
 try{
  const users = await User.find().select("-password");
  res.json({
    status:true,
    msg:"Users fetched",
    data:users
  });
 }catch(err){
  next(err);
 }
};

exports.getSingleUser = async (req,res,next)=>{
 try{
  const user = await User.findById(req.params.id).select("-password");

  if(!user){
    return res.status(404).json({
      status:false,
      msg:"User not found"
    });
  }

  res.json({
    status:true,
    msg:"User fetched",
    data:user
  });

 }catch (err) {
    console.error('Error in getUserById:', err);
    
    // Handle invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid user ID' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: 'Server error' 
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, phone, company } = req.body;


    const user = await User.findOneAndUpdate(
      { _id: req.params.id },
      { name, phone, company },
      {
        runValidators: true,
        returnDocument: "after"
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user,
      msg: 'Profile updated successfully'
    });
  } catch (err) {
    console.error('Error in updateUser:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid user ID' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: 'Server error' 
    });
  }
};


exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, 'name email _id');
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    next(err);
  }
};