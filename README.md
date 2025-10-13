# CodeLog

**웹사이트를 Android 앱으로 변환하는 플랫폼**

CodeLog는 웹사이트 URL 또는 템플릿을 기반으로 Android 앱(APK/AAB)을 자동으로 생성해주는 완전 무료 플랫폼입니다.

Made by **Logs0**

---

## 주요 기능

### 1. 프로젝트 생성
- **URL 기반**: 기존 웹사이트를 WebView 기반 앱으로 변환
- **템플릿 기반**: 로그인, 회원가입, 게시판, 마이페이지 등이 포함된 템플릿

### 2. 앱 커스터마이징
- 앱 이름, 패키지명, 설명 설정
- 푸시 알림 On/Off
- 하단 탭바 설정
- 앱 아이콘 설정
- 스플래시 화면 설정
- 테마 색상 변경
- Form(폼) 추가 (MySQL 서버 기반)

### 3. APK/AAB 빌드
- 사용자 설정에 따른 자동 빌드
- 앱 키 자동 생성
- 빌드 히스토리 관리
- 다운로드 기능

### 4. 푸시 알림 관리
- 웹 관리 대시보드에서 푸시 알림 발송
- Firebase Cloud Messaging(FCM) 연동

### 5. Google Play Store 지원
- 상품 ID, 상품 코드 추가 가능
- 인앱 결제 지원 (설정 가능)

---

## 기술 스택

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

### Backend
- Node.js
- Express
- MySQL
- JWT Authentication
- bcryptjs
- Multer (파일 업로드)

### Infrastructure
- Docker & Docker Compose
- Nginx
- AWS EC2 (권장)

---

## 로컬 개발 환경 설정

### 1. Prerequisites
- Node.js 18+
- MySQL 8.0+
- Git

### 2. 설치

```bash
# 저장소 클론
git clone <repository-url>
cd CodeLog

# 의존성 설치
npm run install:all

# 또는 개별 설치
cd backend && npm install
cd ../frontend && npm install
```

### 3. 데이터베이스 설정

```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 생성 및 스키마 적용
source database/schema.sql
```

### 4. 환경 변수 설정

Backend `.env` 파일 생성:
```bash
cd backend
cp .env.example .env
# .env 파일을 열어 설정값 수정
```

### 5. 개발 서버 실행

```bash
# 루트 디렉토리에서
npm run dev

# 또는 개별 실행
npm run dev:backend  # Backend: http://localhost:5000
npm run dev:frontend # Frontend: http://localhost:5173
```

---

## AWS EC2 배포 가이드

### 1. EC2 인스턴스 준비

#### 인스턴스 사양 (권장)
- **타입**: t3.medium 이상 (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **스토리지**: 30GB 이상
- **보안 그룹**:
  - 포트 80 (HTTP) 개방
  - 포트 443 (HTTPS) 개방 (SSL 사용시)
  - 포트 22 (SSH) 개방 (본인 IP만)

### 2. 서버 초기 설정

```bash
# EC2 인스턴스 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Docker 권한 설정
sudo usermod -aG docker $USER
newgrp docker

# Git 설치
sudo apt install -y git
```

### 3. 프로젝트 배포

```bash
# 프로젝트 클론
git clone <your-repository-url>
cd CodeLog

# 환경 변수 설정
cp .env.production .env
nano .env  # 설정값 수정

# 강력한 비밀번호 생성 예시
openssl rand -base64 32  # JWT_SECRET용
openssl rand -base64 16  # DB_PASSWORD용

# Docker Compose로 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f
```

### 4. 데이터베이스 초기화 (최초 1회)

```bash
# MySQL 컨테이너에 접속
docker exec -it codelog-mysql mysql -u codelog -p

# 비밀번호 입력 후 데이터베이스 확인
USE codelog;
SHOW TABLES;
```

### 5. 서비스 상태 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# 각 서비스 로그 확인
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql

# Health Check
curl http://localhost/api/health
```

### 6. 도메인 연결 (선택사항)

#### A. DNS 설정
1. 도메인 제공업체에서 A 레코드 추가
2. EC2 인스턴스의 Elastic IP 연결

#### B. SSL 인증서 설치 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정 확인
sudo certbot renew --dry-run
```

#### C. Nginx 설정 업데이트

nginx.conf 파일에 SSL 설정 추가 후:
```bash
docker-compose restart frontend
```

---

## 운영 관리

### 컨테이너 관리

```bash
# 전체 서비스 중지
docker-compose down

# 전체 서비스 시작
docker-compose up -d

# 특정 서비스 재시작
docker-compose restart backend

# 로그 확인 (실시간)
docker-compose logs -f backend
```

### 백업

```bash
# 데이터베이스 백업
docker exec codelog-mysql mysqldump -u codelog -p codelog > backup_$(date +%Y%m%d).sql

# 업로드 파일 백업
docker cp codelog-backend:/app/uploads ./uploads_backup

# 빌드 파일 백업
docker cp codelog-backend:/app/android-builds ./builds_backup
```

### 복원

```bash
# 데이터베이스 복원
docker exec -i codelog-mysql mysql -u codelog -p codelog < backup_20240101.sql
```

### 업데이트

```bash
# 최신 코드 받기
git pull origin main

# 재빌드 및 재시작
docker-compose up -d --build

# 불필요한 이미지 정리
docker system prune -a
```

---

## 성능 최적화

### 1. MySQL 최적화

```sql
-- 쿼리 성능 모니터링
SHOW PROCESSLIST;

-- 인덱스 확인
SHOW INDEX FROM projects;
```

### 2. 백엔드 최적화
- PM2 사용 (프로세스 매니저)
- Redis 캐싱 (선택사항)
- 로그 로테이션 설정

### 3. 프론트엔드 최적화
- Gzip 압축 (이미 설정됨)
- CDN 사용 (선택사항)
- 이미지 최적화

---

## 트러블슈팅

### 데이터베이스 연결 실패
```bash
# MySQL 컨테이너 로그 확인
docker-compose logs mysql

# 네트워크 확인
docker network ls
docker network inspect codelog_codelog-network
```

### 포트 충돌
```bash
# 사용 중인 포트 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5000

# docker-compose.yml에서 포트 변경
```

### 빌드 실패
```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 로그 상세 확인
docker-compose up --build
```

---

## 보안 권장사항

1. **환경 변수**: 절대 .env 파일을 Git에 커밋하지 마세요
2. **비밀번호**: 강력한 비밀번호 사용 (최소 32자)
3. **방화벽**: 필요한 포트만 개방
4. **SSL**: HTTPS 사용 권장
5. **업데이트**: 정기적으로 의존성 업데이트
6. **백업**: 정기적인 데이터베이스 백업

```bash
# 의존성 취약점 검사
cd backend && npm audit
cd frontend && npm audit

# 업데이트
npm audit fix
```

---

## 모니터링

### 로그 모니터링
```bash
# 실시간 로그
docker-compose logs -f --tail=100

# 특정 서비스 로그
docker-compose logs -f backend
```

### 리소스 모니터링
```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h
```

---

## 라이선스

MIT License

---

## 문의 및 지원

- **제작자**: Logs0
- **이메일**: support@logs0.com (예시)
- **GitHub Issues**: 문제가 있을 경우 Issues에 등록해주세요

---

## 기여

Pull Request는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 로드맵

- [x] URL 기반 앱 생성
- [x] 템플릿 기반 앱 생성
- [x] APK/AAB 빌드
- [x] 푸시 알림
- [ ] Android SDK 자동 설치
- [ ] iOS 앱 지원
- [ ] 다국어 지원
- [ ] 앱 스토어 자동 배포
- [ ] 분석 대시보드

---

**CodeLog** - 웹을 앱으로, 간단하게.
