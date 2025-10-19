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
    title: '하단 탭바 네비게이션',
    description: '여러 페이지를 탭으로 구성하여 네이티브 앱 경험을 제공하세요. 각 탭마다 다른 URL 설정 가능.',
    color: 'from-green-400 to-teal-500'
  },
  {
    icon: Download,
    title: 'APK & AAB 지원',
    description: 'Google Play 스토어용 AAB와 직접 배포용 APK를 모두 생성할 수 있습니다.',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    icon: Settings,
    title: '템플릿 기반 빌드',
    description: '로그인, 회원가입, 게시판, 마이페이지 등 기본 템플릿으로 빠르게 앱을 만드세요.',
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
    icon: Globe,
    title: 'URL 및 템플릿 모드',
    description: '기존 웹사이트를 앱으로 변환하거나, 템플릿으로 새로운 앱을 만들 수 있습니다.',
    color: 'from-teal-400 to-cyan-500'
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
  const [isVisible, setIsVisible] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Fade in animation on mount
  useEffect(() => {
    setIsVisible(true)
  }, [])

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
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Left side - Form */}
      <div className={`flex-1 flex items-center justify-center p-8 relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 mb-4 shadow-xl transform hover:scale-110 transition-transform duration-300 animate-float">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-2 tracking-tight">CodeLog</h1>
            <p className="text-gray-600 text-lg font-medium">웹사이트를 Android 앱으로</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-sm text-gray-500">완전 무료 • 빠른 빌드 • 쉬운 사용</p>
            </div>
          </div>

          {/* Form */}
          <div className="card p-8 shadow-2xl border border-gray-100 backdrop-blur-sm bg-white/80 hover:shadow-3xl transition-shadow duration-300">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">로그인</h2>
            <p className="text-gray-500 mb-6">계정에 로그인하여 시작하세요</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2 animate-shake">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input transition-all duration-200 group-hover:border-primary-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input transition-all duration-200 group-hover:border-primary-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-lg py-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>로그인 중...</span>
                  </>
                ) : (
                  <>
                    <span>로그인</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                계정이 없으신가요?{' '}
                <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline transition-all">
                  회원가입
                </Link>
              </p>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="group cursor-default">
                  <div className="text-2xl font-bold text-primary-600 group-hover:scale-110 transition-transform inline-block">10+</div>
                  <div className="text-xs text-gray-500 mt-1">기능</div>
                </div>
                <div className="group cursor-default">
                  <div className="text-2xl font-bold text-accent-600 group-hover:scale-110 transition-transform inline-block">5분</div>
                  <div className="text-xs text-gray-500 mt-1">빌드</div>
                </div>
                <div className="group cursor-default">
                  <div className="text-2xl font-bold text-green-600 group-hover:scale-110 transition-transform inline-block">FREE</div>
                  <div className="text-xs text-gray-500 mt-1">무료</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Made with <span className="text-red-500 animate-pulse">❤</span> by <span className="font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Logs0</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Feature showcase with slider */}
      <div className={`hidden lg:flex flex-1 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 p-12 items-center justify-center relative overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl"></div>

        <div className="max-w-2xl w-full relative z-10">
          {/* Main heading */}
          <h2 className="text-5xl font-bold text-white mb-4 text-center leading-tight">
            웹사이트를 몇 번의 클릭으로<br />
            <span className="bg-white/20 px-4 py-1 rounded-lg inline-block mt-2">Android 앱으로 변환</span>
          </h2>
          <p className="text-primary-100 text-xl mb-12 text-center font-medium">
            코드 없이 누구나 쉽게 앱을 만들 수 있습니다
          </p>

          {/* Slider container */}
          <div className="relative">
            {/* Slides */}
            <div className="overflow-hidden rounded-3xl bg-white/10 backdrop-blur-md p-10 shadow-2xl border border-white/20">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={index}
                      className="w-full flex-shrink-0 flex flex-col items-center text-center"
                    >
                      <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-2xl transform hover:scale-110 hover:rotate-3 transition-all duration-300`}>
                        <Icon className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-primary-50 text-lg leading-relaxed max-w-lg font-medium">
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
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-14 h-14 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-all backdrop-blur-md shadow-xl hover:scale-110 border border-white/30"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-14 h-14 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-all backdrop-blur-md shadow-xl hover:scale-110 border border-white/30"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
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
            <div className="text-center group cursor-default">
              <div className="text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform inline-block">11</div>
              <div className="text-primary-50 font-semibold text-lg">주요 기능</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform inline-block">5분</div>
              <div className="text-primary-50 font-semibold text-lg">빌드 시간</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform inline-block">100%</div>
              <div className="text-primary-50 font-semibold text-lg">무료</div>
            </div>
          </div>

          {/* Additional feature badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30">Firebase 푸시</span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30">AAB/APK</span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30">템플릿</span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30">하단 탭바</span>
          </div>
        </div>
      </div>
    </div>
  )
}
