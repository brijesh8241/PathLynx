/**
 * PathLynx Core Application Logic
 * Handles Authentication state, Header updates, and Career Onboarding.
 */

const roadmapLibrary = {
    "web-development": {
        title: "Full Stack Web Developer",
        modules: [
            { name: "Frontend: HTML5, CSS3 & Modern Layouts", status: "In Progress", category: "Basics", action: "Continue" },
            { name: "JavaScript: ES6+, DOM & Async Logic", status: "Pending", category: "Core", action: "Start" },
            { name: "Framework Mastery: React.js & Redux", status: "Pending", category: "Frontend", action: "Start" },
            { name: "Backend: Node.js, Express & API Design", status: "Pending", category: "Server", action: "Start" },
            { name: "Databases: PostgreSQL & MongoDB", status: "Pending", category: "Data", action: "Start" },
            { name: "DevOps: Docker, CI/CD & AWS Basics", status: "Pending", category: "Deployment", action: "Start" },
            { name: "Project: Real-time E-commerce Platform", status: "Pending", category: "Practical", action: "Start" },
            { name: "Interview: System Design & DSA Skills", status: "Pending", category: "Career", action: "Start" }
        ]
    },
    "data-science": {
        title: "Data Scientist / AI Engineer",
        modules: [
            { name: "Python: NumPy, Pandas & Data Wrangling", status: "In Progress", category: "Programming", action: "Continue" },
            { name: "Statistics: Inferential & Descriptive Analysis", status: "Pending", category: "Math", action: "Start" },
            { name: "ML: Linear, Logistic & Decision Trees", status: "Pending", category: "Intelligence", action: "Start" },
            { name: "Deep Learning: Neural Networks & PyTorch", status: "Pending", category: "AI", action: "Start" },
            { name: "NLP: LLMs & Transformer Architecture", status: "Pending", category: "Specialization", action: "Start" },
            { name: "Big Data: Apache Spark & Hadoop Ecosystem", status: "Pending", category: "Data", action: "Start" },
            { name: "Capstone: Predictive Housing Market Tool", status: "Pending", category: "Practical", action: "Start" },
            { name: "Interview: Analytical Thinking & Live Coding", status: "Pending", category: "Career", action: "Start" }
        ]
    },
    "cloud-computing": {
        title: "Cloud Architect / DevOps",
        modules: [
            { name: "Cloud Fundamentals: AWS & Azure Core", status: "In Progress", category: "Infrastructure", action: "Continue" },
            { name: "Linux Administration & Shell Scripting", status: "Pending", category: "Basics", action: "Start" },
            { name: "Infrastructure as Code: Terraform", status: "Pending", category: "Automation", action: "Start" },
            { name: "Containers: Docker & Microservices", status: "Pending", category: "Ops", action: "Start" },
            { name: "Orchestration: Kubernetes Administration", status: "Pending", category: "Ops", action: "Start" },
            { name: "Security: Identity Access & IAM", status: "Pending", category: "Cloud", action: "Start" },
            { name: "Project: Auto-scaling Enterprise App", status: "Pending", category: "Practical", action: "Start" },
            { name: "Career: Professional Cloud Certification", status: "Pending", category: "Career", action: "Start" }
        ]
    }
};

window.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupOnboardingListener();
});

async function checkAuthState() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();

        updateHeader(data);

        /* Automatic onboarding disabled - users will see dashboard first */
        /*
        if (data.authenticated && !data.user.selectedPath) {
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath.includes('index.html') || currentPath.includes('dashboard.html')) {
                showOnboardingOverlay();
            }
        }
        */

        // Fetch current user selection on load
        fetch('/api/user')
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    if (data.user.selectedPath && document.getElementById('career-path-container')) {
                        // Start generating detailed roadmap if path already chosen
                        const loader = document.getElementById('generating-overlay');
                        if (loader) loader.style.display = 'flex';
                        
                        fetch('/api/generate-roadmap', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: data.user.selectedPath, skills: data.user.skills || [] })
                        })
                        .then(res => res.json())
                        .then(roadmap => {
                            if (loader) loader.style.display = 'none';
                            renderDetailedRoadmap(roadmap);
                        })
                        .catch(err => {
                            if (loader) loader.style.display = 'none';
                            console.error("Auto AI generation failed:", err);
                        });
                    }
                    
                    // Resume AI saved state auto-load
                    if (window.location.pathname.includes('resume.html') && data.user.resume_data) {
                        const uploadSection = document.getElementById('upload-section');
                        if (uploadSection) uploadSection.style.display = 'none';
                        window.showResumeResults(data.user.resume_data);
                    }
                }
            });
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateHeader(data) {
    const loginBtn = document.querySelector('.btn-login');
    const profileIcon = document.querySelector('.profile-icon');
    const headerRight = document.querySelector('.header-right');

    if (data.authenticated) {
        if (headerRight) {
            if (loginBtn) loginBtn.style.display = 'none';
            // Show Profile Icon and User Name
            if (profileIcon) {
                profileIcon.style.display = 'flex';
                profileIcon.style.cursor = 'pointer';
                profileIcon.title = 'Go to Dashboard';
                profileIcon.onclick = () => window.location.href = 'dashboard.html';
                
                // Add username next to profile if not already there
                if (!document.getElementById('header-user-name')) {
                    const nameSpan = document.createElement('span');
                    nameSpan.id = 'header-user-name';
                    nameSpan.className = 'header-name';
                    nameSpan.style.cursor = 'pointer';
                    nameSpan.onclick = () => window.location.href = 'dashboard.html';
                    nameSpan.style.fontWeight = '600';
                    nameSpan.style.color = 'var(--text-main)';
                    nameSpan.innerText = data.user.name;
                    headerRight.insertBefore(nameSpan, profileIcon);
                }

                // Also ensure there is a "Dashboard" link in header-right if not already there
                if (!document.getElementById('header-dash-link') && !window.location.pathname.includes('dashboard.html')) {
                    const dashLink = document.createElement('a');
                    dashLink.id = 'header-dash-link';
                    dashLink.href = 'dashboard.html';
                    dashLink.className = 'btn btn-primary';
                    dashLink.style.padding = '0.5rem 1rem';
                    dashLink.style.fontSize = '0.85rem';
                    dashLink.innerHTML = '<i class="fa-solid fa-gauge"></i> Dashboard';
                    headerRight.insertBefore(dashLink, document.getElementById('header-user-name'));
                }
            }
        }

        // Dashboard specific updates
        const dashName = document.getElementById('dash-user-name');
        const dashRole = document.getElementById('dash-user-role');
        const dashTitle = document.getElementById('dash-title');
        const dashSubtitle = dashTitle ? dashTitle.nextElementSibling : null;

        if (dashName) dashName.innerText = data.user.name;
        if (dashRole) dashRole.innerText = (data.user.role || 'Member') + (data.user.selectedPath ? ` • ${data.user.selectedPath}` : '');
        
        // Update initials
        const dashInitials = document.getElementById('dash-profile-initials');
        if (dashInitials && data.user.name) {
            dashInitials.innerText = data.user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }

        // ROLE-BASED DASHBOARD SWITCHING
        const role = data.user.role || 'student';
        
        // Hide all first
        ['student', 'admin', 'recruiter'].forEach(r => {
            const nav = document.querySelector(`.role-nav-${r}`);
            const stats = document.getElementById(`stats-${r}`);
            const section = document.getElementById(`section-${r}`);
            const sideStudent = document.getElementById('side-student-radar');
            if (nav) nav.style.display = 'none';
            if (stats) stats.style.display = 'none';
            if (section) section.style.display = 'none';
            if (sideStudent) sideStudent.style.display = 'none';
        });

        // Show active role elements
        const activeNav = document.querySelector(`.role-nav-${role}`);
        const activeStats = document.getElementById(`stats-${role}`);
        const activeSection = document.getElementById(`section-${role}`);
        const sideStudentRadar = document.getElementById('side-student-radar');
        const roleBadge = document.getElementById('role-badge');
        
        if (activeNav) {
            activeNav.style.display = 'block';
            // Set first child as active by default if none is
            const firstLink = activeNav.querySelector('a');
            if (firstLink && !activeNav.querySelector('.active')) {
                firstLink.classList.add('active');
            }
        }
        if (activeStats) activeStats.style.display = 'grid';
        if (activeSection) activeSection.style.display = 'block';
        if (role === 'student' && sideStudentRadar) sideStudentRadar.style.display = 'block';
        if (roleBadge) {
            roleBadge.innerText = role;
            roleBadge.style.display = 'inline-block';
        }

        if (dashTitle) {
            if (role === 'admin') {
                dashTitle.innerText = "System Command Center";
                if (dashSubtitle) dashSubtitle.innerText = "Full oversight of PathLynx intelligence systems and user data.";
                const promoTitle = document.getElementById('promo-title');
                if (promoTitle) promoTitle.innerText = "System Health: Optimal";
            } else if (role === 'recruiter') {
                dashTitle.innerText = "Talent Acquisition Portal";
                if (dashSubtitle) dashSubtitle.innerText = "Strategic talent sourcing and candidate trajectory analysis.";
                const promoTitle = document.getElementById('promo-title');
                if (promoTitle) promoTitle.innerText = "Sourcing Pro Mode";
            } else {
                dashTitle.innerText = "Career Experience Portal";
                if (dashSubtitle) dashSubtitle.innerText = "Orchestrate your professional growth path with AI precision.";
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (profileIcon) profileIcon.style.display = 'none';
        const nameSpan = document.getElementById('header-user-name');
        if (nameSpan) nameSpan.remove();
    }
}

function showOnboardingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = `
        <div class="onboarding-card animate-up">
            <button class="close-onboarding" onclick="document.getElementById('onboarding-overlay').remove()">&times;</button>
            <div class="onboarding-header">
                <span class="badge-v2 badge-primary">AI Career Architect</span>
                <h2>Define Your Future 🎯</h2>
                <p>Provide details to generate your hyper-personalized professional growth plan.</p>
            </div>
            
            <div class="onboarding-form">
                <div class="input-group-v2">
                    <label>Target Career Path</label>
                    <input type="text" id="career-input" placeholder="e.g. Senior DevOps Engineer, AI Research..." autofocus>
                </div>
                <div class="input-group-v2">
                    <label>Existing Skills (comma separated)</label>
                    <input type="text" id="skills-input" placeholder="e.g. Python, SQL, Project Mgmt...">
                </div>
                <div class="input-group-v2">
                    <label>Your Professional Goal</label>
                    <select id="goal-input">
                        <option value="career-change">Switch Career Path</option>
                        <option value="promotion">Level up in current role</option>
                        <option value="interview-prep">Crack specific tech interviews</option>
                        <option value="freelance">Launch independent consulting</option>
                    </select>
                </div>
                
                <button id="start-guidance-btn" class="btn-premium" style="width: 100%; margin-top: 1.5rem; justify-content: center;">
                    Generate Professional Roadmap <i class="fa-solid fa-wand-magic-sparkles"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // CSS for the new onboarding (added dynamically or to style.css)
    const style = document.createElement('style');
    style.innerHTML = `
        #onboarding-overlay {
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(20px); z-index: 5000; display: flex;
            align-items: center; justify-content: center; padding: 2rem;
        }
        .onboarding-card {
            background: white; width: 100%; max-width: 550px; padding: 3.5rem;
            border-radius: 30px; position: relative; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5);
        }
        .onboarding-header { text-align: center; margin-bottom: 2.5rem; }
        .onboarding-header h2 { font-size: 2rem; margin-bottom: 0.5rem; }
        .close-onboarding {
            position: absolute; top: 2rem; right: 2rem; background: none; border: none;
            font-size: 2rem; color: #94A3B8; cursor: pointer;
        }
        .input-group-v2 { margin-bottom: 1.5rem; }
        .input-group-v2 label { display: block; margin-bottom: 0.5rem; font-weight: 700; font-size: 0.85rem; color: #475569; }
        .input-group-v2 input, .input-group-v2 select {
            width: 100%; padding: 0.85rem 1.25rem; border: 2px solid #F1F5F9;
            border-radius: 12px; font-family: inherit; font-size: 0.95rem; outline: none;
            transition: all 0.3s ease;
        }
        .input-group-v2 input:focus { border-color: #6366F1; background: #F8FAFC; }
    `;
    document.head.appendChild(style);

    document.getElementById('start-guidance-btn').onclick = async () => {
        const path = document.getElementById('career-input').value.trim();
        const skillsString = document.getElementById('skills-input').value.trim();
        const skills = skillsString ? skillsString.split(',').map(s => s.trim()) : [];
        if (path) {
            await saveOnboarding(path, skills);
        }
    };
}

async function saveOnboarding(choice, skills = []) {
    // Save choice to backend
    fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: choice, skills: skills })
    });

    // Show AI Generation Overlay
    const loader = document.getElementById('generating-overlay');
    if (loader) loader.style.display = 'flex';

    // Fetch AI-Generated Detailed Roadmap
    fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: choice, skills: skills })
    })
    .then(res => res.json())
    .then(roadmap => {
        if (loader) loader.style.display = 'none';
        renderDetailedRoadmap(roadmap);
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.remove();
    })
    .catch(err => {
        if (loader) loader.style.display = 'none';
        console.error("AI Generation failed:", err);
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.remove();
    });
}

function renderDetailedRoadmap(roadmap) {
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.innerText = roadmap.title + " Track";

    const pathHub = document.getElementById('career-path-container');
    if (pathHub) {
        pathHub.innerHTML = '';
        roadmap.modules.forEach((mod, index) => {
            const card = document.createElement('div');
            card.className = 'roadmap-step animate-on-load';
            card.style.animationDelay = `${index * 0.1}s`;
            
            // Add click listener for Deep Dive
            card.onclick = () => showStepDetails(mod);
            
            card.innerHTML = `
                <div class="step-info">
                    <span class="step-category">${mod.category}</span>
                    <span class="step-name">${mod.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <span class="step-status status-${mod.status.toLowerCase().replace(/\s+/g, '-')}">${mod.status}</span>
                    <button class="btn-premium" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="event.stopPropagation(); showStepDetails(${JSON.stringify(mod).replace(/"/g, '&quot;')})">Details</button>
                </div>
            `;
            pathHub.appendChild(card);
        });
    }
}

function showStepDetails(mod) {
    const modal = document.getElementById('step-modal');
    document.getElementById('modal-title').innerText = mod.name;
    document.getElementById('modal-category').innerText = mod.category;
    document.getElementById('modal-detail').innerText = mod.detail || "No additional details available for this step yet.";
    modal.style.display = 'flex';
}

function setupOnboardingListener() {
    // Global listener for escape or close if needed
}

// ====== Resume AI Logic ======
const resumeUpload = document.getElementById('resume-upload');
if (resumeUpload) {
    resumeUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('drop-zone').style.display = 'none';
        const progressDiv = document.getElementById('upload-progress');
        progressDiv.style.display = 'block';

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            document.getElementById('progress-bar').style.width = `${progress}%`;
        }, 500);

        const formData = new FormData();
        formData.append('resume', file);

        try {
            const res = await fetch('/api/analyze-resume', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            clearInterval(interval);
            document.getElementById('progress-bar').style.width = '100%';
            
            setTimeout(() => {
                document.getElementById('upload-section').style.display = 'none';
                showResumeResults(data);
            }, 500);

        } catch (err) {
            clearInterval(interval);
            alert("Error analyzing resume. Please try again.");
            document.getElementById('upload-progress').style.display = 'none';
            document.getElementById('drop-zone').style.display = 'flex';
        }
    });
}

function showResumeResults(data) {
    // Check if enhanced version exists (from resume.html inline script)
    if (window._resumeResultsOverride) {
        return window._resumeResultsOverride(data);
    }
    document.getElementById('results-section').style.display = 'block';
    // Animate Score
    let currentScore = 0;
    const targetScore = parseInt(data.score) || Math.floor(Math.random() * 20) + 75;
    
    const scoreInterval = setInterval(() => {
        currentScore++;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(scoreInterval);
        }
        const scoreEl = document.getElementById('score-value');
        if (scoreEl) scoreEl.innerText = currentScore;
        // SVG ring support
        const circle = document.getElementById('score-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 80;
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = circumference - (currentScore / 100) * circumference;
        }
        // Legacy conic-gradient support
        const gauge = document.getElementById('score-gauge');
        if (gauge) gauge.style.background = `conic-gradient(var(--primary) ${currentScore}%, #E2E8F0 ${currentScore}%)`;
    }, 20);

    // Score grade
    const gradeEl = document.getElementById('score-grade');
    if (gradeEl) {
        if (targetScore >= 90) { gradeEl.textContent = '🏆 Excellent'; gradeEl.style.color = '#059669'; }
        else if (targetScore >= 75) { gradeEl.textContent = '✅ Good'; gradeEl.style.color = '#6366F1'; }
        else if (targetScore >= 60) { gradeEl.textContent = '⚠️ Needs Work'; gradeEl.style.color = '#F59E0B'; }
        else { gradeEl.textContent = '❌ Critical'; gradeEl.style.color = '#DC2626'; }
    }

    // Skill bars
    const skills = data.skillBreakdown || { keywords: targetScore - 5, formatting: targetScore + 3, impact: targetScore - 10, brevity: targetScore + 5, relevance: targetScore - 2 };
    setTimeout(() => {
        ['keywords', 'formatting', 'impact', 'brevity', 'relevance'].forEach(s => {
            const key = s === 'formatting' ? 'format' : s;
            const val = Math.min(100, Math.max(20, (skills[s] || Math.floor(Math.random() * 25) + 60)));
            const fillEl = document.getElementById('fill-' + key);
            const labelEl = document.getElementById('skill-' + key);
            if (fillEl) fillEl.style.width = val + '%';
            if (labelEl) labelEl.textContent = val + '%';
        });
    }, 500);

    // Strengths
    const strengthsList = document.getElementById('strengths-list');
    if (strengthsList && data.strengths) {
        strengthsList.innerHTML = data.strengths.map(s => `<li style="margin-bottom: 0.4rem;">${s}</li>`).join('');
    }

    // Weaknesses
    const weaknessesList = document.getElementById('weaknesses-list');
    if (weaknessesList && data.weaknesses) {
        weaknessesList.innerHTML = data.weaknesses.map(w => `<li style="margin-bottom: 0.4rem;">${w}</li>`).join('');
    }

    // Tips - support both old tips-list and new tips-container
    const tipsContainer = document.getElementById('tips-container');
    const tipsList = document.getElementById('tips-list');
    if (tipsContainer && data.tips) {
        tipsContainer.innerHTML = '';
        const icons = ['fa-bullseye', 'fa-chart-line', 'fa-spell-check', 'fa-link', 'fa-star'];
        const colors = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];
        data.tips.forEach((tip, i) => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `
                <h4><i class="fa-solid ${icons[i % icons.length]}" style="color: ${colors[i % colors.length]};"></i> Suggestion ${i + 1} <span style="margin-left: auto; font-size: 0.75rem; color: #94A3B8;" class="apply-label">Click to apply ✓</span></h4>
                <p>${tip}</p>
            `;
            card.onclick = function() {
                this.classList.toggle('applied');
                const label = this.querySelector('.apply-label');
                label.textContent = this.classList.contains('applied') ? 'Applied ✓' : 'Click to apply ✓';
                label.style.color = this.classList.contains('applied') ? '#059669' : '#94A3B8';
            };
            tipsContainer.appendChild(card);
        });
    } else if (tipsList && data.tips) {
        tipsList.innerHTML = data.tips.map(t => `<li style="margin-bottom: 0.8rem;"><i class="fa-solid fa-arrow-right" style="color: var(--primary); margin-right: 0.5rem;"></i>${t}</li>`).join('');
    }

    // Optimized Summary with typewriter
    const optimizedSummaryBlock = document.getElementById('optimized-summary-text');
    if (optimizedSummaryBlock && data.optimizedSummary) {
        optimizedSummaryBlock.innerText = '';
        let charIdx = 0;
        const typeInterval = setInterval(() => {
            if (charIdx < data.optimizedSummary.length) {
                optimizedSummaryBlock.innerText += data.optimizedSummary[charIdx];
                charIdx++;
            } else { clearInterval(typeInterval); }
        }, 15);
    }
}

// ====== Projects AI Logic ======
const aiSuggestBtn = document.getElementById('ai-suggest-btn');
if (aiSuggestBtn) {
    aiSuggestBtn.addEventListener('click', async () => {
        // Fetch user path
        const userRes = await fetch('/api/user');
        const userData = await userRes.json();
        
        const path = userData.authenticated && userData.user.selectedPath ? userData.user.selectedPath : "Software Engineering";

        const loading = document.getElementById('ai-loading');
        const container = document.getElementById('project-container');
        
        container.style.display = 'none';
        loading.style.display = 'block';

        try {
            const res = await fetch('/api/project-guidance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const projects = await res.json();
            
            loading.style.display = 'none';
            container.innerHTML = '';
            container.style.display = 'grid';

            projects.forEach(proj => {
                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <span class="badge" style="background: #ECFDF5; color: #059669;"><i class="fa-solid fa-robot"></i> AI Suggested</span>
                    <h3 style="font-weight: 800; margin-bottom: 1rem;">${proj.title}</h3>
                    <p style="font-size: 0.9rem; color: #64748B; margin-bottom: 1rem;">${proj.description}</p>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <strong style="font-size: 0.8rem; color: #475569;">Tech Stack:</strong>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                            ${proj.techStack.map(t => `<span style="background: #F1F5F9; color: #475569; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">${t}</span>`).join('')}
                        </div>
                    </div>

                    <div style="background: #1E293B; color: #E2E8F0; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="color: #38BDF8; font-size: 0.85rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-rocket"></i> Antigravity Tips</h4>
                        <ul style="padding-left: 1.2rem; font-size: 0.8rem; line-height: 1.5; color: #CBD5E1;">
                            ${proj.antigravityTips.map(t => `<li style="margin-bottom: 0.3rem;">${t}</li>`).join('')}
                        </ul>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; font-weight: 600; color: #6366F1;"><i class="fa-solid fa-code-branch"></i> Architecture Ready</span>
                        <button onclick="openEditor('${proj.title}', '// Antigravity IDE Auto-Boilerplate\\n// Project: ${proj.title}\\n// Tech Stack: ${proj.techStack.join(', ')}\\n\\nasync function bootstrapProject() {\\n  console.log(\\'🚀 Initializing ${proj.title} architecture...\\');\\n  \\n  // TODO: Implement architecture according to Antigravity tips:\\n${proj.antigravityTips.map(t => '  // - ' + t).join('\\n')}\\n\\n}\\n\\nbootstrapProject();')" style="background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; cursor: pointer;">Start Building <i class="fa-solid fa-code"></i></button>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (err) {
            loading.style.display = 'none';
            container.style.display = 'grid';
            alert("Error generating projects. Please try again.");
        }
    });
}

// ====== Curriculum Courses AI ======
const findCoursesBtn = document.getElementById('find-courses-btn');
if (findCoursesBtn) {
    findCoursesBtn.addEventListener('click', async () => {
        const userRes = await fetch('/api/user');
        const userData = await userRes.json();
        const path = userData.authenticated && userData.user.selectedPath ? userData.user.selectedPath : "Software Engineering";

        const loading = document.getElementById('course-loading');
        const container = document.getElementById('course-container');
        
        container.style.display = 'none';
        loading.style.display = 'block';

        try {
            const res = await fetch('/api/real-courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const courses = await res.json();
            
            loading.style.display = 'none';
            container.innerHTML = '<h2 style="margin-bottom: 2rem;"><i class="fa-solid fa-check-circle" style="color: #10B981;"></i> Official Recommended Courses</h2>';
            container.style.display = 'block';

            courses.forEach(course => {
                let icon = 'fa-certificate';
                let color = '#6366F1';
                if (course.provider.toLowerCase().includes('aws')) {
                    icon = 'fa-aws'; color = '#FF9900';
                } else if (course.provider.toLowerCase().includes('google')) {
                    icon = 'fa-google'; color = '#4285F4';
                }

                container.innerHTML += `
                    <div class="module-item" style="border-left: 4px solid ${color};">
                        <div style="flex-grow: 1; padding-right: 2rem;">
                            <span style="font-size: 0.75rem; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 1px;"><i class="fa-brands ${icon} fa-solid"></i> ${course.provider}</span>
                            <h3 style="font-weight: 700; margin: 0.3rem 0;">${course.title}</h3>
                            <p style="font-size: 0.9rem; color: #64748B;">${course.description}</p>
                        </div>
                        <a href="${course.url}" target="_blank" class="btn-premium" style="background: ${color}; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; white-space: nowrap;">Enroll Now <i class="fa-solid fa-external-link"></i></a>
                    </div>
                `;
            });
        } catch (err) {
            loading.style.display = 'none';
            container.style.display = 'block';
            alert("Error fetching courses.");
        }
    });
}
