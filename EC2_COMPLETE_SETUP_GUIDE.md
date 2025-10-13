# CodeLog - AWS EC2 완전 초기 세팅 가이드

이 가이드는 AWS 계정 생성부터 CodeLog 완전 배포까지 모든 단계를 다룹니다.

---

## 📑 목차

1. [AWS 계정 및 EC2 인스턴스 생성](#1-aws-계정-및-ec2-인스턴스-생성)
2. [EC2 인스턴스 초기 접속 및 설정](#2-ec2-인스턴스-초기-접속-및-설정)
3. [MySQL 설치 및 설정](#3-mysql-설치-및-설정)
4. [Node.js 및 필수 도구 설치](#4-nodejs-및-필수-도구-설치)
5. [Docker 및 Docker Compose 설치](#5-docker-및-docker-compose-설치)
6. [CodeLog 프로젝트 배포](#6-codelog-프로젝트-배포)
7. [도메인 및 SSL 설정](#7-도메인-및-ssl-설정)
8. [보안 및 방화벽 설정](#8-보안-및-방화벽-설정)
9. [모니터링 및 자동화](#9-모니터링-및-자동화)
10. [문제 해결](#10-문제-해결)

---

## 1. AWS 계정 및 EC2 인스턴스 생성

### 1.1 AWS 계정 생성 (신규 사용자)

1. **AWS 웹사이트 접속**
   ```
   https://aws.amazon.com/ko/
   ```

2. **계정 생성**
   - "AWS 계정 만들기" 클릭
   - 이메일 주소 입력
   - 비밀번호 설정
   - 계정 이름 입력

3. **연락처 정보 입력**
   - 주소, 전화번호 입력
   - 계정 유형: 개인 또는 비즈니스 선택

4. **결제 정보 입력**
   - 신용/체크 카드 등록
   - $1 검증 비용 청구 (나중에 환불)

5. **본인 확인**
   - 전화번호로 인증 코드 수신
   - 코드 입력하여 인증

6. **Support Plan 선택**
   - 기본(무료) 플랜 선택

### 1.2 EC2 인스턴스 생성

#### A. AWS Console 로그인

```
https://console.aws.amazon.com/
```

#### B. EC2 서비스로 이동

1. 상단 검색창에 "EC2" 입력
2. EC2 서비스 클릭

#### C. 리전 선택

- 우측 상단에서 리전 선택
- 권장: **서울 (ap-northeast-2)**
- 이유: 한국 사용자에게 가장 빠른 응답 속도

#### D. 인스턴스 시작

1. 왼쪽 메뉴 > 인스턴스 > 인스턴스
2. "인스턴스 시작" 버튼 클릭

#### E. AMI (Amazon Machine Image) 선택

**권장 설정**:
```
이름: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
아키텍처: 64비트 (x86)
```

> **왜 Ubuntu 22.04 LTS?**
> - 장기 지원 버전 (2027년까지)
> - 안정성과 최신 패키지 균형
> - 대부분의 문서와 튜토리얼 지원

#### F. 인스턴스 타입 선택

| 용도 | 인스턴스 타입 | vCPU | 메모리 | 월 예상 비용 |
|------|---------------|------|--------|-------------|
| 테스트 | t3.micro | 2 | 1GB | ~$7.50 |
| 개발 | t3.small | 2 | 2GB | ~$15 |
| **프로덕션 (권장)** | **t3.medium** | **2** | **4GB** | **~$30** |
| 대용량 트래픽 | t3.large | 2 | 8GB | ~$60 |

**프로덕션 권장**: `t3.medium` 이상

#### G. 키 페어 생성

1. **키 페어 생성** 클릭
   ```
   키 페어 이름: codelog-keypair
   키 페어 유형: RSA
   프라이빗 키 파일 형식: .pem (Mac/Linux) 또는 .ppk (Windows PuTTY)
   ```

2. **다운로드 및 보관**
   - `codelog-keypair.pem` 파일 다운로드
   - 안전한 위치에 저장
   - **중요**: 이 파일을 잃어버리면 인스턴스에 접속 불가

3. **Windows 사용자 추가 작업**:
   ```powershell
   # 파일 권한 설정 (PowerShell 관리자 권한)
   cd C:\path\to\your\key
   icacls "codelog-keypair.pem" /inheritance:r
   icacls "codelog-keypair.pem" /grant:r "%username%:R"
   ```

4. **Mac/Linux 사용자 추가 작업**:
   ```bash
   chmod 400 ~/Downloads/codelog-keypair.pem
   ```

#### H. 네트워크 설정

**보안 그룹 생성**:

```
보안 그룹 이름: codelog-security-group
설명: Security group for CodeLog application
```

**인바운드 규칙 추가**:

| 규칙 | 프로토콜 | 포트 범위 | 소스 | 설명 |
|------|----------|-----------|------|------|
| SSH | TCP | 22 | 내 IP | SSH 접속 |
| HTTP | TCP | 80 | 0.0.0.0/0 | 웹 접속 |
| HTTPS | TCP | 443 | 0.0.0.0/0 | SSL 웹 접속 |
| Custom TCP | TCP | 5000 | 0.0.0.0/0 | 백엔드 API (개발용) |
| MySQL | TCP | 3306 | 보안 그룹 내 | MySQL (선택) |

> **보안 팁**: SSH 규칙의 소스를 "내 IP"로 설정하면 자신의 IP에서만 접속 가능

#### I. 스토리지 구성

**권장 설정**:
```
크기: 30 GB (최소), 50 GB (권장), 100 GB (대용량)
볼륨 유형: gp3 (범용 SSD)
IOPS: 3000 (기본값)
처리량: 125 MB/s (기본값)
```

**루트 볼륨 암호화**: 활성화 (권장)

#### J. 고급 세부 정보 (선택사항)

**종료 방식**:
```
종료 동작: 중지 (권장)
종료 보호 활성화: 체크 (실수로 삭제 방지)
```

**사용자 데이터** (선택 - 자동 업데이트):
```bash
#!/bin/bash
apt update
apt upgrade -y
```

#### K. 인스턴스 시작

1. 오른쪽 요약 패널에서 설정 확인
2. "인스턴스 시작" 버튼 클릭
3. 인스턴스 생성 완료 메시지 확인

### 1.3 Elastic IP 할당 (강력 권장)

> **왜 필요한가?** 인스턴스 재시작 시 퍼블릭 IP가 변경되는 것을 방지

1. **Elastic IP 메뉴**
   - 왼쪽 메뉴 > 네트워크 및 보안 > 탄력적 IP

2. **탄력적 IP 주소 할당**
   - "탄력적 IP 주소 할당" 버튼 클릭
   - 네트워크 경계 그룹: 기본값
   - "할당" 클릭

3. **인스턴스에 연결**
   - 할당된 IP 선택
   - "작업" > "탄력적 IP 주소 연결"
   - 인스턴스 선택: codelog 인스턴스
   - "연결" 클릭

4. **Elastic IP 저장**
   ```
   예시: 13.125.XXX.XXX
   이 IP가 고정 IP가 됩니다
   ```

---

## 2. EC2 인스턴스 초기 접속 및 설정

### 2.1 SSH 접속

#### Windows (PowerShell)

```powershell
# 키 파일이 있는 디렉토리로 이동
cd C:\path\to\your\key

# SSH 접속
ssh -i codelog-keypair.pem ubuntu@YOUR_ELASTIC_IP
```

**처음 접속 시 메시지**:
```
The authenticity of host 'xxx.xxx.xxx.xxx' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
→ `yes` 입력

#### Mac/Linux (Terminal)

```bash
# SSH 접속
ssh -i ~/Downloads/codelog-keypair.pem ubuntu@YOUR_ELASTIC_IP
```

#### 접속 성공 화면

```
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-1045-aws x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

ubuntu@ip-172-31-x-x:~$
```

### 2.2 시스템 초기 설정

#### A. 시스템 업데이트

```bash
# 패키지 목록 업데이트
sudo apt update

# 설치된 패키지 업그레이드
sudo apt upgrade -y

# 시간이 걸릴 수 있음 (5-10분)
```

#### B. 타임존 설정

```bash
# 현재 타임존 확인
timedatectl

# 타임존을 서울로 설정
sudo timedatectl set-timezone Asia/Seoul

# 설정 확인
date
# 출력: 2025년 10월 13일 월요일 15:30:00 KST
```

#### C. 호스트명 설정 (선택사항)

```bash
# 현재 호스트명 확인
hostname

# 호스트명 변경
sudo hostnamectl set-hostname codelog-server

# /etc/hosts 파일 수정
sudo nano /etc/hosts
```

**/etc/hosts 파일 수정**:
```
127.0.0.1 localhost
127.0.1.1 codelog-server

# 기존 내용 유지
```

저장: `Ctrl + O` → Enter → `Ctrl + X`

#### D. Swap 메모리 설정 (메모리 부족 방지)

```bash
# 현재 Swap 확인
free -h

# Swap 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile

# 권한 설정
sudo chmod 600 /swapfile

# Swap 영역 설정
sudo mkswap /swapfile

# Swap 활성화
sudo swapon /swapfile

# 부팅 시 자동 마운트 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

**예상 출력**:
```
              total        used        free      shared  buff/cache   available
Mem:           3.8Gi       200Mi       3.4Gi       0.0Ki       200Mi       3.4Gi
Swap:          2.0Gi          0B       2.0Gi
```

#### E. 기본 유틸리티 설치

```bash
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    net-tools \
    unzip \
    zip \
    build-essential \
    software-properties-common
```

---

## 3. MySQL 설치 및 설정

### 3.1 MySQL 8.0 설치

```bash
# MySQL 서버 설치
sudo apt install -y mysql-server

# MySQL 버전 확인
mysql --version
# 출력: mysql  Ver 8.0.xx for Linux on x86_64
```

### 3.2 MySQL 보안 설정

```bash
# MySQL 보안 스크립트 실행
sudo mysql_secure_installation
```

**대화형 질문 및 권장 답변**:

```
1. VALIDATE PASSWORD COMPONENT를 설정하시겠습니까?
   → y (비밀번호 강도 검증)

2. 비밀번호 검증 레벨을 선택하세요 (0 = LOW, 1 = MEDIUM, 2 = STRONG)
   → 1 (MEDIUM)

3. root 비밀번호를 설정하세요
   → 강력한 비밀번호 입력 (예: CodeLog2024!@#$)
   → 비밀번호 확인 재입력

4. 익명 사용자를 제거하시겠습니까?
   → y (제거 권장)

5. 원격 root 로그인을 비활성화하시겠습니까?
   → y (보안 강화)

6. test 데이터베이스를 제거하시겠습니까?
   → y (제거 권장)

7. 권한 테이블을 다시 로드하시겠습니까?
   → y (변경사항 적용)
```

### 3.3 MySQL 데이터베이스 및 사용자 생성

```bash
# MySQL root로 로그인
sudo mysql -u root -p
# 비밀번호 입력: (위에서 설정한 root 비밀번호)
```

**MySQL 프롬프트에서 실행**:

```sql
-- CodeLog 데이터베이스 생성
CREATE DATABASE codelog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CodeLog 전용 사용자 생성
CREATE USER 'codelog'@'localhost' IDENTIFIED BY 'YourSecurePassword123!@#';

-- 모든 권한 부여
GRANT ALL PRIVILEGES ON codelog.* TO 'codelog'@'localhost';

-- 권한 새로고침
FLUSH PRIVILEGES;

-- 데이터베이스 확인
SHOW DATABASES;

-- 사용자 확인
SELECT user, host FROM mysql.user;

-- 종료
EXIT;
```

**비밀번호 생성 도구**:
```bash
# 랜덤 비밀번호 생성
openssl rand -base64 24
```

### 3.4 MySQL 원격 접속 설정 (선택사항)

> **주의**: 보안상 권장하지 않음. 필요한 경우만 설정

```bash
# MySQL 설정 파일 편집
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

**파일 내용 수정**:
```ini
# 기존: bind-address = 127.0.0.1
# 수정: bind-address = 0.0.0.0
bind-address = 0.0.0.0
```

**MySQL 재시작**:
```bash
sudo systemctl restart mysql
```

**원격 접속 사용자 생성** (MySQL 프롬프트):
```sql
CREATE USER 'codelog'@'%' IDENTIFIED BY 'YourSecurePassword123!@#';
GRANT ALL PRIVILEGES ON codelog.* TO 'codelog'@'%';
FLUSH PRIVILEGES;
```

### 3.5 MySQL 서비스 관리

```bash
# MySQL 상태 확인
sudo systemctl status mysql

# MySQL 시작
sudo systemctl start mysql

# MySQL 중지
sudo systemctl stop mysql

# MySQL 재시작
sudo systemctl restart mysql

# 부팅 시 자동 시작 설정
sudo systemctl enable mysql

# 자동 시작 해제
sudo systemctl disable mysql
```

### 3.6 MySQL 테이블 스키마 적용

```bash
# CodeLog 스키마 파일 다운로드 (나중에 프로젝트 배포 시)
# 지금은 데이터베이스만 준비

# MySQL 접속 테스트
mysql -u codelog -p
# 비밀번호 입력

# 데이터베이스 선택
USE codelog;

# 테이블 확인 (아직 비어있음)
SHOW TABLES;

# 종료
EXIT;
```

---

## 4. Node.js 및 필수 도구 설치

### 4.1 Node.js 18 LTS 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js 설치
sudo apt install -y nodejs

# 설치 확인
node --version
# 출력: v18.xx.x

npm --version
# 출력: 9.xx.x
```

### 4.2 Yarn 설치 (선택사항)

```bash
# Yarn 설치
npm install -g yarn

# 확인
yarn --version
```

### 4.3 PM2 설치 (프로세스 관리자)

```bash
# PM2 전역 설치
sudo npm install -g pm2

# 확인
pm2 --version

# 부팅 시 자동 시작 설정
pm2 startup systemd
# 출력된 명령어 복사하여 실행
```

---

## 5. Docker 및 Docker Compose 설치

### 5.1 Docker 설치

```bash
# 기존 Docker 제거 (있을 경우)
sudo apt remove docker docker-engine docker.io containerd runc

# 필수 패키지 설치
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker GPG 키 추가
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 패키지 목록 업데이트
sudo apt update

# Docker 설치
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker 버전 확인
docker --version
# 출력: Docker version 24.x.x

docker compose version
# 출력: Docker Compose version v2.x.x
```

### 5.2 Docker 사용자 권한 설정

```bash
# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 그룹 변경사항 적용 (재로그인 대신)
newgrp docker

# 권한 확인
docker ps
# 에러 없이 실행되면 성공
```

### 5.3 Docker 서비스 설정

```bash
# Docker 서비스 시작
sudo systemctl start docker

# 부팅 시 자동 시작 설정
sudo systemctl enable docker

# 상태 확인
sudo systemctl status docker
```

### 5.4 Docker 테스트

```bash
# Hello World 컨테이너 실행
docker run hello-world

# 예상 출력:
# Hello from Docker!
# This message shows that your installation appears to be working correctly.
```

---

## 6. CodeLog 프로젝트 배포

### 6.1 프로젝트 가져오기

#### 방법 1: Git Clone (권장)

```bash
# 홈 디렉토리로 이동
cd ~

# Git 저장소 클론
git clone https://github.com/your-username/CodeLog.git

# 프로젝트 디렉토리 이동
cd CodeLog
```

#### 방법 2: 로컬에서 파일 업로드

**로컬 터미널** (Windows PowerShell/Mac Terminal):
```bash
# SCP를 사용하여 파일 전송
scp -i codelog-keypair.pem -r /path/to/CodeLog ubuntu@YOUR_ELASTIC_IP:~

# 예시 (Windows):
scp -i C:\keys\codelog-keypair.pem -r C:\Projects\CodeLog ubuntu@13.125.XXX.XXX:~

# 예시 (Mac/Linux):
scp -i ~/Downloads/codelog-keypair.pem -r ~/Projects/CodeLog ubuntu@13.125.XXX.XXX:~
```

#### 방법 3: ZIP 파일 업로드

```bash
# 로컬에서 ZIP 생성
zip -r CodeLog.zip CodeLog/

# 서버로 전송
scp -i codelog-keypair.pem CodeLog.zip ubuntu@YOUR_ELASTIC_IP:~

# EC2에서 압축 해제
ssh -i codelog-keypair.pem ubuntu@YOUR_ELASTIC_IP
unzip CodeLog.zip
cd CodeLog
```

### 6.2 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

**.env 파일 내용**:
```env
# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_ROOT_PASSWORD=SuperSecureRootPass123!@#
DB_NAME=codelog
DB_USER=codelog
DB_PASSWORD=YourSecurePassword123!@#

# JWT Configuration
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_minimum_32_characters_abcdefghijklmnopqrstuvwxyz

# Server Configuration
NODE_ENV=production
PORT=5000

# Frontend URL (Elastic IP 또는 도메인)
FRONTEND_URL=http://YOUR_ELASTIC_IP
# 또는 도메인이 있다면:
# FRONTEND_URL=https://your-domain.com

# Backend URL
BACKEND_URL=http://YOUR_ELASTIC_IP

# CORS Origins
CORS_ORIGIN=http://YOUR_ELASTIC_IP

# 참고: Firebase는 웹 인터페이스에서 설정
```

**강력한 비밀번호 생성**:
```bash
# JWT Secret 생성 (64자)
openssl rand -hex 32

# Database 비밀번호 생성
openssl rand -base64 24
```

저장: `Ctrl + O` → Enter → `Ctrl + X`

### 6.3 데이터베이스 스키마 적용

```bash
# MySQL에 스키마 적용
mysql -u codelog -p codelog < database/schema.sql
# 비밀번호 입력

# 확인
mysql -u codelog -p
USE codelog;
SHOW TABLES;
# 11개의 테이블이 표시되어야 함
EXIT;
```

### 6.4 Docker Compose로 배포

```bash
# 현재 위치 확인
pwd
# /home/ubuntu/CodeLog

# Docker 이미지 빌드 및 컨테이너 시작
docker compose up -d --build

# 빌드 로그 확인 (5-10분 소요)
docker compose logs -f

# 빌드 완료 신호:
# ✔ Container codelog-mysql    Started
# ✔ Container codelog-backend  Started
# ✔ Container codelog-frontend Started
```

**Ctrl + C로 로그 보기 중단**

### 6.5 배포 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# 예상 출력:
# NAME                IMAGE              STATUS         PORTS
# codelog-mysql       mysql:8.0          Up (healthy)   0.0.0.0:3306->3306/tcp
# codelog-backend     codelog-backend    Up (healthy)   0.0.0.0:5000->5000/tcp
# codelog-frontend    codelog-frontend   Up             0.0.0.0:80->80/tcp

# Health Check
curl http://localhost/api/health

# 예상 응답:
# {"status":"ok","message":"CodeLog API is running"}

# 백엔드 직접 확인
curl http://localhost:5000/api/health
```

### 6.6 브라우저에서 접속

```
http://YOUR_ELASTIC_IP
```

**예상 화면**:
- CodeLog 로그인 페이지
- 회원가입 버튼
- 깔끔한 UI

### 6.7 초기 관리자 계정 생성

브라우저에서:
1. 회원가입 클릭
2. 정보 입력:
   - 이메일: admin@codelog.com
   - 비밀번호: 강력한 비밀번호
   - 사용자명: Admin
3. 회원가입 완료
4. 로그인

---

## 7. 도메인 및 SSL 설정

### 7.1 도메인 구매 (선택사항)

**도메인 제공업체**:
- 가비아 (gabia.com)
- Cloudflare
- AWS Route 53
- Namecheap

### 7.2 DNS 설정

**A 레코드 추가**:
```
호스트: @ (또는 비워두기)
유형: A
값: YOUR_ELASTIC_IP
TTL: 3600 (1시간)
```

**www 서브도메인 추가** (선택):
```
호스트: www
유형: CNAME
값: your-domain.com
TTL: 3600
```

**DNS 전파 확인** (10-30분 소요):
```bash
# 도메인 DNS 확인
nslookup your-domain.com

# 또는
dig your-domain.com
```

### 7.3 SSL 인증서 설치 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# Nginx가 Docker 컨테이너로 실행 중이므로,
# standalone 모드 사용

# 도메인 인증서 발급
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

**대화형 질문**:
```
1. 이메일 주소 입력
   → your-email@example.com

2. 약관 동의
   → A (Agree)

3. 이메일 수신 동의 (선택)
   → N (No)

4. 인증 진행
   → 자동 진행
```

**인증서 위치**:
```
/etc/letsencrypt/live/your-domain.com/fullchain.pem
/etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 7.4 Nginx SSL 설정

```bash
# Nginx 설정 파일 수정
cd ~/CodeLog
nano frontend/nginx.conf
```

**nginx.conf 수정**:
```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 최적화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 루트 디렉토리
    root /usr/share/nginx/html;
    index index.html;

    # 프론트엔드 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 백엔드 API 프록시
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 업로드 파일
    location /uploads {
        proxy_pass http://backend:5000/uploads;
    }

    # 빌드 파일
    location /builds {
        proxy_pass http://backend:5000/builds;
    }
}
```

### 7.5 Docker Compose SSL 볼륨 추가

```bash
nano docker-compose.yml
```

**frontend 서비스에 볼륨 추가**:
```yaml
  frontend:
    # ... 기존 설정 ...
    volumes:
      - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro  # 추가
```

### 7.6 재배포

```bash
# 컨테이너 재시작
docker compose down
docker compose up -d

# HTTPS 접속 확인
curl https://your-domain.com/api/health
```

### 7.7 SSL 자동 갱신 설정

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# Cron 작업 추가
sudo crontab -e

# 다음 라인 추가 (매월 1일 새벽 2시 갱신)
0 2 1 * * certbot renew --quiet --post-hook "cd /home/ubuntu/CodeLog && docker compose restart frontend"
```

---

## 8. 보안 및 방화벽 설정

### 8.1 UFW 방화벽 설정

```bash
# UFW 설치 확인
sudo apt install -y ufw

# 기본 정책 설정 (모든 인바운드 차단, 아웃바운드 허용)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH 허용 (중요! 먼저 설정)
sudo ufw allow 22/tcp

# HTTP/HTTPS 허용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 방화벽 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

**예상 출력**:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### 8.2 SSH 보안 강화

```bash
# SSH 설정 파일 백업
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# SSH 설정 편집
sudo nano /etc/ssh/sshd_config
```

**권장 설정**:
```
# 루트 로그인 비활성화
PermitRootLogin no

# 비밀번호 인증 비활성화 (키 페어만 사용)
PasswordAuthentication no

# 빈 비밀번호 비활성화
PermitEmptyPasswords no

# X11 포워딩 비활성화
X11Forwarding no

# 로그인 제한 시간 (2분)
LoginGraceTime 2m

# 최대 인증 시도 횟수
MaxAuthTries 3

# 특정 사용자만 허용 (선택)
AllowUsers ubuntu
```

**SSH 서비스 재시작**:
```bash
sudo systemctl restart sshd
```

### 8.3 Fail2Ban 설치 (무차별 대입 공격 방어)

```bash
# Fail2Ban 설치
sudo apt install -y fail2ban

# 설정 파일 생성
sudo nano /etc/fail2ban/jail.local
```

**/etc/fail2ban/jail.local**:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
```

**Fail2Ban 시작**:
```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# 상태 확인
sudo fail2ban-client status sshd
```

### 8.4 자동 보안 업데이트

```bash
# unattended-upgrades 설치
sudo apt install -y unattended-upgrades

# 설정 파일 편집
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

**자동 업데이트 활성화**:
```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};

Unattended-Upgrade::Automatic-Reboot "false";
```

---

## 9. 모니터링 및 자동화

### 9.1 시스템 모니터링

```bash
# htop 설치 (이미 설치되어 있음)
htop

# 디스크 사용량 확인
df -h

# 메모리 사용량 확인
free -h

# Docker 리소스 확인
docker stats
```

### 9.2 로그 관리

```bash
# Docker 로그 확인
docker compose logs -f backend
docker compose logs -f mysql

# 특정 시간대 로그
docker compose logs --since 1h backend

# 로그 크기 제한 (docker-compose.yml)
nano docker-compose.yml
```

**로그 설정 추가**:
```yaml
services:
  backend:
    # ... 기존 설정 ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 9.3 데이터베이스 자동 백업

```bash
# 백업 스크립트 생성
nano ~/backup.sh
```

**backup.sh**:
```bash
#!/bin/bash

# 설정
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_PASSWORD="YourSecurePassword123!@#"
RETENTION_DAYS=30

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# MySQL 백업 (Docker 컨테이너에서)
docker exec codelog-mysql mysqldump -u codelog -p$DB_PASSWORD codelog > $BACKUP_DIR/codelog_$DATE.sql

# 압축
gzip $BACKUP_DIR/codelog_$DATE.sql

# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -name "codelog_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 로그
echo "[$DATE] Backup completed" >> $BACKUP_DIR/backup.log
```

**실행 권한 부여**:
```bash
chmod +x ~/backup.sh
```

**Cron 작업 추가**:
```bash
crontab -e

# 매일 새벽 2시 백업
0 2 * * * /home/ubuntu/backup.sh
```

### 9.4 디스크 공간 모니터링

```bash
# 디스크 모니터링 스크립트
nano ~/disk_monitor.sh
```

**disk_monitor.sh**:
```bash
#!/bin/bash

THRESHOLD=80
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ $DISK_USAGE -gt $THRESHOLD ]; then
    echo "⚠️  Disk usage is above ${THRESHOLD}%: ${DISK_USAGE}%"
    # 여기에 알림 로직 추가 (이메일, Slack 등)
fi
```

```bash
chmod +x ~/disk_monitor.sh

# Cron 작업 추가 (매시간 확인)
crontab -e
0 * * * * /home/ubuntu/disk_monitor.sh
```

---

## 10. 문제 해결

### 10.1 일반적인 문제

#### A. 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker compose logs

# 특정 컨테이너 로그
docker compose logs backend

# 컨테이너 상태
docker compose ps -a

# 재시작
docker compose down
docker compose up -d
```

#### B. MySQL 연결 실패

```bash
# MySQL 컨테이너 로그
docker compose logs mysql

# MySQL 컨테이너 접속
docker exec -it codelog-mysql bash

# MySQL 내부에서 확인
mysql -u codelog -p
USE codelog;
SHOW TABLES;
```

#### C. 포트 충돌

```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5000

# 충돌하는 프로세스 종료
sudo kill -9 PID
```

#### D. 디스크 공간 부족

```bash
# 디스크 사용량 확인
df -h

# Docker 정리
docker system prune -a --volumes

# 로그 파일 정리
sudo journalctl --vacuum-time=7d
```

### 10.2 성능 최적화

#### A. Nginx 캐싱

```nginx
# nginx.conf에 추가
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

    server {
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            proxy_cache my_cache;
            proxy_cache_valid 200 1d;
            expires 1d;
        }
    }
}
```

#### B. MySQL 튜닝

```sql
-- MySQL 설정 확인
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- 느린 쿼리 로그 활성화
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

### 10.3 유용한 명령어 모음

```bash
# === Docker ===
docker compose up -d              # 백그라운드 실행
docker compose down               # 중지 및 제거
docker compose restart            # 재시작
docker compose logs -f            # 실시간 로그
docker compose ps                 # 상태 확인
docker compose exec backend sh    # 컨테이너 셸 접속

# === 시스템 ===
htop                              # 시스템 모니터
df -h                             # 디스크 사용량
free -h                           # 메모리 사용량
sudo systemctl status docker      # Docker 상태

# === MySQL ===
docker exec -it codelog-mysql mysql -u codelog -p    # MySQL 접속
docker exec codelog-mysql mysqldump -u codelog -p codelog > backup.sql  # 백업

# === 로그 ===
docker compose logs --tail=100 backend    # 최근 100줄
docker compose logs --since 1h backend    # 최근 1시간
journalctl -u docker -f                   # Docker 시스템 로그
```

---

## 📋 배포 체크리스트

- [ ] EC2 인스턴스 생성 및 Elastic IP 할당
- [ ] SSH 키 페어 안전하게 보관
- [ ] 시스템 업데이트 및 타임존 설정
- [ ] Swap 메모리 설정
- [ ] MySQL 설치 및 보안 설정
- [ ] CodeLog 데이터베이스 및 사용자 생성
- [ ] Node.js 18 설치
- [ ] Docker 및 Docker Compose 설치
- [ ] CodeLog 프로젝트 배포
- [ ] .env 파일 설정
- [ ] 데이터베이스 스키마 적용
- [ ] Docker 컨테이너 시작
- [ ] 브라우저에서 접속 확인
- [ ] 관리자 계정 생성
- [ ] 도메인 연결 (선택)
- [ ] SSL 인증서 설치 (선택)
- [ ] UFW 방화벽 설정
- [ ] SSH 보안 강화
- [ ] Fail2Ban 설치
- [ ] 자동 백업 설정
- [ ] 모니터링 설정

---

## 🎓 다음 단계

1. **선택적 기능 설정**
   - Gradle 설치 (Android 빌드용)
   - Firebase 설정 (푸시 알림용)

2. **모니터링 강화**
   - CloudWatch 연동
   - 알림 설정

3. **CI/CD 구축**
   - GitHub Actions
   - 자동 배포 파이프라인

---

## 📞 지원

문제 발생 시:
1. Docker 로그 확인: `docker compose logs -f`
2. 시스템 로그 확인: `journalctl -xe`
3. GitHub Issues에 질문 등록

---

**축하합니다! 🎉**

CodeLog가 성공적으로 배포되었습니다!

**접속 URL**:
- HTTP: http://YOUR_ELASTIC_IP
- HTTPS: https://your-domain.com (도메인 설정 시)

**Made with ❤️ by Logs0**
