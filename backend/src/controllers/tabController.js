const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Validation rules
const tabValidation = [
  body('tab_name').notEmpty().withMessage('탭 이름을 입력해주세요'),
  body('tab_url').isURL().withMessage('올바른 URL을 입력해주세요'),
  body('tab_order').isInt({ min: 0 }).withMessage('탭 순서는 0 이상이어야 합니다')
];

// Get all tabs for project
const getTabs = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const [tabs] = await db.execute(
      'SELECT * FROM bottom_tabs WHERE project_id = ? ORDER BY tab_order',
      [req.params.projectId]
    );

    res.json({ tabs });
  } catch (error) {
    console.error('Get tabs error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Create tab
const createTab = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { tab_name, tab_url, tab_order, tab_icon } = req.body;

  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const [result] = await db.execute(
      'INSERT INTO bottom_tabs (project_id, tab_name, tab_url, tab_order, tab_icon) VALUES (?, ?, ?, ?, ?)',
      [req.params.projectId, tab_name, tab_url, tab_order, tab_icon]
    );

    res.status(201).json({
      message: '탭이 생성되었습니다',
      tab_id: result.insertId
    });
  } catch (error) {
    console.error('Create tab error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Update tab
const updateTab = async (req, res) => {
  const { tab_name, tab_url, tab_order, tab_icon } = req.body;

  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT p.* FROM projects p INNER JOIN bottom_tabs bt ON p.id = bt.project_id WHERE bt.id = ? AND p.user_id = ?',
      [req.params.tabId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '탭을 찾을 수 없습니다' });
    }

    await db.execute(
      'UPDATE bottom_tabs SET tab_name = ?, tab_url = ?, tab_order = ?, tab_icon = ? WHERE id = ?',
      [tab_name, tab_url, tab_order, tab_icon, req.params.tabId]
    );

    res.json({ message: '탭이 업데이트되었습니다' });
  } catch (error) {
    console.error('Update tab error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Delete tab
const deleteTab = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT p.* FROM projects p INNER JOIN bottom_tabs bt ON p.id = bt.project_id WHERE bt.id = ? AND p.user_id = ?',
      [req.params.tabId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '탭을 찾을 수 없습니다' });
    }

    await db.execute('DELETE FROM bottom_tabs WHERE id = ?', [req.params.tabId]);

    res.json({ message: '탭이 삭제되었습니다' });
  } catch (error) {
    console.error('Delete tab error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  getTabs,
  createTab,
  updateTab,
  deleteTab,
  tabValidation
};
