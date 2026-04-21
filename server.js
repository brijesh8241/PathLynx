const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

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

// In-memory user store for demonstration (In production, use a Database)
const users = [
    { username: 'admin', password: 'password123', role: 'admin', name: 'System Admin' },
    { username: 'student', password: 'password123', role: 'student', name: 'PathLynx Student' },
    { username: 'recruiter', password: 'password123', role: 'recruiter', name: 'PathLynx Recruiter' }
];

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Added to parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Passport Configuration
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
        // Here you would typically find or create a user in your database
        return cb(null, profile);
    }));

    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    passport.deserializeUser(function(obj, done) {
        done(null, obj);
    });
} else {
    console.warn("WARNING: Google Client ID/Secret not found in .env file. Google Auth will not work.");
}

// Routes
// HTML routing is handled by express.static, but we need dynamic middleware for the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard route - check if user is authenticated
app.get('/dashboard.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Login route
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Auth Routes
app.get('/auth/google', (req, res, next) => {
    // If Google API Keys are NOT configured, elegantly mock the login
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log("Mocking Google Login due to missing keys.");
        req.session.user = { 
            name: "Google Demo User", 
            email: "demo@google.com", 
            selectedPath: null 
        };
        return res.redirect('/dashboard.html');
    }
    // If configured, run standard passport routing
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  function(req, res) {
    // Successful authentication, redirect to dashboard.
    res.redirect('/dashboard.html');
  }
);

// Manual login/signup fix for username/password and roles
app.post('/auth/local', (req, res) => {
    const { username, password, role, action, name } = req.body;
    
    if (action === 'signup') {
        // Simple signup logic
        const existingUser = users.find(u => u.username === username);
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
        users.push(newUser);
        req.session.user = newUser;
        console.log(`User signed up: ${username} as ${role}`);
        return res.redirect('/dashboard.html');
    } else {
        // Login logic
        const user = users.find(u => u.username === username && u.password === password && u.role === role);
        if (user) {
            req.session.user = user;
            console.log(`User logged in: ${username} as ${role}`);
            return res.redirect('/dashboard.html');
        } else {
            return res.status(401).send('Invalid credentials or role');
        }
    }
});

// API Endpoints
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

app.post('/api/onboarding', (req, res) => {
    if (req.session.user) {
        req.session.user.selectedPath = req.body.path;
        req.session.user.skills = req.body.skills || [];
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.logout && req.logout((err) => {
        if(err) return next(err);
        req.session.destroy();
        res.redirect('/');
    });
});

// AI Guidance Engine (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

app.post('/api/generate-roadmap', async (req, res) => {
    const { path: careerPath, skills } = req.body;
    
    // If we have an API Key, try to use it
    if (process.env.GEMINI_API_KEY) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Act as a world-class career architect. Create an elite, high-detail "A to Z" career roadmap for: "${careerPath}". 
            User's current skills: ${skills.join(', ')}.
            Commitment: Full-time professional transition.

            Return ONLY a raw JSON object (no markdown, no backticks) with this structure:
            {
                "title": "Professional Career Designation",
                "summary": "2-sentence high-level strategy for this path",
                "modules": [
                    {
                        "name": "Intensive Step Name",
                        "category": "e.g. Fundamental Architecture / Advanced Scale",
                        "status": "In Progress" (for the first module only) or "Pending",
                        "action": "Master" or "Apply",
                        "detail": "A deep, 4-sentence technical guide. Explain WHAT to learn, WHICH industry-standard tools to use (be specific, e.g. Docker, Terraform, React Query), and WHY it is critical for a high-salary role.",
                        "resources": ["Specific URL or Book Name 1", "Specific URL or Book Name 2"],
                        "project": "A professional-grade project idea to build in this stage"
                    }
                ]
            }
            Provide exactly 8 logical, progressive steps.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean the and parse the JSON response
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const roadmap = JSON.parse(cleanedText);
            
            return res.json(roadmap);
        } catch (error) {
            console.error("Gemini API Error:", error);
            // Fallback to mock on failure
        }
    }

    // Default Mock Fallback (Professional Detailed Guidance)
    console.log("Using Mock AI Roadmap Fallback.");
    const mockData = {
        "web-development": {
            title: "Full Stack Software Engineer",
            modules: [
                { name: "Frontend Mastery: React & TypeScript", category: "Core Development", status: "In Progress", action: "Continue", detail: "Deep dive into component lifecycle, hooks, and type-safe development using TypeScript. This provides the industry standard for scalable interfaces. Recommendation: Use Frontend Masters." },
                { name: "Advanced Node.js & Microservices", category: "Backend Architecture", status: "Pending", action: "Start", detail: "Learn to build distributed systems using Event-Driven Architecture. Essential for high-traffic applications. Focus on RabbitMQ and Redis caching." },
                { name: "System Design: Scalability & Load Balancing", category: "Architecture", status: "Pending", action: "Start", detail: "Understand how to design systems that handle millions of users. Master horizontal scaling and CDN integration. Reference: ByteByteGo." },
                { name: "Cloud Infrastructure (AWS/Terraform)", category: "DevOps", status: "Pending", action: "Start", detail: "Master Infrastructure as Code (IaC) to automate your deployments. This makes you a truly professional 'Full Stack' engineer. Resource: AWS Certified Solutions Architect path." }
            ]
        },
        "data-science": {
            title: "Data Science & AI Specialist",
            modules: [
                { name: "Statistics & Probability for ML", category: "Math Fundamentals", status: "In Progress", action: "Continue", detail: "The backbone of Data Science. Master linear regression, distributions, and hypothesis testing. Use Khan Academy or StatQuest." },
                { name: "Deep Learning & Neural Networks", category: "Artificial Intelligence", status: "Pending", action: "Start", detail: "Building brain-inspired models. Learn PyTorch and TensorFlow architectures for computer vision. Use fast.ai." },
                { name: "LLM Orchestration: LangChain & Vector DBs", category: "Modern AI", status: "Pending", action: "Start", detail: "Understand the current AI wave. Master prompt engineering, retrieval-augmented generation (RAG), and Pinecone. Resource: DeepLearning.AI." }
            ]
        }
    };

    const key = careerPath.toLowerCase().replace(/\s+/g, '-');
    const roadmap = mockData[key] || {
        title: careerPath,
        modules: [
            { name: "Learning Path for " + careerPath, category: "Basics", status: "In Progress", action: "Continue", detail: "A specialized deep dive into " + careerPath + " fundamentals. Research industry standards for this specific vertical." },
            { name: "Advanced " + careerPath + " Implementation", category: "Advanced", status: "Pending", action: "Start", detail: "Practical application and real-world project builds. Focus on creating a portfolio-worthy outcome." }
        ]
    };

    res.json(roadmap);
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
