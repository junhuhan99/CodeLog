/**
 * CodeLog API Test Script
 * 이 스크립트는 CodeLog API의 모든 엔드포인트를 테스트합니다.
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let projectId = '';
let testData = {
  email: `test_${Date.now()}@codelog.test`,
  password: 'test123456',
  username: 'Test User'
};

// 색상 출력용
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const color = type === 'success' ? colors.green :
                type === 'error' ? colors.red :
                type === 'warning' ? colors.yellow : colors.blue;

  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function testResult(name, success, error = null) {
  if (success) {
    log(`✓ ${name}`, 'success');
  } else {
    log(`✗ ${name}: ${error}`, 'error');
  }
  return success;
}

// API 요청 헬퍼
async function apiRequest(method, endpoint, data = null, useAuth = false) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: useAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

// 테스트 케이스들
async function testHealthCheck() {
  log('Testing health check endpoint...', 'info');
  const result = await apiRequest('GET', '/health');
  return testResult('Health Check', result.success && result.data.status === 'ok');
}

async function testRegister() {
  log('Testing user registration...', 'info');
  const result = await apiRequest('POST', '/auth/register', testData);

  if (result.success && result.data.token) {
    authToken = result.data.token;
    log(`Auth token received: ${authToken.substring(0, 20)}...`, 'info');
    return testResult('User Registration', true);
  }

  return testResult('User Registration', false, result.error);
}

async function testLogin() {
  log('Testing user login...', 'info');
  const result = await apiRequest('POST', '/auth/login', {
    email: testData.email,
    password: testData.password
  });

  if (result.success && result.data.token) {
    authToken = result.data.token;
    return testResult('User Login', true);
  }

  return testResult('User Login', false, result.error);
}

async function testGetCurrentUser() {
  log('Testing get current user...', 'info');
  const result = await apiRequest('GET', '/auth/me', null, true);
  return testResult('Get Current User', result.success && result.data.user);
}

async function testCreateProject() {
  log('Testing project creation...', 'info');
  const projectData = {
    project_name: 'Test Project',
    app_name: 'Test App',
    package_name: 'com.test.app',
    app_description: 'Test app description',
    project_type: 'url',
    website_url: 'https://example.com'
  };

  const result = await apiRequest('POST', '/projects', projectData, true);

  if (result.success && result.data.project_id) {
    projectId = result.data.project_id;
    log(`Project created with ID: ${projectId}`, 'info');
    return testResult('Create Project', true);
  }

  return testResult('Create Project', false, result.error);
}

async function testGetProjects() {
  log('Testing get projects...', 'info');
  const result = await apiRequest('GET', '/projects', null, true);
  return testResult('Get Projects', result.success && Array.isArray(result.data.projects));
}

async function testGetProject() {
  log('Testing get single project...', 'info');
  const result = await apiRequest('GET', `/projects/${projectId}`, null, true);
  return testResult('Get Single Project', result.success && result.data.project);
}

async function testUpdateProjectSettings() {
  log('Testing update project settings...', 'info');
  const settings = {
    push_enabled: true,
    splash_enabled: true,
    bottom_tab_enabled: true,
    theme_color: '#ff6600'
  };

  const result = await apiRequest('PUT', `/projects/${projectId}/settings`, settings, true);
  return testResult('Update Project Settings', result.success);
}

async function testCreateTab() {
  log('Testing create tab...', 'info');
  const tabData = {
    tab_name: 'Home',
    tab_url: 'https://example.com',
    tab_order: 0,
    tab_icon: 'home'
  };

  const result = await apiRequest('POST', `/projects/${projectId}/tabs`, tabData, true);
  return testResult('Create Tab', result.success);
}

async function testGetTabs() {
  log('Testing get tabs...', 'info');
  const result = await apiRequest('GET', `/projects/${projectId}/tabs`, null, true);
  return testResult('Get Tabs', result.success && Array.isArray(result.data.tabs));
}

async function testCreateForm() {
  log('Testing create form...', 'info');
  const formData = {
    form_name: 'Contact Form',
    form_description: 'Test contact form',
    form_schema: JSON.stringify([
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true }
    ])
  };

  const result = await apiRequest('POST', `/${projectId}/forms`, formData, true);
  return testResult('Create Form', result.success);
}

async function testGetForms() {
  log('Testing get forms...', 'info');
  const result = await apiRequest('GET', `/${projectId}/forms`, null, true);
  return testResult('Get Forms', result.success && Array.isArray(result.data.forms));
}

async function testCreateBuild() {
  log('Testing create build (this may take a while)...', 'info');
  const buildData = {
    build_type: 'apk',
    version_code: 1,
    version_name: '1.0.0'
  };

  const result = await apiRequest('POST', `/projects/${projectId}/builds`, buildData, true);
  return testResult('Create Build', result.success && result.data.build_id);
}

async function testGetBuilds() {
  log('Testing get builds...', 'info');
  const result = await apiRequest('GET', `/projects/${projectId}/builds`, null, true);
  return testResult('Get Builds', result.success && Array.isArray(result.data.builds));
}

async function testDeleteProject() {
  log('Testing delete project...', 'info');
  const result = await apiRequest('DELETE', `/projects/${projectId}`, null, true);
  return testResult('Delete Project', result.success);
}

// 메인 테스트 실행 함수
async function runTests() {
  console.log('\n' + '='.repeat(50));
  log('Starting CodeLog API Tests', 'info');
  console.log('='.repeat(50) + '\n');

  const results = [];

  // 서버 health check
  results.push(await testHealthCheck());

  // 인증 테스트
  results.push(await testRegister());
  results.push(await testLogin());
  results.push(await testGetCurrentUser());

  // 프로젝트 테스트
  results.push(await testCreateProject());
  results.push(await testGetProjects());
  results.push(await testGetProject());
  results.push(await testUpdateProjectSettings());

  // 탭 테스트
  results.push(await testCreateTab());
  results.push(await testGetTabs());

  // 폼 테스트
  results.push(await testCreateForm());
  results.push(await testGetForms());

  // 빌드 테스트
  results.push(await testCreateBuild());
  results.push(await testGetBuilds());

  // 정리
  results.push(await testDeleteProject());

  // 결과 요약
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  log(`Test Results: ${passed}/${total} passed (${percentage}%)`,
      passed === total ? 'success' : 'warning');
  console.log('='.repeat(50) + '\n');

  if (passed === total) {
    log('All tests passed! 🎉', 'success');
  } else {
    log(`${total - passed} test(s) failed`, 'error');
  }
}

// 실행
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
