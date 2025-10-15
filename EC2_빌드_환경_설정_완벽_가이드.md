# CodeLog EC2 Android 빌드 환경 설정 완벽 가이드

## 문제 상황
- ❌ **Gradle is not installed** 에러 발생
- ❌ 데모 APK만 생성됨 (실제 작동하지 않음)
- ✅ **해결 목표**: 실제로 작동하는 APK/AAB 생성

---

## 📋 목차
1. [문제 원인](#문제-원인)
2. [해결 방법 요약](#해결-방법-요약)
3. [단계별 설정](#단계별-설정)
4. [배포 및 테스트](#배포-및-테스트)
5. [문제 해결](#문제-해결)

---

## 문제 원인

### 1. EC2 서버에 Android 빌드 환경이 설치되지 않음
EC2 서버에 다음 도구들이 설치되지 않아서 빌드가 실패합니다:
- ❌ Java JDK 17
- ❌ Android SDK
- ❌ Gradle
- ❌ 환경 변수 설정

### 2. 코드 변경사항이 배포되지 않음
최신 커밋에서 데모 APK 생성 로직을 제거했지만, EC2에서 구버전 코드가 실행 중일 수 있습니다.

---

## 해결 방법 요약

### 방법 1: 자동 설치 스크립트 사용 (✅ 권장)
제공된 스크립트로 모든 환경을 자동으로 설정합니다.

### 방법 2: 수동 설치
각 도구를 하나씩 수동으로 설치합니다.

---

## 단계별 설정

### 🚀 1단계: 로컬에서 변경사항 Git Push

```powershell
# Windows PowerShell에서 실행
cd D:\CodeLog

# 변경사항 확인
git status

# 모든 파일 추가
git add .

# 커밋 (새 설정 파일 포함)
git commit -m "Fix: Add Android build environment setup and Docker config"

# Push
git push origin main
```

---

### 🚀 2단계: EC2 서버 접속

```bash
# Windows PowerShell
ssh -i "D:\CodeLog\codelog-keypair.pem" ubuntu@YOUR_EC2_IP

# 또는 저장된 키 경로 사용
ssh -i C:\keys\codelog-keypair.pem ubuntu@YOUR_EC2_IP
```

**⚠️ 중요**: `YOUR_EC2_IP`를 실제 EC2 IP 주소로 변경하세요!

---

### 🚀 3단계: 최신 코드 가져오기

```bash
# EC2 서버에서 실행
cd ~/CodeLog

# 기존 변경사항 백업 (있을 경우)
git stash

# 최신 코드 가져오기
git pull origin main

# 변경사항 확인
git log -3
ls -la setup-android-build-environment.sh
```

---

### 🚀 4단계: Android 빌드 환경 자동 설치

```bash
# EC2 서버에서 실행
cd ~/CodeLog

# 실행 권한 부여
chmod +x setup-android-build-environment.sh

# 스크립트 실행 (약 10-15분 소요)
./setup-android-build-environment.sh

# ⏳ 기다리는 동안 스크립트가 다음을 설치합니다:
# - Node.js 18
# - Java JDK 17
# - Android SDK
# - Gradle 8.4
# - Capacitor CLI
# - 환경 변수 설정
```

설치가 완료되면 다음과 같은 출력이 표시됩니다:
```
[INFO] ======================================================================
[INFO] 설치 완료! 환경 변수 확인:
[INFO] ======================================================================
Node.js: v18.x.x
npm: v9.x.x
Java: openjdk 17.0.x
JAVA_HOME: /usr/lib/jvm/java-17-openjdk-amd64
ANDROID_HOME: /home/ubuntu/android-sdk
Gradle: Gradle 8.4
```

---

### 🚀 5단계: 환경 변수 적용

```bash
# 현재 세션에 환경 변수 적용
source ~/.bashrc

# 확인
echo $JAVA_HOME
echo $ANDROID_HOME
echo $GRADLE_HOME

# 명령어 확인
java --version
gradle --version
node --version
```

---

### 🚀 6단계: Docker 재빌드 및 재시작

```bash
cd ~/CodeLog

# 기존 컨테이너 중지 및 삭제
docker compose down

# 이미지까지 삭제 (캐시 제거)
docker compose down --rmi all

# 강제 재빌드 (새로운 Dockerfile.backend 사용)
docker compose build --no-cache

# 컨테이너 시작
docker compose up -d

# 로그 확인
docker compose logs -f backend
```

**✅ 성공 메시지 확인:**
```
[INFO] ✓ Node.js: v18.x.x
[INFO] ✓ Java: openjdk 17.0.x
[INFO] ✓ ANDROID_HOME: /android-sdk
[INFO] ✓ Gradle: Gradle 8.4
```

---

### 🚀 7단계: 빌드 테스트

1. **브라우저에서 앱 접속**
   ```
   http://YOUR_EC2_IP
   ```

2. **로그인 후 프로젝트 생성**

3. **새 빌드 시작**
   - 빌드 타입 선택: APK 또는 AAB
   - 빌드 시작 클릭

4. **빌드 로그 실시간 확인**
   ```bash
   # EC2 서버에서
   docker compose logs -f backend
   ```

   **✅ 정상 빌드 로그 예시:**
   ```
   [timestamp] Starting Capacitor-based Android build process...
   [timestamp] Checking build environment...
   [timestamp] ✓ Node.js: v18.18.0
   [timestamp] ✓ npm: v9.8.1
   [timestamp] ✓ Java: openjdk 17.0.8
   [timestamp] ✓ ANDROID_HOME: /android-sdk
   [timestamp] ✓ Android SDK directory exists
   [timestamp] ✓ Build environment validation passed
   [timestamp] Creating web app structure...
   [timestamp] Initializing Capacitor...
   [timestamp] Installing Capacitor dependencies...
   [timestamp] Adding Android platform...
   [timestamp] Syncing web assets...
   [timestamp] Building APK with Gradle (this may take 5-10 minutes)...
   [timestamp] APK built successfully: /path/to/app.apk (15.3MB)
   [timestamp] Build completed successfully!
   ```

   **❌ 데모 APK 메시지가 나오면 안됨:**
   ```
   ❌ Creating demo APK...  (이 메시지가 보이면 안됨!)
   ```

5. **빌드 완료 후 APK 다운로드**

6. **실제 Android 기기에 APK 설치 및 테스트**

---

## 빌드 파일 위치 확인

```bash
# EC2 서버에서
ls -lh ~/CodeLog/backend/android-builds/

# 출력 예시:
# -rw-r--r-- 1 ubuntu ubuntu 15M Oct 15 10:30 MyApp_1.apk
# -rw-r--r-- 1 ubuntu ubuntu 12M Oct 15 11:45 MyApp_2.aab
```

---

## 문제 해결

### ❓ 스크립트 실행 시 "Permission denied" 에러

```bash
chmod +x setup-android-build-environment.sh
./setup-android-build-environment.sh
```

---

### ❓ Docker 빌드 시 "Cannot find ANDROID_HOME" 에러

환경 변수가 Docker 컨테이너에 전달되지 않았습니다.

**해결:**
```bash
# docker-compose.yml 확인
cat docker-compose.yml | grep ANDROID_HOME

# 환경 변수 export
export ANDROID_HOME=$HOME/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Docker 재시작
docker compose down
docker compose up -d
```

---

### ❓ 빌드 시 "Gradle daemon disappeared unexpectedly" 에러

메모리 부족 문제입니다.

**해결 1: 스왑 메모리 추가**
```bash
# 4GB 스왑 파일 생성
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

**해결 2: EC2 인스턴스 타입 업그레이드**
- 최소: t3.large (2 vCPU, 8GB RAM)
- 권장: t3.xlarge (4 vCPU, 16GB RAM)

---

### ❓ 여전히 데모 APK가 생성됨

구버전 코드가 실행 중입니다.

**해결:**
```bash
cd ~/CodeLog

# 모든 컨테이너와 이미지 삭제
docker compose down -v --rmi all

# 모든 Docker 캐시 삭제
docker system prune -a -f

# 강제 재빌드
docker compose build --no-cache

# 재시작
docker compose up -d

# 로그 확인 - "Capacitor-based" 메시지 확인
docker compose logs -f backend | grep -i capacitor
```

---

### ❓ "npm install failed" 에러

**해결:**
```bash
cd ~/CodeLog/backend
npm cache clean --force
npm install --legacy-peer-deps
```

---

### ❓ 빌드가 10분 넘게 걸림

첫 빌드는 모든 의존성을 다운로드하므로 10-15분 소요됩니다.
이후 빌드는 3-5분으로 단축됩니다.

**최적화:**
```bash
# Gradle 데몬 확인
gradle --status

# 설정 확인
cat ~/.gradle/gradle.properties
```

---

### ❓ Android SDK 라이선스 에러

```bash
yes | ~/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses
```

---

## 빠른 명령어 모음

### 전체 재설정 (문제 발생 시)
```bash
cd ~/CodeLog && \
git pull origin main && \
./setup-android-build-environment.sh && \
source ~/.bashrc && \
docker compose down --rmi all && \
docker compose build --no-cache && \
docker compose up -d && \
docker compose logs -f backend
```

### 환경 확인
```bash
node --version
java --version
gradle --version
echo $ANDROID_HOME
echo $JAVA_HOME
docker compose ps
```

### 로그 확인
```bash
# 실시간 백엔드 로그
docker compose logs -f backend

# 최근 100줄
docker compose logs --tail=100 backend

# 빌드 관련 로그만
docker compose logs backend | grep -i build
```

---

## 예상 빌드 시간

| 빌드 타입 | 첫 번째 빌드 | 이후 빌드 |
|----------|------------|----------|
| **APK** | 10-15분 | 3-5분 |
| **AAB** | 12-18분 | 4-6분 |

**참고**:
- EC2 인스턴스 타입에 따라 시간이 달라질 수 있습니다
- 첫 빌드는 모든 Gradle 의존성을 다운로드하므로 시간이 오래 걸립니다

---

## 성공 체크리스트

- [ ] `setup-android-build-environment.sh` 실행 완료
- [ ] 환경 변수 모두 설정됨 (JAVA_HOME, ANDROID_HOME, GRADLE_HOME)
- [ ] `java --version` 실행 성공 (17.x)
- [ ] `gradle --version` 실행 성공 (8.x)
- [ ] Docker 컨테이너 재빌드 완료
- [ ] 빌드 로그에 "Capacitor-based" 메시지 확인
- [ ] 빌드 로그에 "demo APK" 메시지 없음
- [ ] APK 파일 생성 성공 (5MB 이상)
- [ ] APK 다운로드 및 설치 성공
- [ ] 앱이 실제로 작동함

---

## 추가 도움

### Docker 컨테이너 내부 확인
```bash
# 백엔드 컨테이너 접속
docker exec -it codelog-backend sh

# 컨테이너 내부에서 확인
echo $JAVA_HOME
echo $ANDROID_HOME
which java
which gradle
ls -la /android-sdk
exit
```

### 수동 빌드 테스트
```bash
# 임시 빌드 디렉토리 생성
cd ~/CodeLog/backend/android-builds
mkdir test-build
cd test-build

# Capacitor 초기화
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android

# Android 플랫폼 추가
npx cap init testapp com.example.testapp
mkdir www
echo "<html><body>Test</body></html>" > www/index.html
npx cap add android
cd android
./gradlew assembleRelease
ls -lh app/build/outputs/apk/release/
```

---

## 마무리

이 가이드를 따라하면:
1. ✅ Gradle 설치 에러 해결
2. ✅ 데모 APK 대신 **실제 작동하는 APK** 생성
3. ✅ 안정적인 빌드 환경 구축

**문제가 계속되면:**
- EC2 로그 전체를 확인: `docker compose logs backend > build-logs.txt`
- 환경 변수 출력: `env | grep -E 'JAVA|ANDROID|GRADLE' > env-vars.txt`

---

**작성일**: 2025-10-15
**버전**: 3.0
**업데이트**: Android 빌드 환경 자동 설치 스크립트 추가
