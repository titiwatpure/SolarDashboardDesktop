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
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // เพิ่ม Token เข้า header สำหรับทุก request
    localStorage.setItem('token', token);                                // บันทึก Token ลง localStorage
  } else {
    delete axios.defaults.headers.common['Authorization'];               // ลบ Token ออกจาก header
    localStorage.removeItem('token');                                    // ลบ Token จาก localStorage
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
  const token = getToken(); // ดึง Token จาก localStorage
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // ตั้งค่า Token ในทุก request
  }

  try {
    const config = {
      method,                          // GET, POST, PUT, DELETE
      url: `${API_BASE_URL}${url}`,   // URL เต็ม (base + path)
    };

    if (data) {
      config.data = data; // ใส่ข้อมูลถ้าเป็น POST/PUT
    }

    const response = await axios(config);
    return response.data; // คืนเฉพาะ data
  } catch (error) {
    console.error('❌ API Error:', error);
    if (error.response?.status === 401) {
      // ถ้าได้รับ 401 แสดงว่า Token หมดอายุ ให้ลบ Token แล้วไปหน้า Login
      setAuthToken(null);
      window.location.href = '/login';
    }
    throw error; // โยน error ให้ส่วนที่เรียกใช้จัดการต่อ
  }
};

export const authAPI = {
  login: (username, password) => apiCall('POST', '/auth/login', { username, password }),
  logout: () => apiCall('POST', '/auth/logout-all'),
};

export const projectsAPI = {
  getAll: (params) => apiCall('GET', `/projects?${new URLSearchParams(params)}`),
  getById: (id) => apiCall('GET', `/projects/${id}`),
  create: (data) => apiCall('POST', '/projects', data),
  update: (id, data) => apiCall('PUT', `/projects/${id}`, data),
  delete: (id) => apiCall('DELETE', `/projects/${id}`),
  getKPIs: () => apiCall('GET', '/projects/stats/kpis'),
  getTimeline: (id) => apiCall('GET', `/projects/${id}/timeline`),
  deleteTimeline: (projectId, timelineId) => apiCall('DELETE', `/projects/${projectId}/timeline/${timelineId}`),
  getOrganizations: (id) => apiCall('GET', `/projects/${id}/organizations`),
  addOrganization: (id, orgId) => apiCall('POST', `/projects/${id}/organizations`, { org_id: orgId }),
  removeOrganization: (id, orgId) => apiCall('DELETE', `/projects/${id}/organizations/${orgId}`),
};

export const usersAPI = {
  getAll: (params) => apiCall('GET', `/users?${new URLSearchParams(params || {})}`),
  getProfile: () => apiCall('GET', '/users/profile'),
  update: (id, data) => apiCall('PUT', `/users/${id}`, data),
  create: (data) => apiCall('POST', '/users', data),
  delete: (id) => apiCall('DELETE', `/users/${id}`),
  changePassword: (currentPassword, newPassword) => apiCall('PUT', '/users/change-password', { currentPassword, newPassword }),
};

export const documentsAPI = {
  getAll: (params) => apiCall('GET', `/documents?${new URLSearchParams(params || {})}`),
  getByProject: (projectId) => apiCall('GET', `/documents/project/${projectId}`),
  upload: (data) => {
    // ถ้าเป็น FormData (มีไฟล์) ให้ส่งเป็น multipart
    if (data instanceof FormData) {
      const token = localStorage.getItem('token');
      return axios.post(`${API_BASE_URL}/documents`, data, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data',
        },
      }).then((res) => res.data);
    }
    return apiCall('POST', '/documents', data);
  },
  delete: (id) => apiCall('DELETE', `/documents/${id}`),
  getDownloadUrl: (id) => `${API_BASE_URL}/documents/download/${id}`,
};

export const organizationsAPI = {
  getAll: () => apiCall('GET', '/organizations'),
  getProjects: (id) => apiCall('GET', `/organizations/${id}/projects`),
  create: (data) => apiCall('POST', '/organizations', data),
  update: (id, data) => apiCall('PUT', `/organizations/${id}`, data),
  delete: (id) => apiCall('DELETE', `/organizations/${id}`),
};

export const reportsAPI = {
  getSummaryByStatus: () => apiCall('GET', '/reports/summary/status'),
  getSummaryBySize: () => apiCall('GET', '/reports/summary/size'),
  getSummaryByProvince: () => apiCall('GET', '/reports/summary/province'),
  getSummaryByStep: () => apiCall('GET', '/reports/summary/step'),
  getSummaryByStepStatus: () => apiCall('GET', '/reports/summary/step-status'),
};

export const notificationsAPI = {
  getAll: (params) => apiCall('GET', `/notifications?${new URLSearchParams(params || {})}`),
  getUnreadCount: () => apiCall('GET', '/notifications/unread-count'),
  markAsRead: (id) => apiCall('PUT', `/notifications/${id}/read`),
  markAllAsRead: () => apiCall('PUT', '/notifications/read-all'),
  delete: (id) => apiCall('DELETE', `/notifications/${id}`),
};

export const tasksAPI = {
  getAll: (params) => apiCall('GET', `/tasks?${new URLSearchParams(params || {})}`),
  getById: (id) => apiCall('GET', `/tasks/${id}`),
  create: (data) => apiCall('POST', '/tasks', data),
  update: (id, data) => apiCall('PUT', `/tasks/${id}`, data),
  delete: (id) => apiCall('DELETE', `/tasks/${id}`),
};

export const activityLogsAPI = {
  getAll: (params) => apiCall('GET', `/activity-logs?${new URLSearchParams(params || {})}`),
  getRecent: () => apiCall('GET', '/activity-logs/recent'),
};

export const backupAPI = {
  create: () => apiCall('POST', '/backup'),
  getAll: () => apiCall('GET', '/backup'),
  download: (name) => `${API_BASE_URL}/backup/download/${encodeURIComponent(name)}`,
  delete: (name) => apiCall('DELETE', `/backup/${encodeURIComponent(name)}`),
  restore: (name) => apiCall('POST', `/backup/restore/${encodeURIComponent(name)}`),
};
