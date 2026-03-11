const User = require("../models/User");
const OTP = require('../models/OTP.js');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');

const generateLoginResponse = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  return {
    status: true,
    token
  };
};


const sendEmail = async (to, subject, text, html) => {

  if (!to) {
    throw new Error("Email recipient is required");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Kanban Board" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    html: html
  };

  console.log("Sending email to:", to);
  const info = await transporter.sendMail(mailOptions);
  console.log(" Email sent:", info.messageId);
  return info;
};

const sendWelcomeEmail = async (user) => {
  if (!user || !user.email) {
    throw new Error("User email is required");
  }

  const subject = "🎉 Welcome to Kanban Board - Start Managing Your Tasks!";
  const text = `
    Hi ${user.name},
    
    Thank you for registering on Kanban Board! Your account has been successfully created.
    
    You can now start managing your tasks and collaborating with your team in real-time.
    
    👉 Login to your dashboard: https://kan-ban-board-ai.vercel.app/dashboard
    
    Here's what you can do:
    • Create and manage tasks with drag-and-drop
    • Collaborate with team members in real-time
    • Track your progress with analytics
    • Set priorities and due dates
    • And much more!
    
    If you have any questions, feel free to reach out to our support team.
    
    Happy Task Managing!
    - The Kanban Board Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin-bottom: 5px;">🎉 Welcome to Kanban Board!</h1>
        <p style="color: #666; font-size: 16px;">Hi ${user.name}, your account has been successfully created.</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <a href="https://kan-ban-board-ai.vercel.app/dashboard" style="display: inline-block; background: white; color: #6366f1; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🚀 Go to Dashboard</a>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">✨ What you can do now:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 15px; display: flex; align-items: center;">
            <span style="line-height: 25px; text-align:center; background: #6366f1; color: white; width: 25px; height: 25px; border-radius: 50%; margin-right: 10px;">✓</span>
            <span style="color: #555;">Create and manage tasks with drag-and-drop</span>
          </li>
          <li style="margin-bottom: 15px; display: flex; align-items: center;">
            <span style="line-height: 25px; text-align:center; background: #6366f1; color: white; width: 25px; height: 25px; border-radius: 50%; margin-right: 10px;">✓</span>
            <span style="color: #555;">Collaborate with team members in real-time</span>
          </li>
          <li style="margin-bottom: 15px; display: flex; align-items: center;">
            <span style="line-height: 25px; text-align:center; background: #6366f1; color: white; width: 25px; height: 25px; border-radius: 50%; margin-right: 10px;">✓</span>
            <span style="color: #555;">Track your progress with analytics</span>
          </li>
          <li style="margin-bottom: 15px; display: flex; align-items: center;">
            <span style="line-height: 25px; text-align:center; background: #6366f1; color: white; width: 25px; height: 25px; border-radius: 50%; margin-right: 10px;">✓</span>
            <span style="color: #555;">Set priorities and due dates</span>
          </li>
        </ul>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <p style="color: #666; margin: 0; font-style: italic;">
          "Start your productivity journey today! Drag, drop, and organize your tasks efficiently."
        </p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
        <p>Need help? Contact us at support@kanban.com</p>
        <p>© ${new Date().getFullYear()} Kanban Board. All rights reserved.</p>
      </div>
    </div>
  `;


  await sendEmail(user.email, subject, text, html);
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        msg: "Name, Email and Password are required"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        msg: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword
    });

    try {
      await sendWelcomeEmail(user);
      console.log(`📧 Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError.message);
    }

    const loginResponse = await generateLoginResponse(email, password);
    return res.json({
      ...loginResponse,
      msg: "User registered and logged in successfully. Welcome email sent!"
    });
  } catch (err) {
    next(err);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        msg: "Email and Password required"
      });
    }

    const response = await generateLoginResponse(email, password);
    return res.json({
      ...response,
      msg: "Login successful"
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      msg: err.message
    });
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Forgot Password - Send OTP
// Forgot Password - Send OTP (Production Ready)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ 
        success: false,
        msg: 'Email is required' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.status(200).json({ 
        success: true,
        msg: 'If your email is registered, you will receive an OTP'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expiry (30 seconds)
    const otpExpiry = new Date();
    otpExpiry.setSeconds(otpExpiry.getSeconds() + 30);

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Save new OTP to database
    const newOTP = new OTP({
      email,
      otp,
      expiresAt: otpExpiry,
      createdAt: new Date()
    });
    await newOTP.save();

    // Send OTP via email with better template
    const subject = '🔐 Password Reset OTP - Kanban Board';
    const text = `
      Hello ${user.name},

      You requested to reset your password for Kanban Board.

      Your OTP is: ${otp}

      This OTP will expire in 30 seconds.

      If you didn't request this, please ignore this email or contact support.

      Thanks,
      Kanban Board Team
    `;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e9e9e9; border-radius: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="background: white; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #333; margin-bottom: 5px;">🔐 Password Reset</h1>
            <p style="color: #666; font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
          </div>
          
          <div style="background: #f0f4ff; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
            <p style="color: #555; margin-bottom: 10px;">Your OTP for password reset is:</p>
            <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; font-family: monospace; padding: 15px; background: white; border-radius: 8px; display: inline-block;">
              ${otp}
            </div>
            <p style="color: #999; font-size: 14px; margin-top: 15px;">⏰ Expires in 30 seconds</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #666; margin: 0; font-size: 14px;">
              <strong>Didn't request this?</strong> If you didn't request a password reset, 
              please ignore this email or contact our support team immediately.
            </p>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 13px; border-top: 1px solid #eee; padding-top: 20px;">
            <p>© ${new Date().getFullYear()} Kanban Board. All rights reserved.</p>
            <p style="margin-top: 5px;">
              <a href="mailto:support@kanban.com" style="color: #4f46e5; text-decoration: none;">support@kanban.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    // Try to send email with retry logic
    let emailSent = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!emailSent && retryCount < maxRetries) {
      try {
        await sendEmail(email, subject, text, html);
        emailSent = true;
        console.log(`✅ OTP email sent to ${email} (attempt ${retryCount + 1})`);
      } catch (emailError) {
        retryCount++;
        console.error(`❌ Email attempt ${retryCount} failed:`, emailError.message);
        
        if (retryCount === maxRetries) {
          throw emailError;
        }
        
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Always return success (don't reveal if email was sent or not)
    res.status(200).json({ 
      success: true,
      msg: 'If your email is registered, you will receive an OTP'
    });

  } catch (err) {
    console.error('🔥 Forgot password error:', err);
    
    // Log full error for debugging
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      response: err.response
    });

    // Don't expose internal errors to client
    res.status(200).json({ 
      success: true,
      msg: 'If your email is registered, you will receive an OTP'
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find OTP in database
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    // OTP is valid
    res.json({ msg: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete all OTPs for this email
    await OTP.deleteMany({ email });

    // Send confirmation email
    await sendEmail(
      email,
      'Password Reset Successful',
      'Your password has been reset successfully. If you did not perform this action, please contact support immediately.'
    );

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};