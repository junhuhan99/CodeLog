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

module.exports = {
  buildAndroidApp
};
