import { useState, useEffect } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react'

export default function TabManager({ projectId }) {
  const [tabs, setTabs] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTab, setEditingTab] = useState(null)
  const [formData, setFormData] = useState({
    tab_name: '',
    tab_url: '',
    tab_order: 0,
    tab_icon: 'home'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTabs()
  }, [projectId])

  const fetchTabs = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/tabs`)
      setTabs(response.data.tabs)
    } catch (err) {
      console.error('Failed to fetch tabs:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (editingTab) {
        await api.put(`/projects/tabs/${editingTab.id}`, formData)
        setSuccess('탭이 수정되었습니다')
      } else {
        await api.post(`/projects/${projectId}/tabs`, formData)
        setSuccess('탭이 추가되었습니다')
      }

      fetchTabs()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.error || '탭 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (tabId) => {
    if (!confirm('이 탭을 삭제하시겠습니까?')) return

    try {
      await api.delete(`/projects/tabs/${tabId}`)
      setSuccess('탭이 삭제되었습니다')
      fetchTabs()
    } catch (err) {
      setError(err.response?.data?.error || '탭 삭제에 실패했습니다')
    }
  }

  const openModal = (tab = null) => {
    if (tab) {
      setEditingTab(tab)
      setFormData({
        tab_name: tab.tab_name,
        tab_url: tab.tab_url,
        tab_order: tab.tab_order,
        tab_icon: tab.tab_icon || 'home'
      })
    } else {
      setEditingTab(null)
      setFormData({
        tab_name: '',
        tab_url: '',
        tab_order: tabs.length,
        tab_icon: 'home'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTab(null)
    setFormData({ tab_name: '', tab_url: '', tab_order: 0, tab_icon: 'home' })
    setError('')
  }

  const icons = ['home', 'search', 'heart', 'user', 'settings', 'bell', 'mail', 'star']

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">하단 탭바 관리</h3>
        <button onClick={() => openModal()} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          탭 추가
        </button>
      </div>

      {tabs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          하단 탭이 없습니다. 탭을 추가해보세요.
        </div>
      ) : (
        <div className="space-y-2">
          {tabs.map((tab) => (
            <div key={tab.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                <div>
                  <div className="font-medium text-gray-900">{tab.tab_name}</div>
                  <div className="text-sm text-gray-500 truncate max-w-md">{tab.tab_url}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">순서: {tab.tab_order}</span>
                <button
                  onClick={() => openModal(tab)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(tab.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTab ? '탭 수정' : '탭 추가'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              탭 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tab_name}
              onChange={(e) => setFormData({ ...formData, tab_name: e.target.value })}
              className="input"
              placeholder="홈"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              탭 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.tab_url}
              onChange={(e) => setFormData({ ...formData, tab_url: e.target.value })}
              className="input"
              placeholder="https://example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              탭 순서
            </label>
            <input
              type="number"
              value={formData.tab_order}
              onChange={(e) => setFormData({ ...formData, tab_order: parseInt(e.target.value) })}
              className="input"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이콘
            </label>
            <div className="grid grid-cols-4 gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, tab_icon: icon })}
                  className={`p-3 border-2 rounded-lg text-center capitalize ${
                    formData.tab_icon === icon
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
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
              {loading ? '저장 중...' : editingTab ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
