// const express = require('express');
// const router = express.Router();
// const User = require('../models/User');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// // Register
// router.post('/register', async (req, res) => {
//   const { name, email, password } = req.body;
//   try {
//     const existing = await User.findOne({ email });
//     if (existing) return res.status(400).json({ message: 'User already exists' });

//     const user = await User.create({ name, email, password });
//     res.status(201).json({ message: 'User registered successfully' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Login
// // router.post('/login', async (req, res) => {
// //   const { email, password } = req.body;
// //   try {
// //     const user = await User.findOne({ email });
// //     if (!user) return res.status(400).json({ message: 'Invalid credentials' });

// //     const isMatch = await bcrypt.compare(password, user.password);
// //     if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

// //     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
// //     res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: 'Invalid credentials' });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

//     res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
//   } catch (err) {
//     console.error("Login error:", err);  // <-- this logs the exact error
//     res.status(500).json({ error: "Server error" });
//   }
// });

// module.exports = router;




// const express = require("express")
// const jwt = require("jsonwebtoken") // Import jwt module
// const app = express()

// // Middleware for token authentication
// const authenticateToken = (req, res, next) => {
//   // Implement token verification logic here
//   const token = req.headers["authorization"]
//   if (!token) return res.sendStatus(401)

//   // Verify token
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403)
//     req.user = user
//     next()
//   })
// }

// // Token verification endpoint
// app.get("/api/auth/verify", authenticateToken, async (req, res) => {
//   try {
//     // If we reach here, the token is valid (authenticateToken middleware passed)
//     res.json({
//       success: true,
//       user: req.user,
//       message: "Token is valid",
//     })
//   } catch (error) {
//     console.error("Token verification error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Token verification failed",
//     })
//   }
// })

// // Export the app for use in other files
// module.exports = app












const express = require("express")
const router = express.Router()
const User = require("../models/User") // Assuming User model is imported here
const authenticateToken = require("../middleware/authenticateToken") // Assuming authenticateToken middleware is imported here

router.get("/verify", authenticateToken, async (req, res) => {
  try {
    // If we reach here, the token is valid (authenticateToken middleware passed)
    const user = await User.findOne({ _id: req.user.id })
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" })
  }
})
