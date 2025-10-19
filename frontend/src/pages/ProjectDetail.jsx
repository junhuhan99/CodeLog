import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import TabManager from '../components/TabManager'
import FormBuilder from '../components/FormBuilder'
import Loading from '../components/Loading'
import Alert from '../components/Alert'
import BuildLogViewer from '../components/BuildLogViewer'
import StatsCard from '../components/StatsCard'
import {
  ArrowLeft,
  Settings,
  Download,
  Bell,
  Trash2,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Send,
  Upload
} from 'lucide-react'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [settings, setSettings] = useState(null)
  const [builds, setBuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview, settings, builds, push
  const [pushData, setPushData] = useState({ title: '', message: '' })
  const [pushLoading, setPushLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [alert, setAlert] = useState({ show: false, type: '', message: '' })
  const [projectStats, setProjectStats] = useState(null)

  useEffect(() => {
    fetchProject()
    fetchBuilds()
    fetchProjectStats()
  }, [id])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`)
      setProject(response.data.project)
      setSettings(response.data.settings)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBuilds = async () => {
    try {
      const response = await api.get(`/projects/${id}/builds`)
      setBuilds(response.data.builds)
    } catch (error) {
      console.error('Failed to fetch builds:', error)
    }
  }

  const fetchProjectStats = async () => {
    try {
      const response = await api.get(`/stats/project/${id}`)
      setProjectStats(response.data.stats)
    } catch (error) {
      console.error('Failed to fetch project stats:', error)
    }
  }

  const handleBuild = async (buildType) => {
    if (!confirm(`${buildType.toUpperCase()} 빌드를 시작하시겠습니까?`)) return

    try {
      await api.post(`/projects/${id}/builds`, { build_type: buildType })
      alert('빌드가 시작되었습니다. 완료까지 몇 분 소요될 수 있습니다.')
      fetchBuilds()
    } catch (error) {
      alert(error.response?.data?.error || '빌드 시작에 실패했습니다')
    }
  }

  const handleSendPush = async (e) => {
    e.preventDefault()
    setPushLoading(true)

    try {
      await api.post(`/projects/${id}/push`, pushData)
      alert('푸시 알림이 전송되었습니다')
      setPushData({ title: '', message: '' })
    } catch (error) {
      alert(error.response?.data?.error || '푸시 전송에 실패했습니다')
    } finally {
      setPushLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      await api.delete(`/projects/${id}`)
      navigate('/dashboard')
    } catch (error) {
      alert(error.response?.data?.error || '프로젝트 삭제에 실패했습니다')
    }
  }

  const updateSettings = async (newSettings) => {
    try {
      await api.put(`/projects/${id}/settings`, newSettings)
      setSettings(newSettings)
      alert('설정이 저장되었습니다')
    } catch (error) {
      alert(error.response?.data?.error || '설정 저장에 실패했습니다')
    }
  }

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message })
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000)
  }

  const handleUploadIcon = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('icon', file)

    setUploadLoading(true)
    try {
      await api.post(`/upload/${id}/icon`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      showAlert('success', '앱 아이콘이 업로드되었습니다')
      fetchProject()
    } catch (error) {
      showAlert('error', error.response?.data?.error || '아이콘 업로드에 실패했습니다')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleUploadSplash = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('splash', file)

    setUploadLoading(true)
    try {
      await api.post(`/upload/${id}/splash`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      showAlert('success', '스플래시 이미지가 업로드되었습니다')
      fetchProject()
    } catch (error) {
      showAlert('error', error.response?.data?.error || '스플래시 이미지 업로드에 실패했습니다')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleUploadFirebaseConfig = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      showAlert('error', 'JSON 파일만 업로드할 수 있습니다')
      return
    }

    setUploadLoading(true)
    try {
      // Read the file as text
      const text = await file.text()
      const firebaseConfig = JSON.parse(text)

      // Send to backend
      await api.post(`/projects/${id}/firebase-config`, {
        firebase_config: firebaseConfig
      })

      showAlert('success', 'Firebase 설정이 업로드되었습니다')
      fetchProject()
    } catch (error) {
      if (error instanceof SyntaxError) {
        showAlert('error', '유효하지 않은 JSON 파일입니다')
      } else {
        showAlert('error', error.response?.data?.error || 'Firebase 설정 업로드에 실패했습니다')
      }
    } finally {
      setUploadLoading(false)
    }
  }

  const handleRemoveFirebaseConfig = async () => {
    if (!confirm('Firebase 설정을 제거하시겠습니까? 푸시 알림을 전송할 수 없게 됩니다.')) {
      return
    }

    try {
      await api.delete(`/projects/${id}/firebase-config`)
      showAlert('success', 'Firebase 설정이 제거되었습니다')
      fetchProject()
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Firebase 설정 제거에 실패했습니다')
    }
  }

  const handleDownloadBuild = async (buildId) => {
    try {
      // Get build info first
      const buildInfo = await api.get(`/projects/${id}/builds/${buildId}`)

      if (buildInfo.data.build.build_status !== 'success') {
        showAlert('error', '빌드가 완료되지 않았습니다')
        return
      }

      // Download file using fetch with auth
      const token = localStorage.getItem('token')
      const downloadUrl = `/api/projects/${id}/builds/${buildId}/download`

      showAlert('info', '다운로드를 준비하는 중...')

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.app_name.replace(/\s+/g, '_')}_${buildInfo.data.build.version_name}.${buildInfo.data.build.build_type}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()

      showAlert('success', '빌드 파일 다운로드가 시작되었습니다')
    } catch (error) {
      console.error('Download error:', error)
      showAlert('error', error.response?.data?.error || '다운로드에 실패했습니다')
    }
  }

  if (loading) {
    return <Loading fullscreen text="프로젝트 불러오는 중..." />
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            프로젝트를 찾을 수 없습니다
          </h2>
          <Link to="/dashboard" className="text-primary-600 hover:text-primary-700">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const getBuildStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'building':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {project.app_name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.project_type === 'url'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {project.project_type === 'url' ? 'URL' : '템플릿'}
                </span>
              </div>
              <p className="text-gray-600 mb-1">{project.project_name}</p>
              <p className="text-sm text-gray-500 font-mono">{project.package_name}</p>
            </div>

            <button
              onClick={handleDeleteProject}
              className="btn bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: '개요', icon: Package },
              { id: 'settings', label: '설정', icon: Settings },
              { id: 'builds', label: '빌드', icon: Download },
              { id: 'push', label: '푸시 알림', icon: Bell }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alert.show && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ show: false, type: '', message: '' })} />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Project Stats */}
            {projectStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  icon={Download}
                  title="빌드"
                  value={projectStats.builds.total}
                  color="blue"
                />
                <StatsCard
                  icon={Bell}
                  title="푸시 전송"
                  value={projectStats.pushNotifications.totalSent}
                  color="green"
                />
                <StatsCard
                  icon={Package}
                  title="폼"
                  value={projectStats.forms.count}
                  color="purple"
                />
                <StatsCard
                  icon={Settings}
                  title="탭"
                  value={projectStats.tabs.count}
                  color="primary"
                />
              </div>
            )}

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">프로젝트 정보</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">앱 이름</dt>
                  <dd className="text-base text-gray-900">{project.app_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">패키지 이름</dt>
                  <dd className="text-base text-gray-900 font-mono">{project.package_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">프로젝트 타입</dt>
                  <dd className="text-base text-gray-900">
                    {project.project_type === 'url' ? 'URL 기반' : '템플릿 기반'}
                  </dd>
                </div>
                {project.website_url && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">웹사이트 URL</dt>
                    <dd className="text-base text-primary-600 break-all">{project.website_url}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">생성일</dt>
                  <dd className="text-base text-gray-900">{formatDate(project.created_at)}</dd>
                </div>
              </dl>
            </div>

            {project.app_description && (
              <div className="card p-6">
                <h2 className="text-xl font-bold mb-4">설명</h2>
                <p className="text-gray-700">{project.app_description}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* 기본 설정 */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">기본 설정</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">푸시 알림</h3>
                    <p className="text-sm text-gray-500">앱에서 푸시 알림 받기</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.push_enabled}
                      onChange={(e) => updateSettings({ ...settings, push_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">스플래시 화면</h3>
                    <p className="text-sm text-gray-500">앱 시작시 스플래시 화면 표시</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.splash_enabled}
                      onChange={(e) => updateSettings({ ...settings, splash_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">하단 탭바</h3>
                    <p className="text-sm text-gray-500">하단에 네비게이션 탭바 표시</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.bottom_tab_enabled}
                      onChange={(e) => updateSettings({ ...settings, bottom_tab_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">테마 색상</h3>
                  <input
                    type="color"
                    value={settings.theme_color}
                    onChange={(e) => updateSettings({ ...settings, theme_color: e.target.value })}
                    className="w-20 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Firebase 설정 */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">Firebase 푸시 알림 설정</h2>

              <div className="space-y-4">
                {project.firebase_config_uploaded ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-green-900 mb-1">
                          ✓ Firebase 설정 완료
                        </p>
                        <p className="text-sm text-green-700">
                          프로젝트 ID: {project.firebase_project_id}
                        </p>
                        <p className="text-sm text-green-600 mt-2">
                          푸시 알림이 활성화되었습니다. 푸시 알림 탭에서 알림을 전송할 수 있습니다.
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveFirebaseConfig}
                        className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h3 className="font-medium text-blue-900 mb-2">
                        📘 Firebase 설정 가이드
                      </h3>
                      <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                        <li>Firebase Console (<a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline">console.firebase.google.com</a>) 접속</li>
                        <li>프로젝트 선택 또는 새 프로젝트 생성</li>
                        <li>좌측 메뉴 설정 ⚙️ {'>'} 프로젝트 설정 클릭</li>
                        <li>"서비스 계정" 탭 클릭</li>
                        <li>"새 비공개 키 생성" 버튼 클릭</li>
                        <li>다운로드된 JSON 파일을 아래에 업로드</li>
                      </ol>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="font-medium text-yellow-900 mb-2">
                        Firebase 설정이 필요합니다
                      </p>
                      <p className="text-sm text-yellow-700 mb-4">
                        실제 푸시 알림을 전송하려면 Firebase 서비스 계정 키를 업로드해주세요.
                      </p>
                      <div>
                        <label className="btn btn-outline cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadLoading ? '업로드 중...' : 'Firebase JSON 업로드'}
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleUploadFirebaseConfig}
                            className="hidden"
                            disabled={uploadLoading}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Firebase Console에서 다운로드한 서비스 계정 키 JSON 파일 (예: your-project-firebase-adminsdk-xxxxx.json)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">이미지</h2>

              <div className="space-y-6">
                <div>
                  <label className="block font-medium text-gray-900 mb-3">
                    앱 아이콘
                  </label>
                  <div className="flex items-center gap-4">
                    {settings.app_icon && (
                      <img
                        src={settings.app_icon}
                        alt="App Icon"
                        className="w-20 h-20 rounded-lg border border-gray-200"
                      />
                    )}
                    <label className="btn btn-outline cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadLoading ? '업로드 중...' : '아이콘 업로드'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadIcon}
                        className="hidden"
                        disabled={uploadLoading}
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    권장 크기: 512x512px (PNG, JPG)
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-900 mb-3">
                    스플래시 이미지
                  </label>
                  <div className="flex items-center gap-4">
                    {settings.splash_image && (
                      <img
                        src={settings.splash_image}
                        alt="Splash"
                        className="w-20 h-36 rounded-lg border border-gray-200 object-cover"
                      />
                    )}
                    <label className="btn btn-outline cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadLoading ? '업로드 중...' : '스플래시 업로드'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadSplash}
                        className="hidden"
                        disabled={uploadLoading}
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    권장 크기: 1080x1920px (PNG, JPG)
                  </p>
                </div>
              </div>
            </div>

            {/* 하단 탭바 관리 */}
            <div className="card p-6">
              <TabManager projectId={id} />
            </div>

            {/* 폼 관리 */}
            <div className="card p-6">
              <FormBuilder projectId={id} />
            </div>
          </div>
        )}

        {activeTab === 'builds' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">새 빌드 시작</h2>
              <p className="text-gray-600 mb-6">
                APK 또는 AAB 파일을 빌드합니다. 빌드는 몇 분 소요될 수 있습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleBuild('apk')}
                  className="btn btn-primary"
                >
                  APK 빌드
                </button>
                <button
                  onClick={() => handleBuild('aab')}
                  className="btn btn-outline"
                >
                  AAB 빌드
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">빌드 히스토리</h2>
              {builds.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  아직 빌드가 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {builds.map((build) => (
                    <div key={build.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getBuildStatusIcon(build.build_status)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {build.build_type.toUpperCase()} 빌드 #{build.id}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(build.created_at)}
                          </p>
                          {build.version_name && (
                            <p className="text-xs text-gray-400">
                              v{build.version_name} ({build.version_code})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {build.build_log && <BuildLogViewer buildLog={build.build_log} />}
                        {build.build_status === 'success' && (
                          <button
                            onClick={() => handleDownloadBuild(build.id)}
                            className="btn btn-primary btn-sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            다운로드
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'push' && (
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">푸시 알림 보내기</h2>
            <p className="text-gray-600 mb-6">
              앱을 사용하는 모든 사용자에게 푸시 알림을 전송합니다.
            </p>

            <form onSubmit={handleSendPush} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={pushData.title}
                  onChange={(e) => setPushData({ ...pushData, title: e.target.value })}
                  className="input"
                  placeholder="알림 제목"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메시지
                </label>
                <textarea
                  value={pushData.message}
                  onChange={(e) => setPushData({ ...pushData, message: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="알림 내용"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={pushLoading}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {pushLoading ? '전송 중...' : '알림 전송'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
