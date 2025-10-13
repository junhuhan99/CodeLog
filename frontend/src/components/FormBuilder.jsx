import { useState, useEffect } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { Plus, Edit2, Trash2, FileText } from 'lucide-react'

export default function FormBuilder({ projectId }) {
  const [forms, setForms] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [formData, setFormData] = useState({
    form_name: '',
    form_description: '',
    form_schema: JSON.stringify([
      { name: 'name', type: 'text', label: '이름', required: true },
      { name: 'email', type: 'email', label: '이메일', required: true }
    ], null, 2)
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchForms()
  }, [projectId])

  const fetchForms = async () => {
    try {
      const response = await api.get(`/${projectId}/forms`)
      setForms(response.data.forms)
    } catch (err) {
      console.error('Failed to fetch forms:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate JSON
      JSON.parse(formData.form_schema)

      if (editingForm) {
        await api.put(`/forms/${editingForm.id}`, formData)
        setSuccess('폼이 수정되었습니다')
      } else {
        await api.post(`/${projectId}/forms`, formData)
        setSuccess('폼이 추가되었습니다')
      }

      fetchForms()
      closeModal()
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('올바른 JSON 형식이 아닙니다')
      } else {
        setError(err.response?.data?.error || '폼 저장에 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (formId) => {
    if (!confirm('이 폼을 삭제하시겠습니까?')) return

    try {
      await api.delete(`/forms/${formId}`)
      setSuccess('폼이 삭제되었습니다')
      fetchForms()
    } catch (err) {
      setError(err.response?.data?.error || '폼 삭제에 실패했습니다')
    }
  }

  const openModal = (form = null) => {
    if (form) {
      setEditingForm(form)
      setFormData({
        form_name: form.form_name,
        form_description: form.form_description,
        form_schema: JSON.stringify(JSON.parse(form.form_schema), null, 2)
      })
    } else {
      setEditingForm(null)
      setFormData({
        form_name: '',
        form_description: '',
        form_schema: JSON.stringify([
          { name: 'name', type: 'text', label: '이름', required: true },
          { name: 'email', type: 'email', label: '이메일', required: true }
        ], null, 2)
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingForm(null)
    setError('')
  }

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">폼 관리 (MySQL 서버 기반)</h3>
        <button onClick={() => openModal()} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          폼 추가
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          폼이 없습니다. 폼을 추가해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((form) => (
            <div key={form.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{form.form_name}</h4>
                    <p className="text-sm text-gray-500">{form.form_description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(form)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {JSON.parse(form.form_schema).length}개 필드
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingForm ? '폼 수정' : '폼 추가'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              폼 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.form_name}
              onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
              className="input"
              placeholder="회원가입 폼"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              폼 설명
            </label>
            <input
              type="text"
              value={formData.form_description}
              onChange={(e) => setFormData({ ...formData, form_description: e.target.value })}
              className="input"
              placeholder="사용자 정보를 수집하는 폼입니다"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              폼 스키마 (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.form_schema}
              onChange={(e) => setFormData({ ...formData, form_schema: e.target.value })}
              className="input font-mono text-sm"
              rows={12}
              placeholder='[{"name": "field_name", "type": "text", "label": "Label", "required": true}]'
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON 배열 형식으로 입력하세요. 각 필드는 name, type, label, required 속성을 가집니다.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? '저장 중...' : editingForm ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
