require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Session
app.use(session({
    secret: 'pathlynx-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Database Health Check
async function testDBConnection() {
    try {
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase Connection: Active and Healthy');
    } catch (err) {
        console.error('❌ Supabase Connection Error:', err.message);
    }
}
testDBConnection();

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Unified Auth Logic (Using Username + Bcrypt)
app.post('/auth/local', async (req, res) => {
    const { username, password, role, action, name } = req.body;
    
    try {
        if (action === 'signup') {
            // 1. Check if username exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).send('Choose a different username. This one is taken.');
            }

            // 2. Hash Password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3. Create User
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([{ 
                    username, 
                    password: hashedPassword, 
                    role: role || 'student', 
                    name: name || username 
                }])
                .select()
                .single();

            if (error) throw error;

            req.session.user = newUser;
            console.log(`✨ New User Registered: ${username}`);
            return res.redirect('/dashboard.html');

        } else {
            // Login Logic
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .maybeSingle();

            if (!user) {
                return res.status(401).send('User not found. Please sign up first.');
            }

            // Check Password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).send('Incorrect password. Please try again.');
            }

            req.session.user = user;
            console.log(`🔓 User Logged In: ${username}`);
            return res.redirect('/dashboard.html');
        }
    } catch (err) {
        console.error('Auth Error:', err.message);
        res.status(500).send('Authentication Error: ' + err.message);
    }
});

// Route Protection
['/dashboard.html', '/curriculum.html', '/projects.html', '/resume.html'].forEach(route => {
    app.get(route, (req, res) => {
        if (req.session.user) {
            res.sendFile(path.join(__dirname, 'public', route));
        } else {
            res.redirect('/login.html');
        }
    });
});

app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/api/onboarding', async (req, res) => {
    if (req.session.user) {
        const { path: selectedPath, skills } = req.body;
        const { data, error } = await supabase
            .from('users')
            .update({ selectedPath, skills: skills || [] })
            .eq('username', req.session.user.username)
            .select()
            .single();

        if (!error) req.session.user = data;
        res.json({ success: !error });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// AI Engine
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");
app.post('/api/generate-roadmap', async (req, res) => {
    const { path: careerPath, skills } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Create career roadmap JSON for ${careerPath}. Skills: ${skills}`);
        const text = (await result.response).text();
        res.json(JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()));
    } catch (e) {
        res.json({ title: careerPath, modules: [{ name: "Basics of " + careerPath, status: "In Progress" }] });
    }
});

app.listen(PORT, () => console.log(`Server live at http://localhost:${PORT}`));