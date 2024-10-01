const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { signupUserSchema, authUserSchema } = require('./models/User');

const app = express();
const port = 3030;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to MongoDB for signup
const signupConnection = mongoose.createConnection('mongodb://localhost:27017/signupDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

signupConnection.once('open', () => {
    console.log('Connected to signupDB');
}).on('error', (error) => {
    console.error('Error connecting to signupDB:', error);
});

// Connect to MongoDB for authentication
const authConnection = mongoose.createConnection('mongodb://localhost:27017/authDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

authConnection.once('open', () => {
    console.log('Connected to authDB');
}).on('error', (error) => {
    console.error('Error connecting to authDB:', error);
});

// Define User model for both connections
const SignupUser = signupConnection.model('User', signupUserSchema);
const AuthUser = authConnection.model('User', authUserSchema);

// Routes
app.get('/', (req, res) => {
    res.render('login'); // Ensure you have a login.ejs file
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password, email, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to signupDB
        const newSignupUser = new SignupUser({
            username,
            password: hashedPassword,
            email,
            phone
        });
        await newSignupUser.save();
        console.log('User saved to signupDB:', newSignupUser);

        // Save user to authDB (only username and hashed password)
        const newAuthUser = new AuthUser({
            username,
            password: hashedPassword
        });
        await newAuthUser.save();
        console.log('User saved to authDB:', newAuthUser);

        res.redirect('/');
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).send('Error in signup. Please try again.');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await AuthUser.findOne({ username });
        if (!user) {
            console.log('User not found in authDB');
            return res.status(404).send('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Invalid credentials');
            return res.status(400).send('Invalid credentials');
        }

        // Fetch user details from signupDB for the logged-in user
        const loggedInUser = await SignupUser.findOne({ username });

        // Render user.ejs with user data
        res.render('user', { user: loggedInUser });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).send('Error in login. Please try again.');
    }
});

// Route to render update form with user's current data
app.get('/updateForm', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await SignupUser.findOne({ username });
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('update', { user });
    } catch (error) {
        console.error('Error fetching user for update:', error);
        res.status(500).send('Error fetching user for update. Please try again.');
    }
});

// Update route
app.post('/update', async (req, res) => {
    const { username, newEmail, newPhone } = req.body;

    if (!username || !newEmail || !newPhone) {
        return res.status(400).send('Username, new email, and new phone are required.');
    }

    try {
        // Update user in signupDB
        const updatedUserSignup = await SignupUser.findOneAndUpdate(
            { username }, 
            { email: newEmail, phone: newPhone }, 
            { new: true }
        );
        console.log('User updated in signupDB:', updatedUserSignup);

        // Update user in authDB (optional if email and phone are not used for authentication)
        const updatedUserAuth = await AuthUser.findOneAndUpdate(
            { username }, 
            { email: newEmail, phone: newPhone }, 
            { new: true }
        );
        console.log('User updated in authDB:', updatedUserAuth);

        res.json({ updatedEmail: updatedUserSignup.email, updatedPhone: updatedUserSignup.phone });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Error updating user. Please try again.');
    }
});

// Delete route
app.post('/delete', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    try {
        // Delete user from signupDB
        await SignupUser.deleteOne({ username });
        console.log('User deleted from signupDB');

        // Delete user from authDB
        await AuthUser.deleteOne({ username });
        console.log('User deleted from authDB');

        res.redirect('/'); // Redirect to home or any other page
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user. Please try again.');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
