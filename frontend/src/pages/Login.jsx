import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Smartphone,
  ArrowRight,
  Zap,
  Settings,
  Bell,
  Download,
  Globe,
  Palette,
  Shield,
  Layout,
  Code,
  Sparkles
} from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: '초고속 빌드',
    description: 'URL만 입력하면 5분 안에 APK 생성. 복잡한 설정 없이 바로 시작하세요.',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    icon: Smartphone,
    title: '완벽한 모바일 최적화',
    description: '웹사이트가 네이티브 앱처럼 작동합니다. WebView 최적화로 빠른 로딩을 보장합니다.',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    icon: Bell,
    title: 'Firebase 푸시 알림',
    description: '사용자에게 실시간 알림을 전송하세요. Firebase 설정만으로 즉시 사용 가능합니다.',
    color: 'from-pink-400 to-rose-500'
  },
  {
    icon: Palette,
    title: '브랜드 커스터마이징',
    description: '앱 아이콘, 스플래시 화면, 테마 색상을 자유롭게 설정하여 브랜드를 표현하세요.',
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: Layout,
    title: '하단 탭바',
    description: '여러 페이지를 탭으로 구성하여 네이티브 앱 경험을 제공하세요.',
    color: 'from-green-400 to-teal-500'
  },
  {
    icon: Download,
    title: 'APK & AAB 지원',
    description: 'Google Play 스토어용 AAB와 직접 배포용 APK를 모두 생성할 수 있습니다.',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    icon: Globe,
    title: '다국어 지원',
    description: '한국어, 영어 등 여러 언어로 앱을 제공할 수 있습니다.',
    color: 'from-indigo-400 to-purple-500'
  },
  {
    icon: Shield,
    title: '안전한 빌드',
    description: '키스토어를 직접 관리하여 안전하게 서명된 APK를 생성하세요.',
    color: 'from-red-400 to-pink-500'
  },
  {
    icon: Code,
    title: '개발자 친화적',
    description: 'REST API로 모든 기능에 접근 가능. CI/CD 통합도 간편합니다.',
    color: 'from-gray-400 to-gray-600'
  },
  {
    icon: Sparkles,
    title: '완전 무료',
    description: '모든 기능을 무료로 사용하세요. 빌드 횟수 제한도 없습니다.',
    color: 'from-yellow-400 to-amber-500'
  }
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Auto-slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % features.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + features.length) % features.length)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">CodeLog</h1>
            <p className="text-gray-600 mt-2">웹사이트를 Android 앱으로</p>
          </div>

          {/* Form */}
          <div className="card p-8">
            <h2 className="text-2xl font-bold mb-6">로그인</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '로그인 중...' : '로그인'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                계정이 없으신가요?{' '}
                <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
                  회원가입
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Made by <span className="font-semibold">Logs0</span>
          </p>
        </div>
      </div>

      {/* Right side - Feature showcase with slider */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 p-12 items-center justify-center relative overflow-hidden">
        <div className="max-w-2xl w-full">
          {/* Main heading */}
          <h2 className="text-4xl font-bold text-white mb-4 text-center">
            웹사이트를 몇 번의 클릭으로<br />Android 앱으로 변환
          </h2>
          <p className="text-primary-100 text-lg mb-12 text-center">
            코드 없이 누구나 쉽게 앱을 만들 수 있습니다
          </p>

          {/* Slider container */}
          <div className="relative">
            {/* Slides */}
            <div className="overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm p-8">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={index}
                      className="w-full flex-shrink-0 flex flex-col items-center text-center"
                    >
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-primary-100 text-lg leading-relaxed max-w-md">
                        {feature.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all backdrop-blur-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all backdrop-blur-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all ${
                    index === currentSlide
                      ? 'w-8 h-3 bg-white'
                      : 'w-3 h-3 bg-white/40 hover:bg-white/60'
                  } rounded-full`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">10+</div>
              <div className="text-primary-100">주요 기능</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">5분</div>
              <div className="text-primary-100">빌드 시간</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-primary-100">무료</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
