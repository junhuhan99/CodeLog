const admin = require('firebase-admin');
const db = require('../config/database');

// Store Firebase app instances per project
const firebaseApps = new Map();

// Get Firebase credentials for a project from database
const getProjectFirebaseConfig = async (projectId) => {
  try {
    const [projects] = await db.execute(
      `SELECT firebase_project_id, firebase_private_key, firebase_client_email, firebase_config_uploaded
       FROM projects
       WHERE id = ?`,
      [projectId]
    );

    if (projects.length === 0) {
      return null;
    }

    const project = projects[0];

    // Check if Firebase is configured for this project
    if (!project.firebase_config_uploaded ||
        !project.firebase_project_id ||
        !project.firebase_private_key ||
        !project.firebase_client_email) {
      return null;
    }

    return {
      projectId: project.firebase_project_id,
      privateKey: project.firebase_private_key,
      clientEmail: project.firebase_client_email
    };
  } catch (error) {
    console.error('Error getting Firebase config:', error);
    return null;
  }
};

// Initialize Firebase for a specific project
const initializeFirebaseForProject = async (projectId) => {
  // Check if already initialized
  if (firebaseApps.has(projectId)) {
    return firebaseApps.get(projectId);
  }

  try {
    // Get Firebase config from database
    const config = await getProjectFirebaseConfig(projectId);

    if (!config) {
      console.warn(`Firebase not configured for project ${projectId}`);
      return null;
    }

    // Format private key (handle escaped newlines)
    const formattedPrivateKey = config.privateKey.replace(/\\n/g, '\n');

    // Create unique app name for this project
    const appName = `project-${projectId}`;

    // Initialize Firebase app for this project
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        privateKey: formattedPrivateKey,
        clientEmail: config.clientEmail
      })
    }, appName);

    // Store the app instance
    firebaseApps.set(projectId, app);

    console.log(`✓ Firebase initialized for project ${projectId}`);
    return app;
  } catch (error) {
    console.error(`✗ Firebase initialization failed for project ${projectId}:`, error.message);
    return null;
  }
};

// Get Firebase app for a project (initialize if needed)
const getFirebaseApp = async (projectId) => {
  if (firebaseApps.has(projectId)) {
    return firebaseApps.get(projectId);
  }

  return await initializeFirebaseForProject(projectId);
};

// 푸시 알림 전송 (project-specific)
const sendPushNotification = async (projectId, tokens, title, message, data = {}) => {
  // Get Firebase app for this project
  const app = await getFirebaseApp(projectId);

  if (!app) {
    // Firebase가 설정되지 않은 경우 데모 응답
    console.warn(`Push notification skipped - Firebase not configured for project ${projectId}`);
    return {
      successCount: tokens.length,
      failureCount: 0,
      demo: true,
      message: 'Firebase not configured for this project. Please upload Firebase configuration.'
    };
  }

  try {
    // 배치로 전송 (최대 500개씩)
    const batchSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const payload = {
        notification: {
          title: title,
          body: message
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: Date.now().toString()
        }
      };

      // 멀티캐스트 메시지 전송
      const response = await admin.messaging(app).sendMulticast({
        tokens: batch,
        notification: payload.notification,
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        }
      });

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // 실패한 토큰 수집
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx]);
            console.error(`Failed to send to token ${batch[idx]}: ${resp.error?.message || 'Unknown error'}`);
          }
        });
      }
    }

    console.log(`Push notification sent to project ${projectId}: ${totalSuccess} success, ${totalFailure} failure`);

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      failedTokens
    };
  } catch (error) {
    console.error('Push notification error:', error);
    throw error;
  }
};

// 단일 디바이스에 푸시 전송 (project-specific)
const sendToDevice = async (projectId, token, title, message, data = {}) => {
  const app = await getFirebaseApp(projectId);

  if (!app) {
    return {
      success: false,
      demo: true,
      message: 'Firebase not configured for this project'
    };
  }

  try {
    const payload = {
      notification: {
        title: title,
        body: message
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      }
    };

    const response = await admin.messaging(app).send({
      token: token,
      notification: payload.notification,
      data: payload.data,
      android: {
        priority: 'high'
      }
    });

    return { success: true, messageId: response };
  } catch (error) {
    console.error('Send to device error:', error);
    return { success: false, error: error.message };
  }
};

// 토픽에 푸시 전송 (project-specific)
const sendToTopic = async (projectId, topic, title, message, data = {}) => {
  const app = await getFirebaseApp(projectId);

  if (!app) {
    return {
      success: false,
      demo: true,
      message: 'Firebase not configured for this project'
    };
  }

  try {
    const payload = {
      notification: {
        title: title,
        body: message
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      }
    };

    const response = await admin.messaging(app).send({
      topic: topic,
      notification: payload.notification,
      data: payload.data,
      android: {
        priority: 'high'
      }
    });

    return { success: true, messageId: response };
  } catch (error) {
    console.error('Send to topic error:', error);
    return { success: false, error: error.message };
  }
};

// 토큰 유효성 검증 (project-specific)
const validateToken = async (projectId, token) => {
  const app = await getFirebaseApp(projectId);

  if (!app) {
    return { valid: false, demo: true };
  }

  try {
    // 테스트 메시지 전송 (dry run)
    await admin.messaging(app).send({
      token: token,
      data: { test: 'true' }
    }, true);

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Check if Firebase is configured for a project
const isFirebaseConfigured = async (projectId) => {
  const config = await getProjectFirebaseConfig(projectId);
  return config !== null;
};

// Cleanup - remove Firebase app instance for a project
const cleanupFirebaseApp = (projectId) => {
  if (firebaseApps.has(projectId)) {
    try {
      const app = firebaseApps.get(projectId);
      admin.app(app.name).delete();
      firebaseApps.delete(projectId);
      console.log(`✓ Firebase app cleaned up for project ${projectId}`);
    } catch (error) {
      console.error(`Error cleaning up Firebase app for project ${projectId}:`, error);
    }
  }
};

module.exports = {
  sendPushNotification,
  sendToDevice,
  sendToTopic,
  validateToken,
  isFirebaseConfigured,
  cleanupFirebaseApp
};
