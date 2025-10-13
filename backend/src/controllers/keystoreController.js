const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Upload keystore file for a project
 */
const uploadKeystore = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { keystore_password, keystore_alias, keystore_key_password } = req.body;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: '키스토어 파일이 업로드되지 않았습니다' });
    }

    // Validate required fields
    if (!keystore_password || !keystore_alias || !keystore_key_password) {
      // Remove uploaded file if validation fails
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        error: '키스토어 비밀번호, 별칭, 키 비밀번호가 모두 필요합니다'
      });
    }

    // Validate keystore file extension
    if (!req.file.originalname.endsWith('.keystore') &&
        !req.file.originalname.endsWith('.jks') &&
        !req.file.originalname.endsWith('.bks')) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        error: '유효한 키스토어 파일이 아닙니다 (.keystore, .jks, .bks)'
      });
    }

    // Save keystore path to database
    await db.execute(
      `UPDATE projects
       SET keystore_path = ?,
           keystore_password = ?,
           keystore_alias = ?,
           keystore_key_password = ?,
           keystore_uploaded_at = NOW()
       WHERE id = ?`,
      [req.file.path, keystore_password, keystore_alias, keystore_key_password, projectId]
    );

    res.json({
      message: '키스토어가 업로드되었습니다',
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload keystore error:', error);
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * Remove keystore from project
 */
const removeKeystore = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const project = projects[0];

    // Delete keystore file if exists
    if (project.keystore_path) {
      try {
        await fs.unlink(project.keystore_path);
      } catch (err) {
        console.error('Failed to delete keystore file:', err);
        // Continue even if file deletion fails
      }
    }

    // Remove keystore info from database
    await db.execute(
      `UPDATE projects
       SET keystore_path = NULL,
           keystore_password = NULL,
           keystore_alias = NULL,
           keystore_key_password = NULL,
           keystore_uploaded_at = NULL
       WHERE id = ?`,
      [projectId]
    );

    res.json({ message: '키스토어가 제거되었습니다' });
  } catch (error) {
    console.error('Remove keystore error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * Get keystore info (without sensitive data)
 */
const getKeystoreInfo = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT keystore_path, keystore_alias, keystore_uploaded_at FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const project = projects[0];

    if (!project.keystore_path) {
      return res.json({
        has_keystore: false
      });
    }

    // Check if file still exists
    try {
      await fs.access(project.keystore_path);
      res.json({
        has_keystore: true,
        alias: project.keystore_alias,
        uploaded_at: project.keystore_uploaded_at,
        filename: path.basename(project.keystore_path)
      });
    } catch {
      // File doesn't exist, clear from database
      await db.execute(
        `UPDATE projects
         SET keystore_path = NULL,
             keystore_password = NULL,
             keystore_alias = NULL,
             keystore_key_password = NULL,
             keystore_uploaded_at = NULL
         WHERE id = ?`,
        [projectId]
      );

      res.json({
        has_keystore: false,
        error: '키스토어 파일이 서버에서 삭제되었습니다. 다시 업로드해주세요.'
      });
    }
  } catch (error) {
    console.error('Get keystore info error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  uploadKeystore,
  removeKeystore,
  getKeystoreInfo
};
