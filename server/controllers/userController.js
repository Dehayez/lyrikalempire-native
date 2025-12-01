const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const handlebars = require('handlebars');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const transporter = require('../config/emailConfig');
const { handleQuery } = require('../helpers/dbHelpers');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('./tokenController');
require('dotenv').config();

const resendAttempts = {};

const generateCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const readHTMLFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf-8' }, (err, html) => {
      if (err) {
        reject(err);
      } else {
        resolve(html);
      }
    });
  });
};

const sendEmail = async (to, subject, templateName, context) => {
  const baseTemplatePath = path.join(__dirname, '../templates/emails/base.hbs');
  const templatePath = path.join(__dirname, `../templates/emails/${templateName}.hbs`);

  const baseTemplate = await readHTMLFile(baseTemplatePath);
  const template = await readHTMLFile(templatePath);

  const compiledBaseTemplate = handlebars.compile(baseTemplate);
  const compiledTemplate = handlebars.compile(template);

  const html = compiledBaseTemplate({ body: compiledTemplate(context) });

  await transporter.sendMail({
    from: '"Lyrikal Empire" <info@lyrikalempire.com>',
    to,
    subject,
    html,
  });
};

const verifyToken = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true, decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
};

const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address. Please provide a valid email.' });
  }

  try {
    const existingUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
    const existingUserParams = [username, email];
    const [existingUser] = await db.query(existingUserQuery, existingUserParams);

    if (existingUser.length > 0) {
      const existingUsernames = existingUser.filter(user => user.username === username);
      const existingEmails = existingUser.filter(user => user.email === email);

      if (existingEmails.length > 0 && existingUsernames.length > 0) {
        return res.status(400).json({ error: 'Email and Username are already in use' });
      } else if (existingEmails.length > 0) {
        return res.status(400).json({ error: 'Email is already in use' });
      } else if (existingUsernames.length > 0) {
        return res.status(400).json({ error: 'Username is already in use' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationCode = generateCode();
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);

    await db.query('INSERT INTO temp_users (username, email, password, confirmation_code, confirmation_code_expires) VALUES (?, ?, ?, ?, ?)', [username, email, hashedPassword, confirmationCode, expirationTime]);

    await sendEmail(email, 'Confirm Your Email', 'confirmEmail', { username, confirmationCode });

    res.status(200).json({ message: 'Registration successful. Please check your email to confirm your account.', email });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
  }
};

const verifyConfirmationCode = async (req, res) => {
  const { email, confirmationCode } = req.body;

  if (!email || !confirmationCode) {
    return res.status(400).json({ error: 'Email and confirmation code are required' });
  }

  try {
    const [tempUser] = await db.query('SELECT * FROM temp_users WHERE email = ? AND confirmation_code = ?', [email, confirmationCode]);

    if (!tempUser || tempUser.length === 0) {
      return res.status(400).json({ error: 'Invalid email or confirmation code' });
    }

    if (new Date() > new Date(tempUser[0].confirmation_code_expires)) {
      await db.query('DELETE FROM temp_users WHERE email = ?', [email]);
      return res.status(400).json({ error: 'Confirmation code has expired' });
    }

    const { username, password } = tempUser[0];
    await db.query('INSERT INTO users (username, email, password, confirmed) VALUES (?, ?, ?, ?)', [username, email, password, true]);
    await db.query('DELETE FROM temp_users WHERE email = ?', [email]);

    res.status(200).json({ message: 'Email confirmed successfully' });
  } catch (error) {
    console.error('Error in verifyConfirmationCode:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
  }
};

const verifyResetCode = async (req, res) => {
  const { email, resetCode } = req.body;

  if (!email || !resetCode) {
    return res.status(400).json({ error: 'Email and reset code are required' });
  }

  try {
    const [user] = await db.query('SELECT * FROM users WHERE email = ? AND reset_code = ?', [email, resetCode]);

    if (!user || user.length === 0) {
      return res.status(400).json({ error: 'Invalid email or reset code' });
    }

    if (new Date() > new Date(user[0].reset_code_expires)) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    res.status(200).json({ message: 'Reset code validated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required' });
  }

try {
    const [user] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, email]
    );

    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const accessToken = generateAccessToken(user[0]);
    const refreshToken = generateRefreshToken(user[0]);

    res.json({ accessToken, refreshToken, email: user[0].email, username: user[0].username, id: user[0].id });
  } catch (error) {
    console.error('Error during login process:', error);

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({ error: 'Database is not reachable. Please try again later.' });
    }

    res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
  }
};

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const username = user[0].username;
    const resetCode = generateCode();
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);

    await db.query('UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?', [resetCode, expirationTime, email]);

    await sendEmail(email, 'Reset Your Password', 'resetPassword', { username, resetCode });

    res.status(200).json({ message: 'Password reset code sent. Please check your email.' });
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
  }
};

const resetPassword = async (req, res) => {
  const { email, resetCode, password } = req.body;

  if (!email || !resetCode || !password) {
    return res.status(400).json({ error: 'Email, reset code, and password are required' });
  }

  try {
    const [user] = await db.query('SELECT * FROM users WHERE email = ? AND reset_code = ?', [email, resetCode]);

    if (!user || user.length === 0) {
      return res.status(400).json({ error: 'Invalid email or reset code' });
    }

    if (new Date() > new Date(user[0].reset_code_expires)) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query('UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE email = ?', [hashedPassword, email]);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await db.query('SELECT id, email, username FROM users WHERE id = ?', [decoded.id]);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.json({ email: user[0].email, username: user[0].username, id: user[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserDetails = async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const { username } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    await handleQuery(
      'UPDATE users SET username = ? WHERE id = ?',
      [username, userId],
      res,
      'User details updated successfully'
    );
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [user] = await db.query('SELECT id, username, email FROM users WHERE id = ?', [id]);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.json({ id: user[0].id, username: user[0].username, email: user[0].email });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  verifyConfirmationCode,
  login,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  verifyToken,
  getUserDetails,
  updateUserDetails,
  getUserById,
};