require('dotenv').config()
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../supabase')

// ── REGISTER ──────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body

    // Password hash karo
    const hashedPassword = await bcrypt.hash(password, 10)

    // Supabase me save karo
    const { data, error } = await supabase
        .from('users')
        .insert([{ name, email, password: hashedPassword, role }])
        .select()
        .single()

    if (error) return res.status(400).json({ error: error.message })

    // Token banao
    const token = jwt.sign(
        { id: data.id, role: data.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    )

    res.json({ message: 'Registered!', token, user: data })
})

// ── LOGIN ──────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body

    // User dhundo
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (error || !user)
        return res.status(400).json({ error: 'User nahi mila!' })

    // Password check karo
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch)
        return res.status(400).json({ error: 'Wrong password!' })

    // Token banao
    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    )

    res.json({ message: 'Login successful!', token, user })
})

module.exports = router