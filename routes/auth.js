const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// GET Login Page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', {
    error: req.session.errorMessage,
    success: req.session.successMessage
  });
  delete req.session.errorMessage;
  delete req.session.successMessage;
});

// POST Login
router.post('/login', async (req, res) => {
  try {
    const { whatsapp, password } = req.body;

    // Validation
    if (!whatsapp || !password) {
      req.session.errorMessage = 'WhatsApp dan password harus diisi';
      return res.redirect('/login');
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
        req.session.errorMessage = 'Nomor WhatsApp atau password salah';
        return res.redirect('/login');
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
        req.session.errorMessage = 'Nomor WhatsApp atau password salah';
        return res.redirect('/login');
      }

      user = superAdmins[0];
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        req.session.errorMessage = 'Nomor WhatsApp atau password salah';
        return res.redirect('/login');
      }

      // This is from super_admin table
      isSuperAdmin = true;
    }

    // Set session with user data
    req.session.user = {
      id: user.id,
      name: user.name,
      whatsapp: user.whatsapp,
      role_name: isSuperAdmin ? 'super_admin' : user.role_name,
      branch_id: user.branch_id || null,
      branch_name: user.branch_name || null,
      jabatan: user.jabatan || null,
      isSuperAdmin: isSuperAdmin
    };

    req.session.successMessage = `Selamat datang, ${user.name}!`;
    res.redirect('/');

  } catch (error) {
    console.error('Login error:', error);
    req.session.errorMessage = 'Terjadi kesalahan saat login. Silakan coba lagi.';
    res.redirect('/login');
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
