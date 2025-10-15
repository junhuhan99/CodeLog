#!/bin/bash
#
# CodeLog - Android 빌드 환경 자동 설치 스크립트
# EC2 Ubuntu 서버용
#
# 사용법:
#   chmod +x setup-android-build-environment.sh
#   ./setup-android-build-environment.sh
#

set -e  # 에러 발생 시 스크립트 중단

echo "======================================================================"
echo "CodeLog - Android 빌드 환경 자동 설치"
echo "======================================================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 시스템 업데이트
log_info "시스템 패키지 업데이트..."
sudo apt update
sudo apt upgrade -y

# 2. 필수 도구 설치
log_info "필수 도구 설치 (curl, wget, unzip)..."
sudo apt install -y curl wget unzip

# 3. Node.js 18 설치
log_info "Node.js 18 설치..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_warn "Node.js가 이미 설치되어 있습니다: $NODE_VERSION"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    log_info "Node.js 설치 완료: $(node --version)"
fi

# 4. Java JDK 17 설치
log_info "Java JDK 17 설치..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java --version 2>&1 | head -n 1)
    log_warn "Java가 이미 설치되어 있습니다: $JAVA_VERSION"
else
    sudo apt install -y openjdk-17-jdk
    log_info "Java 설치 완료: $(java --version 2>&1 | head -n 1)"
fi

# Java 환경 변수 설정
if ! grep -q "JAVA_HOME" ~/.bashrc; then
    log_info "Java 환경 변수 설정..."
    echo '' >> ~/.bashrc
    echo '# Java Environment' >> ~/.bashrc
    echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
    echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
    export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
    export PATH=$JAVA_HOME/bin:$PATH
fi

# 5. Android SDK 설치
log_info "Android SDK 설치..."
ANDROID_SDK_DIR="$HOME/android-sdk"

if [ -d "$ANDROID_SDK_DIR" ]; then
    log_warn "Android SDK가 이미 설치되어 있습니다: $ANDROID_SDK_DIR"
else
    # Android SDK Command Line Tools 다운로드
    log_info "Android SDK Command Line Tools 다운로드 중..."
    cd ~
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip

    # 압축 해제 및 설치
    log_info "Android SDK 설치 중..."
    mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
    unzip -q commandlinetools-linux-9477386_latest.zip -d "$ANDROID_SDK_DIR/cmdline-tools"
    mv "$ANDROID_SDK_DIR/cmdline-tools/cmdline-tools" "$ANDROID_SDK_DIR/cmdline-tools/latest"
    rm commandlinetools-linux-9477386_latest.zip

    log_info "Android SDK 설치 완료"
fi

# Android SDK 환경 변수 설정
if ! grep -q "ANDROID_HOME" ~/.bashrc; then
    log_info "Android SDK 환경 변수 설정..."
    echo '' >> ~/.bashrc
    echo '# Android SDK Environment' >> ~/.bashrc
    echo "export ANDROID_HOME=$HOME/android-sdk" >> ~/.bashrc
    echo 'export ANDROID_SDK_ROOT=$ANDROID_HOME' >> ~/.bashrc
    echo 'export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH' >> ~/.bashrc
    echo 'export PATH=$ANDROID_HOME/platform-tools:$PATH' >> ~/.bashrc
    echo 'export PATH=$ANDROID_HOME/build-tools/34.0.0:$PATH' >> ~/.bashrc
fi

# 환경 변수 즉시 적용
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/build-tools/34.0.0:$PATH"

# 6. Android SDK 패키지 설치
log_info "Android SDK 패키지 설치 중..."
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --update
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-34" "build-tools;34.0.0"
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platforms;android-33" "build-tools;33.0.2"
log_info "Android SDK 패키지 설치 완료"

# 7. Gradle 설치
log_info "Gradle 8.4 설치..."
GRADLE_VERSION="8.4"
GRADLE_DIR="/opt/gradle"

if command -v gradle &> /dev/null; then
    INSTALLED_GRADLE=$(gradle --version | grep "Gradle" | head -n 1)
    log_warn "Gradle이 이미 설치되어 있습니다: $INSTALLED_GRADLE"
else
    # Gradle 다운로드
    cd ~
    wget -q https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip

    # Gradle 설치
    sudo mkdir -p "$GRADLE_DIR"
    sudo unzip -q "gradle-${GRADLE_VERSION}-bin.zip" -d "$GRADLE_DIR"
    rm "gradle-${GRADLE_VERSION}-bin.zip"

    log_info "Gradle 설치 완료"
fi

# Gradle 환경 변수 설정
if ! grep -q "GRADLE_HOME" ~/.bashrc; then
    log_info "Gradle 환경 변수 설정..."
    echo '' >> ~/.bashrc
    echo '# Gradle Environment' >> ~/.bashrc
    echo "export GRADLE_HOME=/opt/gradle/gradle-${GRADLE_VERSION}" >> ~/.bashrc
    echo 'export PATH=$GRADLE_HOME/bin:$PATH' >> ~/.bashrc
fi

export GRADLE_HOME="/opt/gradle/gradle-${GRADLE_VERSION}"
export PATH="$GRADLE_HOME/bin:$PATH"

# 8. Capacitor CLI 설치
log_info "Capacitor CLI 설치..."
cd ~/CodeLog/backend
npm install --save @capacitor/core @capacitor/cli @capacitor/android

# 9. 빌드 디렉토리 생성 및 권한 설정
log_info "빌드 디렉토리 설정..."
mkdir -p ~/CodeLog/backend/android-builds
chmod 755 ~/CodeLog/backend/android-builds

# 10. Gradle 전역 설정 최적화
log_info "Gradle 전역 설정 최적화..."
mkdir -p ~/.gradle
cat > ~/.gradle/gradle.properties << 'EOF'
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.caching=true
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError
EOF

# 11. 환경 변수 확인
echo ""
log_info "======================================================================"
log_info "설치 완료! 환경 변수 확인:"
log_info "======================================================================"
source ~/.bashrc
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Java: $(java --version 2>&1 | head -n 1)"
echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "Gradle: $(gradle --version 2>&1 | grep "Gradle" | head -n 1)"
echo ""

log_info "======================================================================"
log_info "설치된 Android SDK 패키지:"
log_info "======================================================================"
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --list_installed

echo ""
log_info "======================================================================"
log_info "설치가 완료되었습니다!"
log_info "======================================================================"
echo ""
log_warn "중요: 다음 명령어로 환경 변수를 현재 세션에 적용하세요:"
echo "      source ~/.bashrc"
echo ""
log_info "이제 Docker 컨테이너를 재시작하세요:"
echo "      cd ~/CodeLog"
echo "      docker compose down"
echo "      docker compose up -d"
echo ""
log_info "완료!"
