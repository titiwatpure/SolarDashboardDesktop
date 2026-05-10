/**
 * API Utility - ฟังก์ชั่นสำหรับการเชื่อมต่อกับเซิร์ฟเวอร์ Backend
 *
 * ใช้สำหรับ:
 * - ตั้งค่า Authorization Token
 * - เรียก API endpoints
 * - จัดการ Error responses
 * - Auto refresh token เมื่อ access token หมดอายุ
 */

import axios from 'axios';

// ❗ กำหนด URL ของ Backend API ที่นี่
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * ตั้งค่า Authorization Token
 * @param {string} token - JWT token จากการเข้าสู่ระบบ
 */
export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

/**
 * ตั้งค่า Refresh Token
 */
export const setRefreshToken = (refreshToken) => {
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

const getToken = () => localStorage.getItem('token');
const getRefreshToken = () => localStorage.getItem('refreshToken');

// ========================
// Token Refresh Logic
// ========================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * เรียก refresh token เพื่อขอ access token ใหม่
 */
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = response.data;

  setAuthToken(accessToken);
  if (newRefreshToken) setRefreshToken(newRefreshToken);

  return accessToken;
};

// ========================
// Axios Interceptor: Auto Refresh on 401
// ========================
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ถ้าไม่ใช่ 401 หรือ request เคย retry แล้ว ให้ reject ทันที
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ถ้าเป็น request ไปที่ refresh endpoint เอง ให้ reject (ป้องกัน loop)
    if (originalRequest.url?.includes('/auth/refresh')) {
      setAuthToken(null);
      setRefreshToken(null);
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ถ้ากำลัง refresh อยู่แล้ว ให้ queue request นี้รอ
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return axios(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return axios(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      setAuthToken(null);
      setRefreshToken(null);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * ฟังก์ชั่นหลักสำหรับเรียก API
 */
export const apiCall = async (method, url, data = null) => {
  const token = getToken();
  if (token) {
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
    console.error('API Error:', error);
    throw error;
  }
};

export const authAPI = {
  login: (username, password) => apiCall('POST', '/auth/login', { username, password }),
  logout: () => apiCall('POST', '/auth/logout'),
  logoutAll: () => apiCall('POST', '/auth/logout-all'),
  refresh: () => refreshAccessToken(),
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
  getTimelineComments: (projectId, timelineId) => apiCall('GET', `/projects/${projectId}/timeline/${timelineId}/comments`),
  addTimelineComment: (projectId, timelineId, data) => apiCall('POST', `/projects/${projectId}/timeline/${timelineId}/comments`, data),
  deleteTimelineComment: (projectId, timelineId, commentId) => apiCall('DELETE', `/projects/${projectId}/timeline/${timelineId}/comments/${commentId}`),
  getOrganizations: (id) => apiCall('GET', `/projects/${id}/organizations`),
  addOrganization: (id, orgId) => apiCall('POST', `/projects/${id}/organizations`, { org_id: orgId }),
  removeOrganization: (id, orgId) => apiCall('DELETE', `/projects/${id}/organizations/${orgId}`),
  getCheckpoints: (projectId, step) => apiCall('GET', `/projects/${projectId}/checkpoints${step ? '?step=' + step : ''}`),
  createCheckpoint: (projectId, data) => apiCall('POST', `/projects/${projectId}/checkpoints`, data),
  updateCheckpoint: (id, data) => apiCall('PUT', `/checkpoints/${id}`, data),
  approveCheckpoint: (id, data) => apiCall('POST', `/checkpoints/${id}/approve`, data),
  getCheckpointLogs: (id) => apiCall('GET', `/checkpoints/${id}/logs`),
  deleteCheckpoint: (id) => apiCall('DELETE', `/checkpoints/${id}`),
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
