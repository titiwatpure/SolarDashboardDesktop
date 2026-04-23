/**
 * API Utility - ฟังก์ชั่นสำหรับการเชื่อมต่อกับเซิร์ฟเวอร์ Backend
 * 
 * ใช้สำหรับ:
 * - ตั้งค่า Authorization Token
 * - เรียก API endpoints
 * - จัดการ Error responses
 */

import axios from 'axios';

// ❗ กำหนด URL ของ Backend API ที่นี่
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * ตั้งค่า Authorization Token
 * @param {string} token - JWT token จากการเข้าสู่ระบบ
 * 
 * วิธีการใช้:
 * setAuthToken('your-jwt-token-here');  // ตั้งค่า token
 * setAuthToken(null);                   // ลบ token
 */
export const setAuthToken = (token) => {
  if (token) {
    // ถ้ามี token ให้เพิ่มไปในทุกคำขอ
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    // ถ้าไม่มี token ให้ลบออก
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

/**
 * ดึง Token จาก Local Storage
 */
const getToken = () => localStorage.getItem('token');

/**
 * ฟังก์ชั่นหลักสำหรับเรียก API
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url - เส้นทาง API (เช่น /projects)
 * @param {object} data - ข้อมูลที่ส่งไป (สำหรับ POST/PUT)
 * 
 * ตัวอย่าง:
 * // GET request
 * const projects = await apiCall('GET', '/projects');
 * 
 * // POST request
 * const newProject = await apiCall('POST', '/projects', { name: 'โครงการใหม่' });
 * 
 * // UPDATE request
 * const updated = await apiCall('PUT', '/projects/123', { name: 'ชื่อใหม่' });
 */
export const apiCall = async (method, url, data = null) => {
  const token = getToken();
  if (token) {
    // ตั้งค่า token ในทุกคำขอ
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  try {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('❌ API Error:', error);
    // ถ้าได้รับ 401 Unauthorized ให้ออกจากระบบ
    if (error.response?.status === 401) {
      setAuthToken(null);
      window.location.href = '/login';
    }
    throw error;
  }
};

export const authAPI = {
  login: (username, password) => apiCall('POST', '/auth/login', { username, password }),
};

export const projectsAPI = {
  getAll: (params) => apiCall('GET', `/projects?${new URLSearchParams(params)}`),
  getById: (id) => apiCall('GET', `/projects/${id}`),
  create: (data) => apiCall('POST', '/projects', data),
  update: (id, data) => apiCall('PUT', `/projects/${id}`, data),
  delete: (id) => apiCall('DELETE', `/projects/${id}`),
  getKPIs: () => apiCall('GET', '/projects/stats/kpis'),
};

export const usersAPI = {
  getAll: () => apiCall('GET', '/users'),
  getProfile: () => apiCall('GET', '/users/profile'),
  update: (id, data) => apiCall('PUT', `/users/${id}`, data),
  create: (data) => apiCall('POST', '/users', data),
  delete: (id) => apiCall('DELETE', `/users/${id}`),
};

export const documentsAPI = {
  getByProject: (projectId) => apiCall('GET', `/documents/project/${projectId}`),
  upload: (data) => apiCall('POST', '/documents', data),
  delete: (id) => apiCall('DELETE', `/documents/${id}`),
};

export const organizationsAPI = {
  getAll: () => apiCall('GET', '/organizations'),
  getProjects: (id) => apiCall('GET', `/organizations/${id}/projects`),
  create: (data) => apiCall('POST', '/organizations', data),
};

export const reportsAPI = {
  getSummaryByStatus: () => apiCall('GET', '/reports/summary/status'),
  getSummaryBySize: () => apiCall('GET', '/reports/summary/size'),
  getSummaryByProvince: () => apiCall('GET', '/reports/summary/province'),
  getSummaryByStep: () => apiCall('GET', '/reports/summary/step'),
};
