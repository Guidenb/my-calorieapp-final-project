// server.js (ฉบับแก้ไข: เพิ่ม Error Handlers)

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const port = 3000;
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_VERY_LONG_AND_COMPLEX_SECRET_KEY_HERE';

// Middleware
app.use(express.json());

// 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล (DB Connection Pool)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '150346',
    database: process.env.DB_NAME || 'calorie_app_db',
    waitForConnections: true,
    connectionLimit: 10,
});

// Middleware สำหรับยืนยัน JWT Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects format: Bearer TOKEN

    if (token == null) return res.status(401).json({ message: 'Authorization token missing.' }); // 🛑 ส่ง JSON 401

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token.' }); // 🛑 ส่ง JSON 403
        req.user = user;
        next();
    });
}

// ทดสอบการเชื่อมต่อฐานข้อมูลเมื่อ Server เริ่ม
db.getConnection()
    .then(connection => {
        console.log('Database connected successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });


// ===================================
// AUTH ROUTES (Register & Login)
// ===================================

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        const [users] = await db.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        res.status(201).json({ 
            status: true, 
            message: 'User registered successfully', 
            userId: result.insertId 
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [users] = await db.execute('SELECT id, name, email, password FROM users WHERE email = ?', [email]);
        const user = users[0];
        
        if (!user) {
            return res.status(401).json({ message: 'Email not found or credentials incorrect' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password); 

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Email not found or credentials incorrect' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({ 
            status: true,
            message: 'Login successful',
            token: token,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
});


// ===================================
// PROFILE ROUTES
// ===================================

app.get('/profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const [profile] = await db.execute('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

        if (profile.length === 0) {
            return res.status(200).json({ 
                user_id: userId,
                weight: null,
                height: null,
                age: null,
                gender: null,
                bmr: 0,
            });
        }

        res.status(200).json(profile[0]);
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ message: 'Server error fetching profile', error: error.message });
    }
});


app.post('/profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { weight, height, age, gender, bmr } = req.body;

    if (!weight || !height || !age || !gender || bmr === undefined) {
        return res.status(400).json({ message: 'Missing required profile fields.' });
    }

    try {
        
        await db.execute(
            `INSERT INTO user_profiles (user_id, weight, height, age, gender, bmr) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE weight = VALUES(weight), 
                                     height = VALUES(height), 
                                     age = VALUES(age), 
                                     gender = VALUES(gender), 
                                     bmr = VALUES(bmr),
                                     updated_at = NOW()`,
            [userId, weight, height, age, gender, bmr]
        );

        res.status(200).json({ 
            status: true, 
            message: 'Profile saved successfully',
            data: req.body
        });
    } catch (error) {
        console.error('Save Profile Error:', error);
        res.status(500).json({ message: 'Server error saving profile', error: error.message });
    }
});

// 🛑 2. Middleware สำหรับจัดการ Error 404 (ใส่ไว้ก่อน app.listen)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Resource not found' });
});

// 🛑 3. Middleware สำหรับจัดการ Error ทั่วไป (ใส่ไว้ก่อน app.listen)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke on the server!', error: err.message });
});


// ===================================
// START SERVER
// ===================================
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
