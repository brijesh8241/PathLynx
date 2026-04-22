require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
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
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
        console.warn('⚠️ Authentication and Dashboards will NOT work without a valid Supabase connection.');
    }
}
testDBConnection();

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport Configuration
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback"
    },
        function (accessToken, refreshToken, profile, cb) {
            return cb(null, profile);
        }));

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });
} else {
    console.warn("WARNING: Google Client ID/Secret not found in .env file. Google Auth will not work.");
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manual login/signup using Supabase
app.post('/auth/local', async (req, res) => {
    const { username, password, role, action, name } = req.body;

    if (action === 'signup') {
        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const newUser = {
            username,
            password,
            role: role || 'student',
            name: name || username,
            selectedPath: null,
            skills: []
        };

        const { data, error } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();

        if (error) {
            console.error('Signup Error:', error.message);
            return res.status(500).send('Registration failed');
        }

        req.session.user = data;
        console.log(`User signed up in DB: ${username}`);
        return res.redirect('/dashboard.html');
    } else {
        // Login logic
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .eq('role', role)
            .single();

        if (user) {
            req.session.user = user;
            console.log(`User logged in from DB: ${username}`);
            return res.redirect('/dashboard.html');
        } else {
            return res.status(401).send('Invalid credentials or role');
        }
    }
});

// Protected Dashboard Routes
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
            .update({ selectedPath: selectedPath, skills: skills || [] })
            .eq('username', req.session.user.username)
            .select()
            .single();

        if (error) {
            console.error('Update Error:', error.message);
            return res.status(500).json({ error: "Failed to update profile" });
        }

        req.session.user = data;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// AI Guidance Engine (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

app.post('/api/generate-roadmap', async (req, res) => {
    const { path: careerPath, skills } = req.body;

    if (process.env.GEMINI_API_KEY) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Act as a world-class career architect. Create an elite, high-detail roadmap for: "${careerPath}". Skills: ${skills.join(', ')}. Return ONLY JSON.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const roadmap = JSON.parse(cleanedText);
            return res.json(roadmap);
        } catch (error) {
            console.error("Gemini API Error:", error);
        }
    }

    // Default Mock Fallback
    res.json({
        title: careerPath,
        modules: [
            { name: "Fundamentals of " + careerPath, category: "Basics", status: "In Progress" },
            { name: "Advanced " + careerPath, category: "Pro", status: "Pending" }
        ]
    });
});

app.use('/api/auth', require('./config/routes/auth'));

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

module.exports = app;