const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Validation rules
const projectValidation = [
  body('project_name').notEmpty().withMessage('프로젝트 이름을 입력해주세요'),
  body('app_name').notEmpty().withMessage('앱 이름을 입력해주세요'),
  body('package_name').matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/).withMessage('올바른 패키지 이름 형식이 아닙니다 (예: com.example.app)'),
  body('project_type').isIn(['url', 'template']).withMessage('프로젝트 타입은 url 또는 template이어야 합니다')
];

// Get all projects for user
const getProjects = async (req, res) => {
  try {
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get single project
const getProject = async (req, res) => {
  try {
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Get project settings
    const [settings] = await db.execute(
      'SELECT * FROM project_settings WHERE project_id = ?',
      [req.params.id]
    );

    // Get bottom tabs
    const [tabs] = await db.execute(
      'SELECT * FROM bottom_tabs WHERE project_id = ? ORDER BY tab_order',
      [req.params.id]
    );

    res.json({
      project: projects[0],
      settings: settings[0] || null,
      tabs
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Create project
const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { project_name, app_name, package_name, app_description, project_type, website_url } = req.body;

  // Validate website_url if project_type is 'url'
  if (project_type === 'url' && !website_url) {
    return res.status(400).json({ error: 'URL 기반 프로젝트는 웹사이트 URL이 필요합니다' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Create project
    const [result] = await connection.execute(
      'INSERT INTO projects (user_id, project_name, app_name, package_name, app_description, project_type, website_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, project_name, app_name, package_name, app_description, project_type, website_url]
    );

    const projectId = result.insertId;

    // Create default settings
    await connection.execute(
      'INSERT INTO project_settings (project_id) VALUES (?)',
      [projectId]
    );

    // If template project, create default pages
    if (project_type === 'template') {
      const templatePages = ['login', 'register', 'board', 'mypage', 'splash'];
      for (const pageType of templatePages) {
        await connection.execute(
          'INSERT INTO template_pages (project_id, page_type) VALUES (?, ?)',
          [projectId, pageType]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      message: '프로젝트가 생성되었습니다',
      project_id: projectId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create project error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  } finally {
    connection.release();
  }
};

// Update project
const updateProject = async (req, res) => {
  const { project_name, app_name, app_description } = req.body;

  try {
    const [result] = await db.execute(
      'UPDATE projects SET project_name = ?, app_name = ?, app_description = ? WHERE id = ? AND user_id = ?',
      [project_name, app_name, app_description, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    res.json({ message: '프로젝트가 업데이트되었습니다' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    res.json({ message: '프로젝트가 삭제되었습니다' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Update project settings
const updateProjectSettings = async (req, res) => {
  const { push_enabled, splash_enabled, bottom_tab_enabled, theme_color } = req.body;

  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    await db.execute(
      'UPDATE project_settings SET push_enabled = ?, splash_enabled = ?, bottom_tab_enabled = ?, theme_color = ? WHERE project_id = ?',
      [push_enabled, splash_enabled, bottom_tab_enabled, theme_color, req.params.id]
    );

    res.json({ message: '설정이 업데이트되었습니다' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Upload Firebase configuration
const uploadFirebaseConfig = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const { firebase_config } = req.body;

    // Validate Firebase config JSON
    if (!firebase_config) {
      return res.status(400).json({ error: 'Firebase 설정을 제공해주세요' });
    }

    let configData;
    try {
      // Parse if string, otherwise use as is
      configData = typeof firebase_config === 'string'
        ? JSON.parse(firebase_config)
        : firebase_config;
    } catch (err) {
      return res.status(400).json({ error: '유효하지 않은 JSON 형식입니다' });
    }

    // Validate required fields with detailed error messages
    const requiredFields = [
      { key: 'project_id', name: 'Project ID (프로젝트 ID)' },
      { key: 'private_key', name: 'Private Key (프라이빗 키)' },
      { key: 'client_email', name: 'Client Email (클라이언트 이메일)' }
    ];

    const missingFields = requiredFields.filter(field => !configData[field.key]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Firebase 서비스 계정 JSON 파일의 필수 필드가 누락되었습니다`,
        missing_fields: missingFields.map(f => f.name),
        details: `다음 필드가 필요합니다: ${missingFields.map(f => f.name).join(', ')}`,
        hint: 'Firebase Console > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성에서 다운로드한 JSON 파일을 업로드해주세요.',
        received_fields: Object.keys(configData).join(', ')
      });
    }

    // Validate private key format
    if (!configData.private_key.includes('BEGIN PRIVATE KEY')) {
      return res.status(400).json({
        error: 'Private Key 형식이 올바르지 않습니다',
        details: 'Private Key는 "-----BEGIN PRIVATE KEY-----"로 시작해야 합니다'
      });
    }

    // Validate client email format
    if (!configData.client_email.includes('@') || !configData.client_email.includes('.iam.gserviceaccount.com')) {
      return res.status(400).json({
        error: 'Client Email 형식이 올바르지 않습니다',
        details: 'Client Email은 Firebase 서비스 계정 이메일이어야 합니다 (예: firebase-adminsdk@your-project.iam.gserviceaccount.com)'
      });
    }

    // Store Firebase credentials in database
    await db.execute(
      `UPDATE projects
       SET firebase_project_id = ?,
           firebase_private_key = ?,
           firebase_client_email = ?,
           firebase_config_uploaded = TRUE
       WHERE id = ? AND user_id = ?`,
      [
        configData.project_id,
        configData.private_key,
        configData.client_email,
        req.params.id,
        req.user.id
      ]
    );

    res.json({
      message: 'Firebase 설정이 업로드되었습니다',
      firebase_configured: true
    });
  } catch (error) {
    console.error('Upload Firebase config error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Remove Firebase configuration
const removeFirebaseConfig = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Remove Firebase credentials
    await db.execute(
      `UPDATE projects
       SET firebase_project_id = NULL,
           firebase_private_key = NULL,
           firebase_client_email = NULL,
           firebase_config_uploaded = FALSE
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    res.json({
      message: 'Firebase 설정이 제거되었습니다',
      firebase_configured: false
    });
  } catch (error) {
    console.error('Remove Firebase config error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  updateProjectSettings,
  uploadFirebaseConfig,
  removeFirebaseConfig,
  projectValidation
};
