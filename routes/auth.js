const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');

// GET Login Page
router.get('/login', (req, res) => {
  // Check if user is already authenticated via JWT
  if (req.cookies.authToken) {
    return res.redirect('/');
  }
  res.render('auth/login', {
    error: req.query.error || null,
    success: req.query.success || null
  });
});

// POST Login
router.post('/login', async (req, res) => {
  try {
    const { whatsapp, password } = req.body;

    // Validation
    if (!whatsapp || !password) {
      return res.redirect('/login?error=' + encodeURIComponent('WhatsApp dan password harus diisi'));
    }

    // Normalize WhatsApp number (remove spaces, dashes, etc)
    const normalizedWhatsapp = whatsapp.replace(/[^0-9]/g, '');

    let user = null;
    let isSuperAdmin = false;

    // Step 1: Check users table first (priority)
    const [users] = await db.execute(
      'SELECT u.*, b.nama_cabang as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.whatsapp = ? AND u.deleted_at IS NULL',
      [normalizedWhatsapp]
    );

    if (users.length > 0) {
      // Found in users table
      user = users[0];
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.redirect('/login?error=' + encodeURIComponent('Nomor WhatsApp atau password salah'));
      }

      // Check if this user is super_admin by role_name
      isSuperAdmin = (user.role_name === 'super_admin' || user.role_name === 'superadmin');

    } else {
      // Step 2: Not found in users table, check super_admin table
      const [superAdmins] = await db.execute(
        'SELECT * FROM super_admin WHERE whatsapp = ?',
        [normalizedWhatsapp]
      );

      if (superAdmins.length === 0) {
        return res.redirect('/login?error=' + encodeURIComponent('Nomor WhatsApp atau password salah'));
      }

      user = superAdmins[0];
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.redirect('/login?error=' + encodeURIComponent('Nomor WhatsApp atau password salah'));
      }

      // This is from super_admin table
      isSuperAdmin = true;
    }

    // Generate JWT token
    const userData = {
      id: user.id,
      name: user.name,
      whatsapp: user.whatsapp,
      role_name: isSuperAdmin ? 'super_admin' : user.role_name,
      branch_id: user.branch_id || null,
      branch_name: user.branch_name || null,
      jabatan: user.jabatan || null,
      isSuperAdmin: isSuperAdmin
    };

    // Try to ensure last_login column exists, read previous value, then update it
    try {
      if (!isSuperAdmin) {
        await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL DEFAULT NULL");
        const [rows] = await db.execute("SELECT last_login FROM users WHERE id = ?", [user.id]);
        if (rows && rows.length > 0 && rows[0].last_login) {
          userData.lastLogin = rows[0].last_login; // previous login
        }
        await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);
      } else {
        await db.execute("ALTER TABLE super_admin ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL DEFAULT NULL");
        const [rows] = await db.execute("SELECT last_login FROM super_admin WHERE id = ?", [user.id]);
        if (rows && rows.length > 0 && rows[0].last_login) {
          userData.lastLogin = rows[0].last_login;
        }
        await db.execute("UPDATE super_admin SET last_login = NOW() WHERE id = ?", [user.id]);
      }
    } catch (e) {
      console.warn('Could not read/update last_login column:', e.message);
      // fallback: do not block login
    }

    const token = generateToken(userData);

    // Set JWT token as HTTP-only cookie (more secure)
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.redirect('/?success=' + encodeURIComponent(`Selamat datang, ${user.name}!`));

  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login?error=' + encodeURIComponent('Terjadi kesalahan saat login. Silakan coba lagi.'));
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  // Clear JWT token cookie
  res.clearCookie('authToken');
  res.redirect('/login?success=' + encodeURIComponent('Anda telah berhasil logout'));
});

module.exports = router;
