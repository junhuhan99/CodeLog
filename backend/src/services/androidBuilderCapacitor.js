const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const db = require('../config/database');

const execAsync = promisify(exec);

/**
 * Capacitor 기반 Android 앱 빌드 서비스
 * Android Studio 공식 방법 사용
 */

/**
 * 빌드 환경 검증
 */
const validateBuildEnvironment = async (log) => {
  const errors = [];

  // Check Node.js
  try {
    const { stdout } = await execAsync('node --version');
    log(`✓ Node.js: ${stdout.trim()}`);
  } catch (error) {
    errors.push('Node.js is not installed or not in PATH');
  }

  // Check npm
  try {
    const { stdout } = await execAsync('npm --version');
    log(`✓ npm: ${stdout.trim()}`);
  } catch (error) {
    errors.push('npm is not installed or not in PATH');
  }

  // Check Java
  try {
    const { stdout } = await execAsync('java --version');
    const version = stdout.split('\n')[0];
    log(`✓ Java: ${version}`);
  } catch (error) {
    errors.push('Java JDK is not installed or not in PATH. JDK 17 or higher is required.');
  }

  // Check ANDROID_HOME
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    errors.push('ANDROID_HOME or ANDROID_SDK_ROOT environment variable is not set');
  } else {
    log(`✓ ANDROID_HOME: ${androidHome}`);

    // Check if Android SDK exists
    try {
      await fs.access(androidHome);
      log('✓ Android SDK directory exists');
    } catch {
      errors.push(`Android SDK directory not found at ${androidHome}`);
    }
  }

  // Check Gradle (optional - Capacitor includes gradle wrapper)
  try {
    const { stdout } = await execAsync('gradle --version');
    const version = stdout.split('\n')[0];
    log(`✓ Gradle: ${version}`);
  } catch (error) {
    log('⚠ Gradle not found in PATH (will use Capacitor gradle wrapper)');
  }

  if (errors.length > 0) {
    const errorMessage = 'Build environment validation failed:\n' + errors.map(e => `  - ${e}`).join('\n') +
      '\n\nPlease refer to Android_빌드_설정_가이드.txt for installation instructions.';
    throw new Error(errorMessage);
  }

  log('✓ Build environment validation passed');
};

const buildAndroidApp = async (buildId, project, buildType) => {
  const buildDir = path.join(__dirname, '../../android-builds', `build-${buildId}`);
  let buildLog = '';

  const log = (message) => {
    buildLog += `[${new Date().toISOString()}] ${message}\n`;
    console.log(message);
  };

  try {
    log('Starting Capacitor-based Android build process...');

    // Validate build environment
    log('Checking build environment...');
    await validateBuildEnvironment(log);

    // Update build status to building
    await db.execute(
      'UPDATE builds SET build_status = ?, build_log = ? WHERE id = ?',
      ['building', buildLog, buildId]
    );

    // Create build directory
    await fs.mkdir(buildDir, { recursive: true });
    log(`Build directory created: ${buildDir}`);

    // 1. Create web app structure
    log('Creating web app structure...');
    await createWebApp(buildDir, project, log);

    // 2. Initialize Capacitor
    log('Initializing Capacitor...');
    await initializeCapacitor(buildDir, project, log);

    // 3. Add Android platform
    log('Adding Android platform...');
    await addAndroidPlatform(buildDir, log);

    // 4. Sync web assets to Android
    log('Syncing web assets...');
    await syncCapacitor(buildDir, log);

    // 5. Configure Android permissions and settings
    log('Configuring Android manifest and permissions...');
    await configureAndroidManifest(buildDir, project, log);

    // 6. Build Android app
    log(`Building ${buildType.toUpperCase()}...`);
    let buildOutput;
    if (buildType === 'apk') {
      buildOutput = await buildAPK(buildDir, project, log);
    } else {
      buildOutput = await buildAAB(buildDir, project, log);
    }

    log('Build completed successfully!');

    // Copy build file to permanent location
    const finalPath = path.join(__dirname, '../../android-builds', `${project.app_name}_${buildId}.${buildType}`);
    await fs.copyFile(buildOutput, finalPath);
    log(`Build file saved: ${finalPath}`);

    // Update build record with success
    await db.execute(
      'UPDATE builds SET build_status = ?, build_file = ?, build_log = ?, completed_at = NOW() WHERE id = ?',
      ['success', `android-builds/${project.app_name}_${buildId}.${buildType}`, buildLog, buildId]
    );

    log(`Build output: ${finalPath}`);
  } catch (error) {
    log(`Build failed: ${error.message}`);
    console.error(`Build ${buildId} failed:`, error);

    // Update build record with failure
    await db.execute(
      'UPDATE builds SET build_status = ?, build_log = ?, completed_at = NOW() WHERE id = ?',
      ['failed', buildLog + '\nError: ' + error.message + '\n' + error.stack, buildId]
    );
  }
};

const createWebApp = async (buildDir, project, log) => {
  // Create www directory for web assets
  const wwwDir = path.join(buildDir, 'www');
  await fs.mkdir(wwwDir, { recursive: true });

  // Create index.html
  const html = generateHTML(project);
  await fs.writeFile(path.join(wwwDir, 'index.html'), html);
  log('index.html created');

  // Create CSS
  const css = generateCSS(project);
  await fs.writeFile(path.join(wwwDir, 'style.css'), css);
  log('style.css created');

  // Create JavaScript
  const js = generateJS(project);
  await fs.writeFile(path.join(wwwDir, 'app.js'), js);
  log('app.js created');

  // Copy icon if exists
  if (project.app_icon) {
    try {
      const iconPath = path.join(__dirname, '../../', project.app_icon);
      const iconExists = await fs.access(iconPath).then(() => true).catch(() => false);
      if (iconExists) {
        await fs.copyFile(iconPath, path.join(wwwDir, 'icon.png'));
        log('App icon copied');
      }
    } catch (err) {
      log('Warning: Could not copy app icon: ' + err.message);
    }
  }

  // Copy splash if exists
  if (project.splash_image && project.splash_enabled) {
    try {
      const splashPath = path.join(__dirname, '../../', project.splash_image);
      const splashExists = await fs.access(splashPath).then(() => true).catch(() => false);
      if (splashExists) {
        await fs.copyFile(splashPath, path.join(wwwDir, 'splash.png'));
        log('Splash image copied');
      }
    } catch (err) {
      log('Warning: Could not copy splash image: ' + err.message);
    }
  }

  log('Web app structure created');
};

const initializeCapacitor = async (buildDir, project, log) => {
  // Create package.json
  const packageJson = {
    name: project.package_name.split('.').pop(),
    version: '1.0.0',
    description: project.app_description || project.app_name,
    main: 'index.js',
    scripts: {
      'build': 'echo "Build complete"'
    },
    dependencies: {
      '@capacitor/core': '^5.5.0',
      '@capacitor/cli': '^5.5.0',
      '@capacitor/android': '^5.5.0'
    }
  };

  await fs.writeFile(
    path.join(buildDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  log('package.json created');

  // Install Capacitor dependencies
  log('Installing Capacitor dependencies...');
  try {
    const { stdout, stderr } = await execAsync(
      `cd "${buildDir}" && npm install --legacy-peer-deps`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }
    );
    if (stdout) log('npm install output: ' + stdout.substring(0, 500));
    if (stderr) log('npm install stderr: ' + stderr.substring(0, 500));
  } catch (error) {
    // If npm install fails, continue with demo build
    log('Warning: npm install failed, continuing with fallback method...');
    throw new Error('Capacitor dependencies installation failed. Please ensure Node.js and npm are installed.');
  }

  // Create capacitor.config.json with WebView settings
  const capacitorConfig = {
    appId: project.package_name,
    appName: project.app_name,
    webDir: 'www',
    bundledWebRuntime: false,
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: project.theme_color || '#ffffff',
        showSpinner: false
      }
    },
    android: {
      allowMixedContent: true,
      backgroundColor: project.theme_color || '#ffffff',
      // WebView settings for better compatibility
      webContentsDebuggingEnabled: true,
      overrideUserAgent: null,
      appendUserAgent: null,
      // Enable all necessary WebView features
      useLegacyBridge: false,
      // Keep all navigation within WebView
      allowNavigation: ['*']
    },
    server: {
      cleartext: true, // Allow HTTP connections
      androidScheme: 'https', // Use HTTPS scheme for local content
      // Allow all external URLs to load in WebView
      allowNavigation: ['*']
    }
  };

  await fs.writeFile(
    path.join(buildDir, 'capacitor.config.json'),
    JSON.stringify(capacitorConfig, null, 2)
  );
  log('capacitor.config.json created');
};

const addAndroidPlatform = async (buildDir, log) => {
  try {
    // Check if npx is available
    const { stdout } = await execAsync('npx --version');
    log('npx version: ' + stdout.trim());

    // Add Android platform using Capacitor
    log('Running: npx cap add android');
    const { stdout: addOutput, stderr: addError } = await execAsync(
      `cd "${buildDir}" && npx cap add android`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }
    );

    if (addOutput) log('Capacitor add output: ' + addOutput);
    if (addError) log('Capacitor add stderr: ' + addError);

    log('Android platform added successfully');
  } catch (error) {
    log('Error adding Android platform: ' + error.message);
    throw new Error('Failed to add Android platform. Please ensure Capacitor CLI is installed.');
  }
};

const syncCapacitor = async (buildDir, log) => {
  try {
    log('Running: npx cap sync android');
    const { stdout, stderr } = await execAsync(
      `cd "${buildDir}" && npx cap sync android`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }
    );

    if (stdout) log('Capacitor sync output: ' + stdout);
    if (stderr) log('Capacitor sync stderr: ' + stderr);

    log('Capacitor sync completed');
  } catch (error) {
    log('Error syncing Capacitor: ' + error.message);
    throw new Error('Failed to sync Capacitor. Build cannot continue.');
  }
};

const configureAndroidManifest = async (buildDir, project, log) => {
  try {
    const manifestPath = path.join(buildDir, 'android/app/src/main/AndroidManifest.xml');

    // Read AndroidManifest.xml
    let manifestContent = await fs.readFile(manifestPath, 'utf8');

    // Check if INTERNET permission already exists
    if (!manifestContent.includes('android.permission.INTERNET')) {
      // Add INTERNET permission after <manifest> tag
      manifestContent = manifestContent.replace(
        /<manifest([^>]*)>/,
        '<manifest$1>\n    <uses-permission android:name="android.permission.INTERNET" />'
      );
      log('✓ Added INTERNET permission');
    } else {
      log('✓ INTERNET permission already exists');
    }

    // Check if ACCESS_NETWORK_STATE permission exists
    if (!manifestContent.includes('android.permission.ACCESS_NETWORK_STATE')) {
      manifestContent = manifestContent.replace(
        /<manifest([^>]*)>/,
        '<manifest$1>\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />'
      );
      log('✓ Added ACCESS_NETWORK_STATE permission');
    }

    // Enable cleartext traffic for HTTP (add usesCleartextTraffic to application tag)
    if (!manifestContent.includes('android:usesCleartextTraffic')) {
      manifestContent = manifestContent.replace(
        /<application([^>]*)>/,
        '<application$1 android:usesCleartextTraffic="true">'
      );
      log('✓ Enabled cleartext traffic (HTTP support)');
    }

    // Write modified manifest back
    await fs.writeFile(manifestPath, manifestContent, 'utf8');
    log('✓ AndroidManifest.xml configured successfully');

    // Configure MainActivity to keep all URLs in WebView
    await configureMainActivity(buildDir, project, log);

  } catch (error) {
    log('Warning: Failed to configure AndroidManifest.xml: ' + error.message);
    // Don't throw error - continue with build even if manifest modification fails
  }
};

const configureMainActivity = async (buildDir, project, log) => {
  try {
    // Convert package name to directory path (e.g. com.hello.app -> com/hello/app)
    const packagePath = project.package_name.replace(/\./g, '/');
    const mainActivityPath = path.join(buildDir, `android/app/src/main/java/${packagePath}/MainActivity.java`);

    // Check if MainActivity exists
    try {
      await fs.access(mainActivityPath);
    } catch {
      log('MainActivity.java not found, will be created by Capacitor');
      return;
    }

    // Read MainActivity
    let activityContent = await fs.readFile(mainActivityPath, 'utf8');

    // Check if already configured
    if (activityContent.includes('shouldOverrideUrlLoading')) {
      log('✓ MainActivity already configured for WebView');
      return;
    }

    // Add necessary imports if not present
    if (!activityContent.includes('import android.os.Bundle')) {
      activityContent = activityContent.replace(
        /^(package .+;)/m,
        '$1\n\nimport android.os.Bundle;'
      );
    }
    if (!activityContent.includes('import android.webkit.WebView')) {
      activityContent = activityContent.replace(
        /^(import android\.os\.Bundle;)/m,
        '$1\nimport android.webkit.WebView;\nimport android.webkit.WebViewClient;\nimport android.webkit.WebResourceRequest;'
      );
    }

    // Add WebView configuration
    const webViewConfig = `
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure WebView to keep all URLs within the app
        this.bridge.getWebView().setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Load all URLs in WebView instead of external browser
                view.loadUrl(url);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Load all URLs in WebView instead of external browser
                view.loadUrl(request.getUrl().toString());
                return true;
            }
        });
    }`;

    // Insert before the closing brace of the class
    activityContent = activityContent.replace(
      /(\s*)(}\s*)$/,
      `$1${webViewConfig}\n$1$2`
    );

    await fs.writeFile(mainActivityPath, activityContent, 'utf8');
    log('✓ MainActivity configured to keep URLs in WebView');

  } catch (error) {
    log('Warning: Failed to configure MainActivity: ' + error.message);
    // Don't throw error - continue with build
  }
};

const buildAPK = async (buildDir, project, log) => {
  const androidDir = path.join(buildDir, 'android');

  // Verify Gradle wrapper exists
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'gradlew.bat' : 'gradlew';
  const gradlewPath = path.join(androidDir, gradlewCmd);

  try {
    await fs.access(gradlewPath);
    log('Gradle wrapper found: ' + gradlewPath);
  } catch {
    throw new Error('Gradle wrapper not found. Capacitor initialization may have failed.');
  }

  try {
    // Make gradlew executable (Unix)
    if (!isWindows) {
      await execAsync(`chmod +x "${gradlewPath}"`);
      log('Made gradlew executable');
    }

    // Build APK using Gradle
    // Use assembleDebug to auto-sign with debug keystore (works without manual keystore setup)
    log('Building APK with Gradle (this may take 5-10 minutes)...');

    const gradlewFullCmd = isWindows ? `"${gradlewPath}"` : `"${gradlewPath}"`;
    const { stdout, stderr } = await execAsync(
      `cd "${androidDir}" && ${gradlewFullCmd} assembleDebug --no-daemon`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 600000 } // 10 minutes timeout
    );

    if (stdout) log('Gradle output: ' + stdout.substring(Math.max(0, stdout.length - 1000)));
    if (stderr) log('Gradle stderr: ' + stderr.substring(Math.max(0, stderr.length - 1000)));

    // Find the APK file (debug builds are automatically signed)
    const apkPath = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
    const apkPathSigned = null; // Debug build is already signed

    // Check if APK file exists (debug builds are already signed)
    let finalApkPath = null;
    try {
      await fs.access(apkPath);
      finalApkPath = apkPath;
      log('Found debug APK (auto-signed): ' + apkPath);
    } catch {
      throw new Error('APK file was not generated. Check build logs for errors.');
    }

    // Verify APK is valid (check file size)
    const stats = await fs.stat(finalApkPath);
    if (stats.size < 1024 * 100) { // Less than 100KB is suspicious
      throw new Error(`APK file is too small (${stats.size} bytes). Build may have failed.`);
    }

    log(`APK built successfully: ${finalApkPath} (${Math.round(stats.size / 1024 / 1024 * 10) / 10}MB)`);
    return finalApkPath;
  } catch (error) {
    log('Build error: ' + error.message);
    log('Full error: ' + error.stack);
    throw new Error('APK build failed: ' + error.message + '\n\nPlease ensure Android SDK, Gradle, and JDK are properly installed on the server.');
  }
};

const buildAAB = async (buildDir, project, log) => {
  const androidDir = path.join(buildDir, 'android');

  // Verify Gradle wrapper exists
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'gradlew.bat' : 'gradlew';
  const gradlewPath = path.join(androidDir, gradlewCmd);

  try {
    await fs.access(gradlewPath);
    log('Gradle wrapper found: ' + gradlewPath);
  } catch {
    throw new Error('Gradle wrapper not found. Capacitor initialization may have failed.');
  }

  try {
    // Make gradlew executable (Unix)
    if (!isWindows) {
      await execAsync(`chmod +x "${gradlewPath}"`);
      log('Made gradlew executable');
    }

    // Build AAB using Gradle
    log('Building AAB with Gradle (this may take 5-10 minutes)...');

    const gradlewFullCmd = isWindows ? `"${gradlewPath}"` : `"${gradlewPath}"`;
    const { stdout, stderr } = await execAsync(
      `cd "${androidDir}" && ${gradlewFullCmd} bundleRelease --no-daemon`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 600000 }
    );

    if (stdout) log('Gradle output: ' + stdout.substring(Math.max(0, stdout.length - 1000)));
    if (stderr) log('Gradle stderr: ' + stderr.substring(Math.max(0, stderr.length - 1000)));

    // Find the AAB file
    const aabPath = path.join(androidDir, 'app/build/outputs/bundle/release/app-release.aab');

    try {
      await fs.access(aabPath);

      // Verify AAB is valid (check file size)
      const stats = await fs.stat(aabPath);
      if (stats.size < 1024 * 100) { // Less than 100KB is suspicious
        throw new Error(`AAB file is too small (${stats.size} bytes). Build may have failed.`);
      }

      log(`AAB built successfully: ${aabPath} (${Math.round(stats.size / 1024 / 1024 * 10) / 10}MB)`);
      return aabPath;
    } catch {
      throw new Error('AAB file was not generated. Check build logs for errors.');
    }
  } catch (error) {
    log('Build error: ' + error.message);
    log('Full error: ' + error.stack);
    throw new Error('AAB build failed: ' + error.message + '\n\nPlease ensure Android SDK, Gradle, and JDK are properly installed on the server.');
  }
};

const generateHTML = (project) => {
  if (project.project_type === 'url') {
    // For URL-based projects, redirect directly to avoid X-Frame-Options blocking
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${project.app_name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        #loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${project.theme_color || '#ffffff'};
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            z-index: 9999;
        }
        #loading img {
            width: 120px;
            height: 120px;
            margin-bottom: 20px;
        }
        #loading .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0,0,0,0.1);
            border-top-color: #333;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="loading">
        ${project.app_icon ? '<img src="icon.png" alt="App Icon">' : ''}
        <div class="spinner"></div>
    </div>
    <script>
        // Direct navigation to avoid X-Frame-Options blocking
        // Show loading screen briefly before redirect
        setTimeout(function() {
            window.location.href = '${project.website_url}';
        }, 1000);
    </script>
</body>
</html>`;
  } else {
    // For template-based projects
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${project.app_name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>${project.app_name}</h1>
        </header>
        <main id="content">
            <p>${project.app_description || '앱 설명이 없습니다.'}</p>
        </main>
    </div>
    <script src="app.js"></script>
</body>
</html>`;
  }
};

const generateCSS = (project) => {
  return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #f5f5f5;
    color: #333;
}

#app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

header {
    background-color: ${project.theme_color || '#007bff'};
    color: white;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

header h1 {
    font-size: 1.5rem;
    font-weight: 600;
}

main {
    flex: 1;
    padding: 1rem;
}

main p {
    line-height: 1.6;
    color: #666;
}
`;
};

const generateJS = (project) => {
  return `// App initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('${project.app_name} initialized');

    // Add any custom JavaScript here
});
`;
};

module.exports = {
  buildAndroidApp
};
