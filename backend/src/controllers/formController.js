const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Validation rules
const formValidation = [
  body('form_name').notEmpty().withMessage('폼 이름을 입력해주세요'),
  body('form_schema').isJSON().withMessage('올바른 JSON 형식이어야 합니다')
];

// Get all forms for project
const getForms = async (req, res) => {
  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    const [forms] = await db.execute(
      'SELECT * FROM forms WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );

    res.json({ forms });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get single form
const getForm = async (req, res) => {
  try {
    // Verify project ownership
    const [forms] = await db.execute(
      'SELECT f.* FROM forms f INNER JOIN projects p ON f.project_id = p.id WHERE f.id = ? AND p.user_id = ?',
      [req.params.formId, req.user.id]
    );

    if (forms.length === 0) {
      return res.status(404).json({ error: '폼을 찾을 수 없습니다' });
    }

    res.json({ form: forms[0] });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Create form
const createForm = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { form_name, form_description, form_schema } = req.body;

  try {
    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Validate JSON schema
    let schemaObj;
    try {
      schemaObj = typeof form_schema === 'string' ? JSON.parse(form_schema) : form_schema;
    } catch (e) {
      return res.status(400).json({ error: '올바른 JSON 형식이 아닙니다' });
    }

    const [result] = await db.execute(
      'INSERT INTO forms (project_id, form_name, form_description, form_schema) VALUES (?, ?, ?, ?)',
      [req.params.projectId, form_name, form_description, JSON.stringify(schemaObj)]
    );

    res.status(201).json({
      message: '폼이 생성되었습니다',
      form_id: result.insertId
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Update form
const updateForm = async (req, res) => {
  const { form_name, form_description, form_schema } = req.body;

  try {
    // Verify project ownership
    const [forms] = await db.execute(
      'SELECT f.* FROM forms f INNER JOIN projects p ON f.project_id = p.id WHERE f.id = ? AND p.user_id = ?',
      [req.params.formId, req.user.id]
    );

    if (forms.length === 0) {
      return res.status(404).json({ error: '폼을 찾을 수 없습니다' });
    }

    // Validate JSON schema if provided
    let schemaObj = null;
    if (form_schema) {
      try {
        schemaObj = typeof form_schema === 'string' ? JSON.parse(form_schema) : form_schema;
      } catch (e) {
        return res.status(400).json({ error: '올바른 JSON 형식이 아닙니다' });
      }
    }

    await db.execute(
      'UPDATE forms SET form_name = ?, form_description = ?, form_schema = ? WHERE id = ?',
      [form_name, form_description, schemaObj ? JSON.stringify(schemaObj) : forms[0].form_schema, req.params.formId]
    );

    res.json({ message: '폼이 업데이트되었습니다' });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Delete form
const deleteForm = async (req, res) => {
  try {
    // Verify project ownership
    const [forms] = await db.execute(
      'SELECT f.* FROM forms f INNER JOIN projects p ON f.project_id = p.id WHERE f.id = ? AND p.user_id = ?',
      [req.params.formId, req.user.id]
    );

    if (forms.length === 0) {
      return res.status(404).json({ error: '폼을 찾을 수 없습니다' });
    }

    await db.execute('DELETE FROM forms WHERE id = ?', [req.params.formId]);

    res.json({ message: '폼이 삭제되었습니다' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get form submissions
const getFormSubmissions = async (req, res) => {
  try {
    // Verify project ownership
    const [forms] = await db.execute(
      'SELECT f.* FROM forms f INNER JOIN projects p ON f.project_id = p.id WHERE f.id = ? AND p.user_id = ?',
      [req.params.formId, req.user.id]
    );

    if (forms.length === 0) {
      return res.status(404).json({ error: '폼을 찾을 수 없습니다' });
    }

    const [submissions] = await db.execute(
      'SELECT * FROM form_submissions WHERE form_id = ? ORDER BY submitted_at DESC',
      [req.params.formId]
    );

    res.json({ submissions });
  } catch (error) {
    console.error('Get form submissions error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Submit form (Public endpoint for app users)
const submitForm = async (req, res) => {
  const { form_id, submission_data } = req.body;

  try {
    // Check if form exists
    const [forms] = await db.execute('SELECT * FROM forms WHERE id = ?', [form_id]);

    if (forms.length === 0) {
      return res.status(404).json({ error: '폼을 찾을 수 없습니다' });
    }

    await db.execute(
      'INSERT INTO form_submissions (form_id, submission_data) VALUES (?, ?)',
      [form_id, JSON.stringify(submission_data)]
    );

    res.status(201).json({ message: '폼이 제출되었습니다' });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  getFormSubmissions,
  submitForm,
  formValidation
};
