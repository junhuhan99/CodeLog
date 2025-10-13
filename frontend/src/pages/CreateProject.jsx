import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Globe, Layout, Sparkles } from 'lucide-react'

export default function CreateProject() {
  const navigate = useNavigate()
  const [projectType, setProjectType] = useState('url') // 'url' or 'template'
  const [formData, setFormData] = useState({
    project_name: '',
    app_name: '',
    package_name: '',
    app_description: '',
    website_url: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/projects', {
        ...formData,
        project_type: projectType
      })

      navigate(`/project/${response.data.project_id}`)
    } catch (err) {
      setError(err.response?.data?.error || '프로젝트 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            새 프로젝트 만들기
          </h1>
          <p className="text-gray-600">
            웹사이트를 Android 앱으로 변환하거나 템플릿으로 시작하세요
          </p>
        </div>

        {/* Project Type Selection */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setProjectType('url')}
            className={`card p-6 text-left transition-all ${
              projectType === 'url'
                ? 'ring-2 ring-primary-500 shadow-md'
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                projectType === 'url'
                  ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                  : 'bg-gray-100'
              }`}>
                <Globe className={`w-6 h-6 ${projectType === 'url' ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">URL 기반</h3>
                <p className="text-sm text-gray-600">
                  기존 웹사이트를 WebView 앱으로 변환
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setProjectType('template')}
            className={`card p-6 text-left transition-all ${
              projectType === 'template'
                ? 'ring-2 ring-primary-500 shadow-md'
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                projectType === 'template'
                  ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                  : 'bg-gray-100'
              }`}>
                <Layout className={`w-6 h-6 ${projectType === 'template' ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">템플릿 기반</h3>
                <p className="text-sm text-gray-600">
                  로그인, 게시판 등이 포함된 템플릿
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Form */}
        <div className="card p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                className="input"
                placeholder="나의 첫 앱 프로젝트"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                프로젝트를 식별할 수 있는 이름
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                앱 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="app_name"
                value={formData.app_name}
                onChange={handleChange}
                className="input"
                placeholder="My App"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                앱 런처에 표시될 이름
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                앱 패키지 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="package_name"
                value={formData.package_name}
                onChange={handleChange}
                className="input font-mono text-sm"
                placeholder="com.example.myapp"
                required
                pattern="^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$"
              />
              <p className="text-sm text-gray-500 mt-1">
                예: com.yourcompany.appname (소문자, 숫자, 점만 사용)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                앱 설명
              </label>
              <textarea
                name="app_description"
                value={formData.app_description}
                onChange={handleChange}
                className="input"
                rows={4}
                placeholder="이 앱에 대한 간단한 설명을 입력하세요"
              />
            </div>

            {projectType === 'url' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  웹사이트 URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="input"
                  placeholder="https://example.com"
                  required={projectType === 'url'}
                />
                <p className="text-sm text-gray-500 mt-1">
                  앱에서 로드할 웹사이트 주소
                </p>
              </div>
            )}

            {projectType === 'template' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900 mb-1">
                      템플릿 앱 포함 기능
                    </h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• 로그인 및 회원가입 페이지</li>
                      <li>• 게시판 시스템</li>
                      <li>• 마이페이지</li>
                      <li>• 스플래시 화면</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Link
                to="/dashboard"
                className="btn btn-secondary flex-1"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '생성 중...' : '프로젝트 생성'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
