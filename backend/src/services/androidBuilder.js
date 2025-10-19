const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const archiver = require('archiver');
const db = require('../config/database');

const execAsync = promisify(exec);

/**
 * Android 앱 빌드 서비스 - 실제 구현
 */

const buildAndroidApp = async (buildId, project, buildType) => {
  const buildDir = path.join(__dirname, '../../android-builds', `build-${buildId}`);
  let buildLog = '';

  const log = (message) => {
    buildLog += `[${new Date().toISOString()}] ${message}\n`;
    console.log(message);
  };

  try {
    log('Starting Android build process...');

    // Update build status to building
    await db.execute(
      'UPDATE builds SET build_status = ?, build_log = ? WHERE id = ?',
      ['building', buildLog, buildId]
    );

    // Create build directory
    await fs.mkdir(buildDir, { recursive: true });
    log(`Build directory created: ${buildDir}`);

    // Generate Android project structure
    log('Generating Android project structure...');
    await generateAndroidProject(buildDir, project, log);

    // Generate Gradle wrapper
    log('Setting up Gradle wrapper...');
    await setupGradleWrapper(buildDir, log);

    // Build APK or AAB
    log(`Starting ${buildType.toUpperCase()} build...`);
    let buildOutput;
    if (buildType === 'apk') {
      buildOutput = await buildAPK(buildDir, log);
    } else {
      buildOutput = await buildAAB(buildDir, log);
    }

    log('Build completed successfully!');

    // Update build record with success
    await db.execute(
      'UPDATE builds SET build_status = ?, build_file = ?, build_log = ?, completed_at = NOW() WHERE id = ?',
      ['success', buildOutput, buildLog, buildId]
    );

    log(`Build output: ${buildOutput}`);
  } catch (error) {
    log(`Build failed: ${error.message}`);
    console.error(`Build ${buildId} failed:`, error);

    // Update build record with failure
    await db.execute(
      'UPDATE builds SET build_status = ?, build_log = ?, completed_at = NOW() WHERE id = ?',
      ['failed', buildLog + '\nError: ' + error.message, buildId]
    );
  }
};

const generateAndroidProject = async (buildDir, project, log) => {
  // Create Android project structure
  const dirs = [
    'app/src/main/java',
    'app/src/main/res/values',
    'app/src/main/res/layout',
    'app/src/main/res/drawable',
    'app/src/main/res/mipmap-hdpi',
    'app/src/main/res/mipmap-mdpi',
    'app/src/main/res/mipmap-xhdpi',
    'app/src/main/res/mipmap-xxhdpi',
    'app/src/main/res/mipmap-xxxhdpi',
    'app/src/main/assets',
    'gradle/wrapper'
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(buildDir, dir), { recursive: true });
  }

  log('Directory structure created');

  // Generate AndroidManifest.xml
  const manifest = generateManifest(project);
  await fs.writeFile(path.join(buildDir, 'app/src/main/AndroidManifest.xml'), manifest);
  log('AndroidManifest.xml generated');

  // Generate build.gradle (project level)
  const projectGradle = generateProjectGradle();
  await fs.writeFile(path.join(buildDir, 'build.gradle'), projectGradle);
  log('Project build.gradle generated');

  // Generate build.gradle (app level)
  const appGradle = generateAppGradle(project);
  await fs.writeFile(path.join(buildDir, 'app/build.gradle'), appGradle);
  log('App build.gradle generated');

  // Generate settings.gradle
  const settingsGradle = `rootProject.name = "${project.app_name}"\ninclude ':app'\n`;
  await fs.writeFile(path.join(buildDir, 'settings.gradle'), settingsGradle);
  log('settings.gradle generated');

  // Generate gradle.properties
  const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
android.useAndroidX=true
android.enableJetifier=true
`;
  await fs.writeFile(path.join(buildDir, 'gradle.properties'), gradleProperties);
  log('gradle.properties generated');

  // Generate MainActivity.java
  const mainActivity = generateMainActivity(project);
  const javaPackagePath = project.package_name.replace(/\./g, '/');
  await fs.mkdir(path.join(buildDir, 'app/src/main/java', javaPackagePath), { recursive: true });
  await fs.writeFile(
    path.join(buildDir, 'app/src/main/java', javaPackagePath, 'MainActivity.java'),
    mainActivity
  );
  log('MainActivity.java generated');

  // Generate strings.xml
  const strings = generateStrings(project);
  await fs.writeFile(path.join(buildDir, 'app/src/main/res/values/strings.xml'), strings);
  log('strings.xml generated');

  // Generate colors.xml
  const colors = generateColors(project);
  await fs.writeFile(path.join(buildDir, 'app/src/main/res/values/colors.xml'), colors);
  log('colors.xml generated');

  // Generate activity_main.xml
  const layout = generateLayout(project);
  await fs.writeFile(path.join(buildDir, 'app/src/main/res/layout/activity_main.xml'), layout);
  log('activity_main.xml generated');

  // Copy app icon (if exists)
  if (project.app_icon) {
    try {
      const iconPath = path.join(__dirname, '../../', project.app_icon);
      const iconExists = await fs.access(iconPath).then(() => true).catch(() => false);
      if (iconExists) {
        // Copy to all mipmap directories
        const mipmapDirs = ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        for (const dir of mipmapDirs) {
          await fs.copyFile(
            iconPath,
            path.join(buildDir, `app/src/main/res/mipmap-${dir}/ic_launcher.png`)
          );
        }
        log('App icon copied to all mipmap directories');
      }
    } catch (err) {
      log('Warning: Could not copy app icon: ' + err.message);
    }
  }

  // Copy splash screen (if exists)
  if (project.splash_image && project.splash_enabled) {
    try {
      const splashPath = path.join(__dirname, '../../', project.splash_image);
      const splashExists = await fs.access(splashPath).then(() => true).catch(() => false);
      if (splashExists) {
        await fs.copyFile(
          splashPath,
          path.join(buildDir, 'app/src/main/res/drawable/splash.png')
        );
        log('Splash image copied');
      }
    } catch (err) {
      log('Warning: Could not copy splash image: ' + err.message);
    }
  }

  // Generate template HTML for template projects
  if (project.project_type === 'template') {
    try {
      log('Generating template HTML for template project...');
      await generateTemplateAssets(buildDir, project, log);
      log('Template HTML generation complete');
    } catch (err) {
      log('Warning: Could not generate template assets: ' + err.message);
    }
  }

  log('Android project generation complete');
};

const setupGradleWrapper = async (buildDir, log) => {
  // Generate gradle-wrapper.properties
  const wrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.0-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
  await fs.writeFile(
    path.join(buildDir, 'gradle/wrapper/gradle-wrapper.properties'),
    wrapperProperties
  );

  // Note: In real production, you would download gradlew and gradle-wrapper.jar
  // For now, we'll assume Gradle is installed globally
  log('Gradle wrapper configured');
};

const generateProjectGradle = () => {
  return `// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`;
};

const generateAppGradle = (project) => {
  return `plugins {
    id 'com.android.application'
}

android {
    namespace '${project.package_name}'
    compileSdk 34

    defaultConfig {
        applicationId "${project.package_name}"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}
`;
};

const generateManifest = (project) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${project.package_name}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
};

const generateMainActivity = (project) => {
  return `package ${project.package_name};

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

        // WebView settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(false);
        webSettings.setDefaultTextEncodingName("utf-8");

        // Set WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        // Load URL
        ${project.project_type === 'url' ?
          `webView.loadUrl("${project.website_url}");` :
          'webView.loadUrl("file:///android_asset/index.html");'}
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}`;
};

const generateStrings = (project) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${project.app_name}</string>
</resources>`;
};

const generateColors = (project) => {
  const themeColor = project.theme_color || '#FF6600';
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">${themeColor}</color>
    <color name="colorPrimaryDark">${themeColor}</color>
    <color name="colorAccent">${themeColor}</color>
</resources>`;
};

const generateLayout = (project) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
</RelativeLayout>`;
};

const buildAPK = async (buildDir, log) => {
  try {
    // Check if Gradle is installed
    try {
      const { stdout } = await execAsync('gradle --version');
      log('Gradle version: ' + stdout.split('\n')[0]);
    } catch (e) {
      throw new Error('Gradle is not installed. Please install Gradle to build APKs.');
    }

    // Build using Gradle
    log('Running Gradle assembleRelease...');
    const { stdout, stderr } = await execAsync(
      `cd "${buildDir}" && gradle assembleRelease`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 300000 } // 5 minutes timeout
    );

    if (stdout) log('Gradle output: ' + stdout);
    if (stderr) log('Gradle stderr: ' + stderr);

    // APK 파일 경로
    const apkPath = path.join(buildDir, 'app/build/outputs/apk/release/app-release.apk');

    // Check if APK was created
    try {
      await fs.access(apkPath);
      log('APK built successfully: ' + apkPath);
      return apkPath;
    } catch (e) {
      throw new Error('APK file was not generated. Build may have failed.');
    }
  } catch (error) {
    log('Build error: ' + error.message);
    log('Full error stack: ' + error.stack);

    // Do NOT create demo APK - throw error to indicate build failure
    throw new Error('APK build failed: ' + error.message +
      '\n\nPlease ensure Gradle, Android SDK, and JDK are properly installed on the server.' +
      '\nRefer to Android_빌드_설정_가이드.txt for installation instructions.');
  }
};

const buildAAB = async (buildDir, log) => {
  try {
    // Check if Gradle is installed
    try {
      const { stdout } = await execAsync('gradle --version');
      log('Gradle version: ' + stdout.split('\n')[0]);
    } catch (e) {
      throw new Error('Gradle is not installed. Please install Gradle to build AABs.');
    }

    // Build using Gradle
    log('Running Gradle bundleRelease...');
    const { stdout, stderr } = await execAsync(
      `cd "${buildDir}" && gradle bundleRelease`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }
    );

    if (stdout) log('Gradle output: ' + stdout);
    if (stderr) log('Gradle stderr: ' + stderr);

    // AAB 파일 경로
    const aabPath = path.join(buildDir, 'app/build/outputs/bundle/release/app-release.aab');

    // Check if AAB was created
    try {
      await fs.access(aabPath);
      log('AAB built successfully: ' + aabPath);
      return aabPath;
    } catch (e) {
      throw new Error('AAB file was not generated. Build may have failed.');
    }
  } catch (error) {
    log('Build error: ' + error.message);
    log('Full error stack: ' + error.stack);

    // Do NOT create demo AAB - throw error to indicate build failure
    throw new Error('AAB build failed: ' + error.message +
      '\n\nPlease ensure Gradle, Android SDK, and JDK are properly installed on the server.' +
      '\nRefer to Android_빌드_설정_가이드.txt for installation instructions.');
  }
};

const generateTemplateAssets = async (buildDir, project, log) => {
  try {
    // Get template pages from database
    const [templatePages] = await db.execute(
      'SELECT * FROM template_pages WHERE project_id = ? ORDER BY page_type',
      [project.id]
    );

    log(`Found ${templatePages.length} template pages`);

    // Generate index.html
    const indexHtml = generateTemplateIndexHtml(project, templatePages);
    await fs.writeFile(
      path.join(buildDir, 'app/src/main/assets/index.html'),
      indexHtml
    );
    log('index.html generated in assets folder');

    // Generate CSS
    const cssContent = generateTemplateCSS(project);
    await fs.writeFile(
      path.join(buildDir, 'app/src/main/assets/style.css'),
      cssContent
    );
    log('style.css generated in assets folder');

    // Generate JavaScript
    const jsContent = generateTemplateJS(project, templatePages);
    await fs.writeFile(
      path.join(buildDir, 'app/src/main/assets/app.js'),
      jsContent
    );
    log('app.js generated in assets folder');

  } catch (error) {
    log('Error generating template assets: ' + error.message);
    throw error;
  }
};

const generateTemplateIndexHtml = (project, templatePages) => {
  const themeColor = project.theme_color || '#FF6600';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.app_name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <!-- Navigation -->
        ${project.bottom_tab_enabled ? generateBottomTabNavigation(project) : ''}

        <!-- Page Container -->
        <div id="page-container">
            ${templatePages.map(page => generatePageHtml(page)).join('\n')}
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>`;
};

const generateBottomTabNavigation = (project) => {
  return `<nav class="bottom-nav">
        <button class="nav-item active" data-page="splash">홈</button>
        <button class="nav-item" data-page="login">로그인</button>
        <button class="nav-item" data-page="board">게시판</button>
        <button class="nav-item" data-page="mypage">마이페이지</button>
    </nav>`;
};

const generatePageHtml = (page) => {
  const pageType = page.page_type;
  const activeClass = pageType === 'splash' ? 'active' : '';

  switch (pageType) {
    case 'splash':
      return `<div class="page ${activeClass}" id="page-splash">
        <div class="splash-container">
            <h1>${page.title || '환영합니다'}</h1>
            <p>${page.content || ''}</p>
        </div>
    </div>`;

    case 'login':
      return `<div class="page" id="page-login">
        <div class="form-container">
            <h2>로그인</h2>
            <form id="login-form">
                <input type="text" placeholder="아이디" required>
                <input type="password" placeholder="비밀번호" required>
                <button type="submit">로그인</button>
            </form>
            <p><a href="#" data-page="register">회원가입</a></p>
        </div>
    </div>`;

    case 'register':
      return `<div class="page" id="page-register">
        <div class="form-container">
            <h2>회원가입</h2>
            <form id="register-form">
                <input type="text" placeholder="아이디" required>
                <input type="password" placeholder="비밀번호" required>
                <input type="password" placeholder="비밀번호 확인" required>
                <input type="email" placeholder="이메일" required>
                <button type="submit">가입하기</button>
            </form>
        </div>
    </div>`;

    case 'board':
      return `<div class="page" id="page-board">
        <div class="board-container">
            <h2>게시판</h2>
            <div class="board-list">
                <div class="board-item">
                    <h3>게시글 제목 1</h3>
                    <p>게시글 내용 미리보기...</p>
                </div>
                <div class="board-item">
                    <h3>게시글 제목 2</h3>
                    <p>게시글 내용 미리보기...</p>
                </div>
            </div>
        </div>
    </div>`;

    case 'mypage':
      return `<div class="page" id="page-mypage">
        <div class="mypage-container">
            <h2>마이페이지</h2>
            <div class="profile">
                <div class="profile-image"></div>
                <p>사용자 이름</p>
            </div>
            <div class="menu-list">
                <div class="menu-item">프로필 수정</div>
                <div class="menu-item">설정</div>
                <div class="menu-item">로그아웃</div>
            </div>
        </div>
    </div>`;

    default:
      return `<div class="page" id="page-${pageType}">
        <h2>${page.title || pageType}</h2>
        <p>${page.content || ''}</p>
    </div>`;
  }
};

const generateTemplateCSS = (project) => {
  const themeColor = project.theme_color || '#FF6600';

  return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: #f5f5f5;
}

#app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

#page-container {
    flex: 1;
    position: relative;
    padding-bottom: ${project.bottom_tab_enabled ? '60px' : '0'};
}

.page {
    display: none;
    padding: 20px;
    min-height: 100vh;
}

.page.active {
    display: block;
}

/* Splash Page */
.splash-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    text-align: center;
}

.splash-container h1 {
    font-size: 2.5rem;
    color: ${themeColor};
    margin-bottom: 1rem;
}

/* Form Styles */
.form-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 30px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.form-container h2 {
    text-align: center;
    color: ${themeColor};
    margin-bottom: 30px;
}

.form-container input {
    width: 100%;
    padding: 12px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 16px;
}

.form-container button {
    width: 100%;
    padding: 12px;
    background: ${themeColor};
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
}

.form-container a {
    color: ${themeColor};
    text-decoration: none;
}

/* Board */
.board-container {
    max-width: 800px;
    margin: 0 auto;
}

.board-container h2 {
    color: ${themeColor};
    margin-bottom: 20px;
}

.board-item {
    background: white;
    padding: 20px;
    margin-bottom: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.board-item h3 {
    margin-bottom: 10px;
    color: #333;
}

/* My Page */
.mypage-container {
    max-width: 600px;
    margin: 0 auto;
}

.profile {
    text-align: center;
    padding: 40px;
    background: white;
    border-radius: 10px;
    margin-bottom: 20px;
}

.profile-image {
    width: 100px;
    height: 100px;
    background: ${themeColor};
    border-radius: 50%;
    margin: 0 auto 20px;
}

.menu-list {
    background: white;
    border-radius: 10px;
    overflow: hidden;
}

.menu-item {
    padding: 20px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.menu-item:last-child {
    border-bottom: none;
}

/* Bottom Navigation */
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    background: white;
    border-top: 1px solid #eee;
    padding: 10px 0;
    z-index: 1000;
}

.nav-item {
    flex: 1;
    padding: 10px;
    border: none;
    background: none;
    color: #999;
    font-size: 14px;
    cursor: pointer;
}

.nav-item.active {
    color: ${themeColor};
    font-weight: bold;
}`;
};

const generateTemplateJS = (project, templatePages) => {
  return `// Page Navigation
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.dataset.page;
            showPage(pageId);

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Handle links
    document.addEventListener('click', function(e) {
        if (e.target.matches('a[data-page]')) {
            e.preventDefault();
            const pageId = e.target.dataset.page;
            showPage(pageId);
        }
    });

    // Form handlers
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('로그인 기능은 백엔드 연동이 필요합니다');
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('회원가입 기능은 백엔드 연동이 필요합니다');
        });
    }
});

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}`;
};

module.exports = {
  buildAndroidApp
};
