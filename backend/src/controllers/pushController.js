const db = require('../config/database');
const { sendPushNotification, isFirebaseConfigured } = require('../services/pushService');

// Send push notification
const sendPush = async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: '제목과 메시지를 입력해주세요' });
  }

  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Get FCM tokens
    const [tokens] = await db.execute(
      'SELECT token FROM fcm_tokens WHERE project_id = ?',
      [req.params.projectId]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: '푸시를 받을 기기가 없습니다' });
    }

    // Send notifications (with projectId)
    const tokenList = tokens.map(t => t.token);
    const result = await sendPushNotification(req.params.projectId, tokenList, title, message);

    // Save notification record
    await db.execute(
      'INSERT INTO push_notifications (project_id, title, message, sent_count) VALUES (?, ?, ?, ?)',
      [req.params.projectId, title, message, result.successCount]
    );

    // Return response with demo flag if applicable
    res.json({
      message: result.demo ? '푸시 알림 데모 (Firebase 미설정)' : '푸시 알림이 전송되었습니다',
      sent_count: result.successCount,
      failed_count: result.failureCount,
      demo: result.demo || false,
      demo_message: result.demo ? result.message : undefined
    });
  } catch (error) {
    console.error('Send push error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get push notification history
const getPushHistory = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const [notifications] = await db.execute(
      'SELECT * FROM push_notifications WHERE project_id = ? ORDER BY sent_at DESC LIMIT 50',
      [req.params.projectId]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get push history error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  sendPush,
  getPushHistory
};
