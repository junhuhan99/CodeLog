# CodeLog 빠른 시작 가이드

CodeLog를 5분 안에 시작하는 방법입니다.

## 📋 사전 준비

1. **Node.js 18+** 설치 확인
```bash
node --version
```

2. **MySQL 8.0+** 설치 및 실행 확인
```bash
mysql --version
```

## 🚀 로컬 개발 환경 (3가지 방법)

### 방법 1: 수동 설치 (권장 - 개발용)

#### 1단계: 데이터베이스 설정
```bash
# MySQL 접속
mysql -u root -p

# 스키마 적용
source database/schema.sql

# 또는
mysql -u root -p < database/schema.sql
```

#### 2단계: 백엔드 설정
```bash
cd backend

# 환경 변수 확인/수정
# .env 파일이 이미 생성되어 있습니다
# 필요시 database/schema.sql의 DB 정보와 일치하도록 수정

# 의존성 설치
npm install

# 서버 시작
npm run dev
```

백엔드 서버가 http://localhost:5000 에서 실행됩니다.

#### 3단계: 프론트엔드 설정 (새 터미널)
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

프론트엔드가 http://localhost:5173 에서 실행됩니다.

#### 4단계: 브라우저에서 접속
```
http://localhost:5173
```

### 방법 2: Docker Compose (권장 - 프로덕션 테스트용)

#### 1단계: Docker 설치 확인
```bash
docker --version
docker compose version
```

#### 2단계: 환경 변수 설정
```bash
# .env 파일 생성
cp .env.production .env

# .env 파일 편집 (선택사항)
# 기본값으로도 작동합니다
```

#### 3단계: 실행
```bash
# 빌드 및 시작
docker compose up -d --build

# 로그 확인
docker compose logs -f
```

#### 4단계: 접속
```
http://localhost
```

#### 중지
```bash
docker compose down
```

### 방법 3: 간편 스크립트 (Linux/Mac)

```bash
# 스크립트에 실행 권한 부여
chmod +x start.sh stop.sh

# 시작
./start.sh

# 중지
./stop.sh
```

## ✅ 작동 확인

### 1. API Health Check
```bash
curl http://localhost:5000/api/health
```

예상 응답:
```json
{"status":"ok","message":"CodeLog API is running"}
```

### 2. 웹 인터페이스
브라우저에서 접속 후:
1. 회원가입 (우측 상단)
2. 로그인
3. "새 프로젝트 만들기" 클릭
4. URL 또는 템플릿 선택
5. 정보 입력 후 생성

### 3. API 테스트 스크립트 (선택사항)
```bash
# 루트 디렉토리에서
npm install axios

# 테스트 실행
node test-api.js
```

## 🎨 첫 번째 프로젝트 만들기

### URL 기반 프로젝트
1. "URL 기반" 선택
2. 정보 입력:
   - 프로젝트 이름: `My First App`
   - 앱 이름: `My App`
   - 패키지 이름: `com.mycompany.myapp`
   - 웹사이트 URL: `https://your-website.com`
3. "프로젝트 생성" 클릭

### 템플릿 기반 프로젝트
1. "템플릿 기반" 선택
2. 정보 입력 (위와 동일, URL 제외)
3. "프로젝트 생성" 클릭
4. 자동으로 로그인, 게시판, 마이페이지 포함

## ⚙️ 프로젝트 설정

프로젝트를 생성한 후:

1. **기본 설정**
   - 푸시 알림 On/Off
   - 스플래시 화면 On/Off
   - 하단 탭바 On/Off
   - 테마 색상 변경

2. **이미지 업로드**
   - 앱 아이콘 (512x512px 권장)
   - 스플래시 이미지 (1080x1920px 권장)

3. **하단 탭바 관리**
   - 탭 추가/수정/삭제
   - 탭 순서 조정
   - 아이콘 선택

4. **폼 관리**
   - MySQL 기반 폼 생성
   - JSON 스키마로 정의
   - 제출 데이터 확인

## 📱 APK 빌드

1. 프로젝트 상세 페이지
2. "빌드" 탭 클릭
3. "APK 빌드" 또는 "AAB 빌드" 클릭
4. 빌드 완료 대기 (몇 분 소요)
5. 다운로드

**참고**: 실제 Android SDK가 설치되어 있어야 빌드가 완료됩니다. 현재는 빌드 프로세스만 시뮬레이션됩니다.

## 🔔 푸시 알림 보내기

1. 프로젝트 상세 페이지
2. "푸시 알림" 탭 클릭
3. 제목과 메시지 입력
4. "알림 전송" 클릭

**참고**: Firebase 설정이 필요합니다 (.env에서 설정).

## 🛠️ 문제 해결

### 포트 충돌
```bash
# 5000번 포트 사용 중일 때
lsof -ti:5000 | xargs kill -9

# 5173번 포트 사용 중일 때
lsof -ti:5173 | xargs kill -9
```

### 데이터베이스 연결 오류
1. MySQL이 실행 중인지 확인
2. backend/.env의 DB 정보 확인
3. 데이터베이스 존재 확인
```bash
mysql -u root -p -e "SHOW DATABASES;"
```

### Docker 문제
```bash
# 컨테이너 재시작
docker compose restart

# 로그 확인
docker compose logs backend
docker compose logs mysql

# 완전히 재시작
docker compose down -v
docker compose up -d --build
```

### npm 설치 오류
```bash
# 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

## 📚 다음 단계

- [전체 문서 읽기](README.md)
- [AWS EC2 배포 가이드](DEPLOYMENT.md)
- [API 문서 확인](http://localhost:5000/api)
- 기획서.pdf에서 모든 기능 확인

## 💡 팁

1. **개발 모드**는 핫 리로드가 지원됩니다
2. **로그 확인**으로 문제를 빠르게 파악하세요
3. **테스트 계정**을 여러 개 만들어 테스트하세요
4. **Docker**를 사용하면 환경 설정이 간단합니다

## 🎯 핵심 기능 체험

1. ✅ 회원가입/로그인
2. ✅ 프로젝트 생성 (URL 기반)
3. ✅ 프로젝트 생성 (템플릿 기반)
4. ✅ 앱 설정 (색상, 푸시, 탭바)
5. ✅ 아이콘/스플래시 업로드
6. ✅ 하단 탭바 추가
7. ✅ 폼 생성
8. ✅ APK 빌드 요청
9. ✅ 푸시 알림 전송

---

**즐거운 개발 되세요!** 🚀

문제가 있으면 GitHub Issues에 등록해주세요.
