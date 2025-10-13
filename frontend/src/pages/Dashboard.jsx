import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import StatsCard from '../components/StatsCard'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'
import { Plus, Smartphone, LogOut, Package, Clock, CheckCircle, Zap, Activity } from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({ total: 0, urlBased: 0, templateBased: 0, recentActivity: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      const projectsData = response.data.projects
      setProjects(projectsData)

      // Calculate stats
      const urlBased = projectsData.filter(p => p.project_type === 'url').length
      const templateBased = projectsData.filter(p => p.project_type === 'template').length
      const recentActivity = projectsData.filter(p => {
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000)
        return new Date(p.updated_at) > dayAgo
      }).length

      setStats({
        total: projectsData.length,
        urlBased,
        templateBased,
        recentActivity
      })
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">CodeLog</h1>
                <p className="text-xs text-gray-500">by Logs0</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            안녕하세요, {user?.username}님 👋
          </h2>
          <p className="text-gray-600">
            웹사이트를 Android 앱으로 변환해보세요. 모든 기능이 무료입니다.
          </p>
        </div>

        {/* Stats Cards */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon={Package}
              title="총 프로젝트"
              value={stats.total}
              color="primary"
            />
            <StatsCard
              icon={Smartphone}
              title="URL 기반"
              value={stats.urlBased}
              color="blue"
            />
            <StatsCard
              icon={Zap}
              title="템플릿 기반"
              value={stats.templateBased}
              color="purple"
            />
            <StatsCard
              icon={Activity}
              title="최근 활동"
              value={stats.recentActivity}
              color="green"
            />
          </div>
        )}

        {/* Create Project Button */}
        <Link
          to="/create-project"
          className="block mb-8 card p-6 hover:shadow-lg border-2 border-dashed border-primary-300 bg-primary-50/50"
        >
          <div className="flex items-center justify-center gap-3 text-primary-600">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold">새 프로젝트 만들기</h3>
              <p className="text-sm text-primary-600/80">
                URL 또는 템플릿으로 시작하세요
              </p>
            </div>
          </div>
        </Link>

        {/* Projects Grid */}
        {loading ? (
          <Loading text="프로젝트 불러오는 중..." />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={Package}
            title="프로젝트가 없습니다"
            description="첫 번째 프로젝트를 만들어 시작하세요. URL 기반 또는 템플릿 기반 프로젝트를 선택할 수 있습니다."
            action={() => window.location.href = '/create-project'}
            actionLabel="프로젝트 만들기"
          />
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              내 프로젝트 ({projects.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  className="card p-6 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.project_type === 'url'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {project.project_type === 'url' ? 'URL' : '템플릿'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {project.app_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {project.project_name}
                  </p>
                  <p className="text-xs text-gray-500 mb-4 font-mono">
                    {project.package_name}
                  </p>

                  {project.website_url && (
                    <p className="text-xs text-primary-600 mb-4 truncate">
                      🔗 {project.website_url}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(project.created_at)}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
