# Changelog

CodeLog의 모든 주요 변경 사항은 이 파일에 기록됩니다.

## [1.0.0] - 2024-01-15

### 추가됨 (Added)
- 🎉 **초기 릴리스**
- ✨ 사용자 인증 시스템 (로그인/회원가입)
- 🚀 URL 기반 프로젝트 생성
- 📱 템플릿 기반 프로젝트 생성
- ⚙️ 프로젝트 설정 관리
  - 푸시 알림 On/Off
  - 스플래시 화면 On/Off
  - 하단 탭바 On/Off
  - 테마 색상 변경
- 📸 이미지 업로드 (앱 아이콘, 스플래시)
- 🔧 하단 탭바 관리 시스템
- 📝 폼 빌더 (MySQL 서버 기반)
- 🏗️ Android APK/AAB 빌드 시스템
- 🔔 푸시 알림 시스템 (Firebase FCM)
- 📊 빌드 히스토리 관리
- 🎨 깔끔한 UI/UX (노랑/주황 테마)
- 🐳 Docker & Docker Compose 설정
- 📖 상세한 문서
  - README.md
  - DEPLOYMENT.md (AWS EC2 배포 가이드)
  - QUICK_START.md

### 기술 스택
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0
- **Infrastructure**: Docker, Nginx
- **Authentication**: JWT
- **File Upload**: Multer + Sharp
- **Icons**: Lucide React

### 보안
- ✅ 비밀번호 해싱 (bcrypt)
- ✅ JWT 토큰 인증
- ✅ CORS 설정
- ✅ Rate Limiting
- ✅ Helmet.js 보안 헤더
- ✅ Input Validation

### 데이터베이스 스키마
- 11개 테이블 구조
- 완전한 관계형 설계
- 인덱스 최적화

### API 엔드포인트
- `/api/auth` - 인증 (로그인, 회원가입)
- `/api/projects` - 프로젝트 관리
- `/api/upload` - 파일 업로드
- `/api/projects/:id/tabs` - 탭바 관리
- `/api/forms` - 폼 관리
- `/api/projects/:id/builds` - 빌드 관리
- `/api/projects/:id/push` - 푸시 알림

### 컴포넌트
- `Loading` - 로딩 상태 표시
- `Alert` - 알림 메시지
- `Modal` - 모달 다이얼로그
- `TabManager` - 탭바 관리
- `FormBuilder` - 폼 빌더

### 배포
- ✅ Docker Compose 지원
- ✅ AWS EC2 배포 가능
- ✅ Nginx 리버스 프록시
- ✅ SSL/HTTPS 지원 (Let's Encrypt)
- ✅ 자동 재시작 정책
- ✅ Health Check

### 문서
- 📖 README.md - 전체 가이드
- 📖 DEPLOYMENT.md - AWS EC2 배포 상세 가이드
- 📖 QUICK_START.md - 5분 빠른 시작
- 📖 CHANGELOG.md - 변경 이력

### 테스트
- 🧪 API 테스트 스크립트 (test-api.js)
- ✅ 모든 주요 엔드포인트 테스트

### 스크립트
- `start.sh` - 빠른 시작 스크립트
- `stop.sh` - 중지 스크립트
- `test-api.js` - API 테스트

---

## 향후 계획 (Roadmap)

### v1.1.0 (계획 중)
- [ ] Android SDK 자동 설치
- [ ] 실제 APK 빌드 완성
- [ ] 다국어 지원 (한국어, 영어)
- [ ] 대시보드 분석 (프로젝트 통계)
- [ ] 이메일 인증
- [ ] 비밀번호 재설정

### v1.2.0 (계획 중)
- [ ] iOS 앱 지원
- [ ] 앱 스토어 자동 배포
- [ ] 고급 폼 빌더 (드래그 앤 드롭)
- [ ] 실시간 빌드 로그
- [ ] 웹훅 지원

### v2.0.0 (장기 계획)
- [ ] 팀 협업 기능
- [ ] 결제 시스템 (유료 플랜)
- [ ] API 키 관리
- [ ] 커스텀 도메인 지원
- [ ] 고급 분석 대시보드

---

## 기여자 (Contributors)

- **Logs0** - 초기 개발 및 전체 시스템 설계

---

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

**Made with ❤️ by Logs0**
