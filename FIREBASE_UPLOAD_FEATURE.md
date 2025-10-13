# Firebase 업로드 기능 및 사용자 맞춤형 기능 업그레이드

이 문서는 CodeLog v1.2에 추가된 Firebase 업로드 기능 및 사용자 맞춤형 기능 개선사항을 설명합니다.

---

## 🎯 주요 변경사항

### 1. **프로젝트별 Firebase 설정 시스템** ✅

**이전 방식**:
- 환경 변수로 전역 Firebase 설정
- 모든 프로젝트가 동일한 Firebase 앱 사용
- 관리자만 설정 가능

**현재 방식**:
- 각 프로젝트마다 독립적인 Firebase 설정
- 사용자가 직접 Firebase JSON 파일 업로드
- 웹 인터페이스에서 간편하게 관리

### 2. **사용자 맞춤형 Android 빌드** ✅

**개선된 기능**:
- ✅ 실제 앱 아이콘 사용 (모든 해상도)
- ✅ 실제 스플래시 이미지 사용
- ✅ 사용자 정의 테마 색상 적용
- ✅ 사용자 정의 앱 이름 및 패키지명
- ✅ URL 또는 템플릿 기반 콘텐츠

---

## 📊 데이터베이스 변경사항

### Projects 테이블에 추가된 필드

```sql
ALTER TABLE projects
ADD COLUMN firebase_project_id VARCHAR(255),
ADD COLUMN firebase_private_key TEXT,
ADD COLUMN firebase_client_email VARCHAR(255),
ADD COLUMN firebase_config_uploaded BOOLEAN DEFAULT FALSE;
```

**새 필드 설명**:
- `firebase_project_id`: Firebase 프로젝트 ID
- `firebase_private_key`: Firebase 비공개 키 (암호화된 형태)
- `firebase_client_email`: Firebase 서비스 계정 이메일
- `firebase_config_uploaded`: Firebase 설정 여부 (Boolean)

### 마이그레이션 실행

기존 데이터베이스에 적용하려면:

```bash
# MySQL 접속
docker exec -it codelog-mysql mysql -u codelog -p

# 마이그레이션 실행
source /path/to/database/migrations/001_add_firebase_config.sql
```

또는:

```bash
mysql -u codelog -p codelog < database/migrations/001_add_firebase_config.sql
```

---

## 🔌 API 변경사항

### 새로운 엔드포인트

#### 1. Firebase 설정 업로드
```
POST /api/projects/:id/firebase-config
Content-Type: application/json

Request Body:
{
  "firebase_config": {
    "project_id": "your-project-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk@your-project.iam.gserviceaccount.com"
  }
}

Response:
{
  "message": "Firebase 설정이 업로드되었습니다",
  "firebase_configured": true
}
```

#### 2. Firebase 설정 제거
```
DELETE /api/projects/:id/firebase-config

Response:
{
  "message": "Firebase 설정이 제거되었습니다",
  "firebase_configured": false
}
```

### 수정된 엔드포인트

#### 푸시 알림 전송
```
POST /api/projects/:projectId/push

Response (Firebase 설정 완료):
{
  "message": "푸시 알림이 전송되었습니다",
  "sent_count": 150,
  "failed_count": 0,
  "demo": false
}

Response (Firebase 미설정):
{
  "message": "푸시 알림 데모 (Firebase 미설정)",
  "sent_count": 150,
  "failed_count": 0,
  "demo": true,
  "demo_message": "Firebase not configured for this project. Please upload Firebase configuration."
}
```

---

## 🎨 UI 변경사항

### 프로젝트 설정 페이지 (ProjectDetail.jsx)

#### 새로운 섹션: Firebase 푸시 알림 설정

**Firebase 설정 완료 상태**:
```
┌─────────────────────────────────────────────┐
│ Firebase 푸시 알림 설정                      │
├─────────────────────────────────────────────┤
│ ✓ Firebase 설정 완료                         │
│ 프로젝트 ID: your-project-id          [제거] │
│                                              │
│ 푸시 알림이 활성화되었습니다. 푸시 알림 탭  │
│ 에서 알림을 전송할 수 있습니다.            │
└─────────────────────────────────────────────┘
```

**Firebase 미설정 상태**:
```
┌─────────────────────────────────────────────┐
│ Firebase 푸시 알림 설정                      │
├─────────────────────────────────────────────┤
│ Firebase 설정이 필요합니다                   │
│                                              │
│ 실제 푸시 알림을 전송하려면 Firebase        │
│ 서비스 계정 키를 업로드해주세요.           │
│                                              │
│           [Firebase JSON 업로드]             │
│ Firebase Console에서 다운로드한 서비스      │
│ 계정 키 JSON 파일을 업로드하세요.          │
└─────────────────────────────────────────────┘
```

---

## 🔧 백엔드 아키텍처 변경

### Push Service (pushService.js)

**이전 구조**:
```javascript
// 전역 Firebase 인스턴스
let firebaseApp = null;

const sendPushNotification = async (tokens, title, message) => {
  // 모든 프로젝트에 동일한 Firebase 사용
}
```

**현재 구조**:
```javascript
// 프로젝트별 Firebase 인스턴스 저장
const firebaseApps = new Map();

const sendPushNotification = async (projectId, tokens, title, message) => {
  // 프로젝트별 Firebase 인스턴스 가져오기
  const app = await getFirebaseApp(projectId);
  // 해당 프로젝트의 Firebase 사용
}
```

**주요 개선사항**:
1. 여러 Firebase 앱 동시 관리
2. 프로젝트별 독립적인 인증
3. 데이터베이스에서 동적으로 설정 로드
4. 자동 초기화 및 캐싱

### Android Builder (androidBuilder.js)

**추가된 기능**:
```javascript
// 사용자 앱 아이콘 복사
if (project.app_icon) {
  // 모든 해상도 디렉토리에 복사
  ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].forEach(dir => {
    copyFile(iconPath, `mipmap-${dir}/ic_launcher.png`);
  });
}

// 사용자 스플래시 이미지 복사
if (project.splash_image && project.splash_enabled) {
  copyFile(splashPath, 'drawable/splash.png');
}
```

---

## 📱 사용자 가이드

### Firebase 푸시 알림 설정 방법

#### 1단계: Firebase 콘솔에서 설정

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com
   ```

2. **새 프로젝트 생성**
   - "프로젝트 추가" 클릭
   - 프로젝트 이름 입력
   - Google 애널리틱스 설정 (선택사항)

3. **서비스 계정 키 생성**
   - 프로젝트 설정 ⚙️ > 서비스 계정
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드
   - 안전한 곳에 보관

#### 2단계: CodeLog에서 업로드

1. **프로젝트 상세 페이지 이동**
   - 대시보드 > 프로젝트 선택

2. **설정 탭 클릭**
   - 상단 탭 메뉴에서 "설정" 선택

3. **Firebase 설정 섹션**
   - "Firebase JSON 업로드" 버튼 클릭
   - 다운로드한 JSON 파일 선택
   - 업로드 완료 대기

4. **설정 확인**
   - ✓ Firebase 설정 완료 표시 확인
   - 프로젝트 ID 표시 확인

#### 3단계: 푸시 알림 전송

1. **푸시 알림 탭 이동**
   - 상단 탭 메뉴에서 "푸시 알림" 선택

2. **알림 작성**
   - 제목 입력
   - 메시지 입력

3. **전송**
   - "알림 전송" 버튼 클릭
   - 전송 결과 확인

---

## 🔒 보안 고려사항

### Firebase 비공개 키 저장

**현재 구현**:
- 데이터베이스에 TEXT 형식으로 저장
- MySQL 연결 자체가 암호화되어야 함

**권장 사항** (향후 개선):
```javascript
// 비공개 키 암호화 저장
const encryptedKey = encrypt(privateKey, process.env.ENCRYPTION_KEY);
await db.execute(
  'UPDATE projects SET firebase_private_key = ? WHERE id = ?',
  [encryptedKey, projectId]
);

// 복호화 후 사용
const decryptedKey = decrypt(project.firebase_private_key, process.env.ENCRYPTION_KEY);
```

### 접근 제어

**모든 엔드포인트에 구현된 보안**:
```javascript
// 프로젝트 소유권 확인
const [projects] = await db.execute(
  'SELECT * FROM projects WHERE id = ? AND user_id = ?',
  [projectId, req.user.id]
);

if (projects.length === 0) {
  return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
}
```

---

## 🧪 테스트 시나리오

### Firebase 업로드 테스트

```bash
# 1. 프로젝트 생성
POST /api/projects
{
  "project_name": "Test Project",
  "app_name": "Test App",
  "package_name": "com.test.app",
  "project_type": "url",
  "website_url": "https://example.com"
}

# 2. Firebase 설정 업로드
POST /api/projects/1/firebase-config
{
  "firebase_config": {
    "project_id": "test-project-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...",
    "client_email": "firebase-adminsdk@test.iam.gserviceaccount.com"
  }
}

# 3. 프로젝트 조회 (Firebase 설정 확인)
GET /api/projects/1

# 4. 푸시 알림 전송 (실제 전송)
POST /api/projects/1/push
{
  "title": "Test Notification",
  "message": "This is a test"
}

# 5. Firebase 설정 제거
DELETE /api/projects/1/firebase-config

# 6. 푸시 알림 전송 (데모 모드)
POST /api/projects/1/push
{
  "title": "Demo Notification",
  "message": "This is a demo"
}
```

### 사용자 맞춤형 빌드 테스트

```bash
# 1. 앱 아이콘 업로드
POST /api/upload/1/icon
Content-Type: multipart/form-data
[icon.png file]

# 2. 스플래시 이미지 업로드
POST /api/upload/1/splash
Content-Type: multipart/form-data
[splash.png file]

# 3. 테마 색상 설정
PUT /api/projects/1/settings
{
  "theme_color": "#FF6600"
}

# 4. 빌드 시작
POST /api/projects/1/builds
{
  "build_type": "apk"
}

# 5. 빌드 상태 확인
GET /api/projects/1/builds/1

# 6. APK 다운로드 (빌드 완료 후)
# APK 파일에는 사용자가 업로드한 아이콘, 스플래시, 테마 색상이 적용됨
```

---

## 📝 마이그레이션 체크리스트

기존 CodeLog 시스템을 업그레이드하는 경우:

- [ ] 데이터베이스 백업
- [ ] 마이그레이션 스크립트 실행
- [ ] 백엔드 코드 업데이트
- [ ] 프론트엔드 코드 업데이트
- [ ] Docker 이미지 재빌드
- [ ] 서비스 재시작
- [ ] Firebase 설정 테스트
- [ ] 빌드 기능 테스트
- [ ] 기존 프로젝트 확인

---

## 🚀 배포 후 확인사항

### 1. 데이터베이스 확인

```sql
-- 새 필드 추가 확인
DESCRIBE projects;

-- Firebase 설정이 있는 프로젝트 확인
SELECT id, project_name, firebase_config_uploaded FROM projects;
```

### 2. API 엔드포인트 확인

```bash
# Health check
curl http://localhost/api/health

# Firebase 업로드 엔드포인트 확인
curl -X POST http://localhost/api/projects/1/firebase-config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firebase_config": {...}}'
```

### 3. 프론트엔드 확인

- [ ] 프로젝트 설정 페이지에 Firebase 섹션 표시
- [ ] JSON 파일 업로드 기능 작동
- [ ] Firebase 설정 상태 표시
- [ ] 푸시 알림 데모/실제 모드 구분

---

## 🔄 기존 시스템과의 호환성

### 환경 변수 방식 (더 이상 사용 안 함)

**이전 .env 파일**:
```env
FIREBASE_PROJECT_ID=global-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@global.iam.gserviceaccount.com
```

**현재 시스템**:
- 환경 변수 방식 완전 제거
- 모든 Firebase 설정은 데이터베이스에 저장
- 프로젝트별로 독립적으로 관리

### 기존 프로젝트 처리

```javascript
// 기존 프로젝트는 firebase_config_uploaded = FALSE
// 푸시 알림 전송 시 자동으로 데모 모드로 작동
if (!project.firebase_config_uploaded) {
  return {
    demo: true,
    message: 'Please upload Firebase configuration'
  };
}
```

---

## 💡 추가 개선 아이디어 (향후)

1. **Firebase 설정 검증**
   - 업로드 시 Firebase 연결 테스트
   - 유효하지 않은 설정 거부

2. **암호화 강화**
   - 비공개 키 AES-256 암호화
   - 환경 변수로 암호화 키 관리

3. **Firebase 사용량 모니터링**
   - 프로젝트별 푸시 알림 전송 횟수 추적
   - 할당량 경고 기능

4. **다중 Firebase 앱 지원**
   - iOS용 별도 Firebase 설정
   - Android/iOS 구분 관리

5. **Firebase Storage 통합**
   - 이미지 파일을 Firebase Storage에 저장
   - CDN 효과로 성능 향상

---

## 📞 지원

문제가 발생하면:
1. GitHub Issues: [Repository URL]
2. 로그 확인: `docker compose logs -f backend`
3. 데이터베이스 확인: 마이그레이션 정상 실행 여부

---

**Made with ❤️ by Logs0**

버전: CodeLog v1.2
날짜: 2025-10-13
