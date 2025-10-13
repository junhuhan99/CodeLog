const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, email, username, profile_image, bio, company, location, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  const { username, bio, company, location } = req.body;

  try {
    await db.execute(
      'UPDATE users SET username = ?, bio = ?, company = ?, location = ? WHERE id = ?',
      [username, bio, company, location, req.user.id]
    );

    // Log activity
    await logActivity(req.user.id, 'profile_update', { username, bio, company, location }, req);

    res.json({ message: '프로필이 업데이트되었습니다' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Update profile image
const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일을 선택해주세요' });
    }

    const profileImagePath = `/uploads/profiles/${req.file.filename}`;

    await db.execute(
      'UPDATE users SET profile_image = ? WHERE id = ?',
      [profileImagePath, req.user.id]
    );

    res.json({
      message: '프로필 이미지가 업데이트되었습니다',
      profile_image: profileImagePath
    });
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Change password
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다' });
  }

  try {
    // Get current user with password
    const [users] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: '비밀번호가 변경되었습니다' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get user activity logs
const getActivityLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const [logs] = await db.execute(
      `SELECT * FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      logs,
      total: countResult[0].total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Helper function to log activities
const logActivity = async (userId, activityType, activityData = {}, req = null) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await db.execute(
      `INSERT INTO activity_logs (user_id, activity_type, activity_data, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, activityType, JSON.stringify(activityData), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Log activity error:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfileImage,
  changePassword,
  getActivityLogs,
  logActivity
};
