const mongoose = require('mongoose');

// Schema for signupDB
const signupUserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
});

// Schema for authDB
const authUserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
});

module.exports = { signupUserSchema, authUserSchema };
