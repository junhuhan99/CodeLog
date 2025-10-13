const db = require('../config/database');
// Use Capacitor-based builder for official Android Studio method
const { buildAndroidApp } = require('../services/androidBuilderCapacitor');

// Get builds for project
const getBuilds = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const [builds] = await db.execute(
      'SELECT * FROM builds WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );

    res.json({ builds });
  } catch (error) {
    console.error('Get builds error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Create new build
const createBuild = async (req, res) => {
  const { build_type, version_code, version_name } = req.body;

  if (!['apk', 'aab'].includes(build_type)) {
    return res.status(400).json({ error: '빌드 타입은 apk 또는 aab여야 합니다' });
  }

  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT p.*, ps.* FROM projects p LEFT JOIN project_settings ps ON p.id = ps.project_id WHERE p.id = ? AND p.user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const project = projects[0];

    // Create build record
    const [result] = await db.execute(
      'INSERT INTO builds (project_id, build_type, version_code, version_name) VALUES (?, ?, ?, ?)',
      [req.params.projectId, build_type, version_code || 1, version_name || '1.0.0']
    );

    const buildId = result.insertId;

    // Start build process asynchronously
    buildAndroidApp(buildId, project, build_type)
      .then(() => console.log(`Build ${buildId} completed`))
      .catch(err => console.error(`Build ${buildId} failed:`, err));

    res.status(201).json({
      message: '빌드가 시작되었습니다',
      build_id: buildId
    });
  } catch (error) {
    console.error('Create build error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get build status
const getBuildStatus = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const [builds] = await db.execute(
      'SELECT * FROM builds WHERE id = ? AND project_id = ?',
      [req.params.buildId, req.params.projectId]
    );

    if (builds.length === 0) {
      return res.status(404).json({ error: '빌드를 찾을 수 없습니다' });
    }

    res.json({ build: builds[0] });
  } catch (error) {
    console.error('Get build status error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Download build file
const downloadBuild = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Get build info
    const [builds] = await db.execute(
      'SELECT * FROM builds WHERE id = ? AND project_id = ?',
      [req.params.buildId, req.params.projectId]
    );

    if (builds.length === 0) {
      return res.status(404).json({ error: '빌드를 찾을 수 없습니다' });
    }

    const build = builds[0];

    if (build.build_status !== 'success') {
      return res.status(400).json({ error: '빌드가 완료되지 않았습니다' });
    }

    if (!build.build_file) {
      return res.status(404).json({ error: '빌드 파일을 찾을 수 없습니다' });
    }

    // Check if file exists
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../../', build.build_file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '빌드 파일이 존재하지 않습니다' });
    }

    // Get project name for filename
    const [project] = await db.execute(
      'SELECT app_name FROM projects WHERE id = ?',
      [req.params.projectId]
    );

    const fileName = `${project[0].app_name.replace(/\s+/g, '_')}_v${build.version_name}.${build.build_type}`;

    // Download file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '파일 다운로드 중 오류가 발생했습니다' });
        }
      }
    });
  } catch (error) {
    console.error('Download build error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  getBuilds,
  createBuild,
  getBuildStatus,
  downloadBuild
};
