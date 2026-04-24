require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('./config/supabase');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage() });

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
    const { email, password, role, action, name } = req.body;
    
    try {
        if (action === 'signup') {
            // 1. Check if email exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).send('Email already registered. Please login.');
            }

            // 2. Hash Password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3. Create User
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([{ 
                    email, 
                    password: hashedPassword, 
                    role: role || 'student', 
                    name: name || email 
                }])
                .select()
                .single();

            if (error) throw error;

            req.session.user = newUser;
            console.log(`✨ New User Registered: ${email}`);
            return res.redirect('/dashboard.html');

        } else {
            // Login Logic
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (!user) {
                return res.status(401).send('Account not found. Please sign up first.');
            }

            // Check Password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).send('Incorrect password.');
            }

            req.session.user = user;
            console.log(`🔓 User Logged In: ${email}`);
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
            .eq('email', req.session.user.email)
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

app.post('/api/analyze-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const data = await pdfParse(req.file.buffer);
        const text = data.text;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are an expert ATS (Applicant Tracking System) and career coach.
Analyze the following resume text and provide a structured JSON evaluation.
The output MUST be valid JSON, with exactly the following structure:
{
  "score": <number between 0 and 100>,
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "tips": ["...", "..."]
}
Resume Text:
${text}`;

        const result = await model.generateContent(prompt);
        const responseText = (await result.response).text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            res.json(JSON.parse(jsonMatch[0]));
        } else {
            res.status(500).json({ error: 'Failed to parse AI response' });
        }
    } catch (e) {
        console.error('Resume Analysis Error:', e);
        res.status(500).json({ error: 'Failed to analyze resume' });
    }
});

app.post('/api/project-guidance', async (req, res) => {
    try {
        const { path } = req.body;
        if (!path) return res.status(400).json({ error: 'Path is required' });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are a Senior Software Architect and Tech Lead.
The user is focusing on the career path: "${path}".
Suggest exactly 2 detailed, portfolio-ready project ideas for this path.
Provide the output as a valid JSON array of objects, with exactly this structure:
[
  {
    "title": "Project Title",
    "description": "Short overview of what the project is.",
    "techStack": ["Tech1", "Tech2"],
    "architecture": "High-level architecture description.",
    "antigravityTips": ["Tip 1", "Tip 2"]
  }
]`;

        const result = await model.generateContent(prompt);
        const responseText = (await result.response).text();

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            res.json(JSON.parse(jsonMatch[0]));
        } else {
            res.status(500).json({ error: 'Failed to parse AI response' });
        }
    } catch (e) {
        console.error('Project Guidance Error:', e);
        res.status(500).json({ error: 'Failed to generate project guidance' });
    }
});

app.listen(PORT, () => console.log(`Server live at http://localhost:${PORT}`));