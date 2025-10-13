# CodeLog AWS EC2 배포 상세 가이드

이 문서는 CodeLog를 AWS EC2에 배포하는 상세한 단계별 가이드입니다.

---

## 목차
1. [EC2 인스턴스 생성](#1-ec2-인스턴스-생성)
2. [서버 환경 설정](#2-서버-환경-설정)
3. [프로젝트 배포](#3-프로젝트-배포)
4. [도메인 및 SSL 설정](#4-도메인-및-ssl-설정)
5. [자동 시작 설정](#5-자동-시작-설정)
6. [모니터링 및 유지보수](#6-모니터링-및-유지보수)

---

## 1. EC2 인스턴스 생성

### 1.1 AWS Console 접속
1. AWS Management Console 로그인
2. EC2 서비스로 이동
3. "인스턴스 시작" 클릭

### 1.2 인스턴스 설정

#### AMI 선택
- **운영체제**: Ubuntu Server 22.04 LTS (HVM)
- **아키텍처**: 64-bit (x86)

#### 인스턴스 타입 선택
**개발/테스트용**:
- t3.small (2 vCPU, 2GB RAM)

**프로덕션용 (권장)**:
- t3.medium (2 vCPU, 4GB RAM)
- t3.large (2 vCPU, 8GB RAM) - 트래픽이 많을 경우

#### 키 페어 생성
1. "새 키 페어 생성" 클릭
2. 이름: `codelog-key`
3. 키 페어 유형: RSA
4. 프라이빗 키 파일 형식: .pem
5. 다운로드 후 안전한 곳에 보관

#### 네트워크 설정
- VPC: 기본 VPC
- 서브넷: 원하는 가용 영역
- 퍼블릭 IP 자동 할당: 활성화

#### 보안 그룹 설정
새 보안 그룹 생성:
```
규칙 1: SSH
  - 포트: 22
  - 소스: 내 IP

규칙 2: HTTP
  - 포트: 80
  - 소스: 0.0.0.0/0

규칙 3: HTTPS
  - 포트: 443
  - 소스: 0.0.0.0/0
```

#### 스토리지 구성
- 크기: 30GB (최소), 50GB 권장
- 볼륨 유형: gp3 (범용 SSD)

### 1.3 Elastic IP 할당 (선택사항, 권장)
1. EC2 > 네트워크 및 보안 > 탄력적 IP
2. "탄력적 IP 주소 할당" 클릭
3. 할당된 IP를 인스턴스에 연결

---

## 2. 서버 환경 설정

### 2.1 SSH 접속

```bash
# Windows (PowerShell)
cd C:\path\to\your\key
ssh -i codelog-key.pem ubuntu@YOUR_EC2_IP

# Mac/Linux
chmod 400 codelog-key.pem
ssh -i codelog-key.pem ubuntu@YOUR_EC2_IP
```

### 2.2 시스템 업데이트

```bash
# 패키지 목록 업데이트
sudo apt update

# 설치된 패키지 업그레이드
sudo apt upgrade -y

# 재부팅 (필요시)
sudo reboot
```

### 2.3 Docker 설치

```bash
# 필수 패키지 설치
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    gnupg \
    lsb-release

# Docker GPG 키 추가
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker 서비스 시작 및 자동 시작 설정
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 그룹 변경 사항 적용
newgrp docker

# Docker 설치 확인
docker --version
docker compose version
```

### 2.4 방화벽 설정 (선택사항)

```bash
# UFW 방화벽 설정
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 방화벽 상태 확인
sudo ufw status
```

### 2.5 Git 설치

```bash
sudo apt install -y git
git --version
```

---

## 3. 프로젝트 배포

### 3.1 프로젝트 가져오기

```bash
# 홈 디렉토리로 이동
cd ~

# Git 저장소 클론 (여러 방법 중 선택)

# 방법 1: GitHub에서 클론
git clone https://github.com/your-username/CodeLog.git
cd CodeLog

# 방법 2: 로컬에서 파일 업로드
# 로컬 터미널에서 실행:
# scp -i codelog-key.pem -r /path/to/CodeLog ubuntu@YOUR_EC2_IP:~

# 방법 3: 직접 생성 (현재 디렉토리 사용)
# 이미 CodeLog 폴더가 있다면 그대로 사용
```

### 3.2 환경 변수 설정

```bash
# .env 파일 생성
cp .env.production .env

# 환경 변수 편집
nano .env
```

**.env 파일 설정 예시**:
```env
# Database
DB_ROOT_PASSWORD=SuperSecureRootPass123!@#
DB_NAME=codelog
DB_USER=codelog
DB_PASSWORD=SecureCodelogPass456$%^

# JWT (최소 32자)
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_minimum_32_characters

# Frontend URL (도메인 또는 EC2 IP)
FRONTEND_URL=http://your-domain.com
# 또는
FRONTEND_URL=http://YOUR_EC2_IP

# 참고: Firebase 푸시 알림 설정은 더 이상 환경 변수로 설정하지 않습니다.
# 사용자가 웹 인터페이스에서 프로젝트별로 Firebase JSON 파일을 업로드합니다.
```

**강력한 비밀번호 생성**:
```bash
# 랜덤 비밀번호 생성
openssl rand -base64 32
```

### 3.3 Docker Compose로 배포

```bash
# Docker 이미지 빌드 및 컨테이너 시작
docker compose up -d --build

# 빌드 및 시작 로그 확인
docker compose logs -f
```

### 3.4 배포 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# 출력 예시:
# NAME                IMAGE           STATUS
# codelog-mysql       mysql:8.0       Up (healthy)
# codelog-backend     ...             Up (healthy)
# codelog-frontend    ...             Up

# 서비스 Health Check
curl http://localhost/api/health

# 예상 응답:
# {"status":"ok","message":"CodeLog API is running"}

# 브라우저에서 접속
# http://YOUR_EC2_IP
```

### 3.5 데이터베이스 확인

```bash
# MySQL 컨테이너 접속
docker exec -it codelog-mysql mysql -u codelog -p

# 데이터베이스 선택
USE codelog;

# 테이블 확인
SHOW TABLES;

# 종료
exit;
```

### 3.6 선택적 기능 설정

CodeLog의 일부 고급 기능은 추가 소프트웨어 설치가 필요합니다.

#### A. Android 빌드 기능 (선택사항)

실제 APK/AAB 파일을 빌드하려면 Gradle을 설치해야 합니다.

```bash
# Gradle 설치
cd ~
wget https://services.gradle.org/distributions/gradle-8.0-bin.zip
sudo unzip -d /opt/gradle gradle-8.0-bin.zip
sudo ln -s /opt/gradle/gradle-8.0/bin/gradle /usr/local/bin/gradle

# 설치 확인
gradle --version
```

**Gradle 미설치 시**:
- 빌드 요청 시 데모 파일이 생성됩니다
- 빌드 로그에 Gradle 설치 안내가 표시됩니다

#### B. Firebase 푸시 알림 (선택사항)

Firebase 푸시 알림은 프로젝트별로 설정됩니다:

1. **Firebase 콘솔 설정**:
   - https://console.firebase.google.com 접속
   - 새 프로젝트 생성
   - 프로젝트 설정 > 서비스 계정
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드

2. **CodeLog에서 설정**:
   - 프로젝트 상세 페이지 > 설정 탭
   - "Firebase 푸시 알림 설정" 섹션
   - 다운로드한 JSON 파일 업로드

**Firebase 미설정 시**:
- 푸시 알림 전송 시 데모 모드로 작동
- 실제 알림은 전송되지 않음

---

## 4. 도메인 및 SSL 설정

### 4.1 도메인 연결

#### A. DNS 설정
1. 도메인 제공업체 (가비아, Cloudflare 등) 로그인
2. DNS 관리 페이지 이동
3. A 레코드 추가:
   - 호스트: @ (또는 www)
   - 값: EC2 Elastic IP
   - TTL: 3600

#### B. 도메인 전파 확인 (10-30분 소요)
```bash
nslookup your-domain.com
# 또는
dig your-domain.com
```

### 4.2 SSL 인증서 설치 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# Nginx 설정 파일 수정 (도메인 추가)
nano nginx.conf
```

**nginx.conf 수정**:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # ... 나머지 설정 ...
}
```

```bash
# Docker 컨테이너에 Nginx 설정 적용
docker compose restart frontend

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 이메일 입력 및 약관 동의

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 4.3 HTTPS 리다이렉션 설정

Certbot이 자동으로 설정하지만, 수동 설정이 필요한 경우:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... 나머지 설정 ...
}
```

---

## 5. 자동 시작 설정

### 5.1 Docker Compose 자동 시작

Docker 서비스가 자동으로 시작되도록 설정되어 있으며, `restart: unless-stopped` 정책으로 컨테이너가 자동 재시작됩니다.

### 5.2 시스템 재부팅 후 확인

```bash
# 재부팅
sudo reboot

# 재접속 후
ssh -i codelog-key.pem ubuntu@YOUR_EC2_IP

# 컨테이너 상태 확인
docker compose ps
```

---

## 6. 모니터링 및 유지보수

### 6.1 로그 확인

```bash
# 모든 서비스 로그
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f backend
docker compose logs -f mysql

# 최근 100줄만
docker compose logs --tail=100 backend
```

### 6.2 리소스 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h

# CPU 사용량
top
```

### 6.3 정기 백업

#### 데이터베이스 백업 스크립트

```bash
# 백업 스크립트 생성
nano ~/backup.sh
```

**backup.sh**:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"

mkdir -p $BACKUP_DIR

# 데이터베이스 백업
docker exec codelog-mysql mysqldump -u codelog -p$DB_PASSWORD codelog > $BACKUP_DIR/db_backup_$DATE.sql

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# 실행 권한 부여
chmod +x ~/backup.sh

# 크론탭 설정 (매일 새벽 2시)
crontab -e

# 다음 라인 추가:
0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backup.log 2>&1
```

### 6.4 업데이트

```bash
# 코드 업데이트
cd ~/CodeLog
git pull origin main

# 재빌드 및 재시작
docker compose down
docker compose up -d --build

# 오래된 이미지 정리
docker image prune -a -f
```

### 6.5 문제 해결

#### 컨테이너가 시작되지 않을 때
```bash
# 로그 확인
docker compose logs

# 특정 컨테이너 재시작
docker compose restart backend

# 완전히 재시작
docker compose down
docker compose up -d
```

#### 디스크 공간 부족
```bash
# Docker 리소스 정리
docker system prune -a --volumes

# 로그 파일 정리
sudo journalctl --vacuum-time=7d
```

#### 성능 저하
```bash
# 리소스 확인
docker stats
htop

# 로그 분석
docker compose logs backend | grep ERROR
```

---

## 7. 보안 체크리스트

- [ ] SSH 키 페어 안전하게 보관
- [ ] .env 파일 Git에 커밋하지 않기
- [ ] 강력한 데이터베이스 비밀번호 사용
- [ ] 방화벽 설정 확인
- [ ] SSL 인증서 설치
- [ ] 정기 백업 설정
- [ ] 의존성 업데이트 (월 1회)
- [ ] 로그 모니터링
- [ ] 보안 그룹 최소 권한 원칙

---

## 8. 유용한 명령어 모음

```bash
# 서비스 재시작
docker compose restart

# 서비스 중지
docker compose stop

# 서비스 시작
docker compose start

# 컨테이너 제거 (데이터는 유지)
docker compose down

# 컨테이너 및 볼륨 모두 제거
docker compose down -v

# 특정 컨테이너 셸 접속
docker exec -it codelog-backend sh

# 실시간 로그
docker compose logs -f --tail=50

# 환경 변수 확인
docker compose config
```

---

## 지원

문제가 발생하면:
1. 로그 확인: `docker compose logs -f`
2. GitHub Issues에 등록
3. README.md의 문의 정보 참고

---

**배포를 축하합니다!** 🎉

CodeLog가 성공적으로 배포되었습니다. http://YOUR_EC2_IP 또는 https://your-domain.com 에서 접속할 수 있습니다.
