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
import { cachedFetch, clearCacheByPrefix } from './apiCache';

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
 * ถอดรหัส JWT payload (ไม่ verify signature — ใช้ client-side เท่านั้น)
 */
export const decodeJWT = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

/**
 * เรียก refresh token เพื่อขอ access token ใหม่
 */
export const refreshAccessToken = async () => {
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

/**
 * GET request ที่ใช้ cache — ป้องกัน re-fetch ซ้ำภายใน TTL
 * @param {string} url
 * @param {number} ttl - cache duration in ms (default 30s)
 */
export const cachedGET = (url, ttl = 30_000) => {
  return cachedFetch(`GET:${url}`, () => apiCall('GET', url), ttl);
};

/**
 * ล้าง cache เมื่อมีการ write operation
 */
export const invalidateCache = (prefix) => {
  clearCacheByPrefix(prefix);
};

export const authAPI = {
  login: (username, password) => apiCall('POST', '/auth/login', { username, password }),
  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return apiCall('POST', '/auth/logout', { refreshToken });
  },
  logoutAll: () => apiCall('POST', '/auth/logout-all'),
  refresh: () => refreshAccessToken(),
  getSessions: () => apiCall('GET', '/auth/sessions'),
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
  approveOrganization: (id, orgId, data) => apiCall('POST', `/projects/${id}/organizations/${orgId}/approve`, data),
  rejectOrganization: (id, orgId, data) => apiCall('POST', `/projects/${id}/organizations/${orgId}/reject`, data),
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
  getSummary: () => apiCall('GET', '/documents/summary'),
  upload: (data, onProgress) => {
    // ถ้าเป็น FormData (มีไฟล์) ให้ส่งเป็น multipart
    if (data instanceof FormData) {
      const token = localStorage.getItem('token');
      return axios.post(`${API_BASE_URL}/documents`, data, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress || undefined,
      }).then((res) => res.data);
    }
    return apiCall('POST', '/documents', data);
  },
  delete: (id) => apiCall('DELETE', `/documents/${id}`),
  getDownloadUrl: (id) => `${API_BASE_URL}/documents/download/${id}`,
  download: async (id, filename) => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
    if (isElectron) {
      const savePath = await window.electronAPI.saveFile({
        defaultPath: filename || 'document',
        title: 'บันทึกเอกสาร',
      });
      if (!savePath) return;
      const token = getToken();
      await axios.post(`${API_BASE_URL}/documents/download-to`, {
        document_id: id,
        save_path: savePath,
      }, { headers: { Authorization: `Bearer ${token}` } });
      return;
    }
    const token = getToken();
    const res = await axios.get(`${API_BASE_URL}/documents/download/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });
    // Parse filename from Content-Disposition header
    const disposition = res.headers['content-disposition'];
    let downloadName = filename || 'document';
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/i);
      if (utf8Match) downloadName = decodeURIComponent(utf8Match[1]);
      else {
        const plainMatch = disposition.match(/filename="?([^";\n]+)"?/);
        if (plainMatch) downloadName = plainMatch[1];
      }
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export const organizationsAPI = {
  getAll: () => apiCall('GET', '/organizations'),
  getById: (id) => apiCall('GET', `/organizations/${id}`),
  getProjects: (id) => apiCall('GET', `/organizations/${id}/projects`),
  create: (data) => apiCall('POST', '/organizations', data),
  update: (id, data) => apiCall('PUT', `/organizations/${id}`, data),
  delete: (id) => apiCall('DELETE', `/organizations/${id}`),
  getContacts: (id) => apiCall('GET', `/organizations/${id}/contacts`),
  createContact: (orgId, data) => apiCall('POST', `/organizations/${orgId}/contacts`, data),
  updateContact: (orgId, contactId, data) => apiCall('PUT', `/organizations/${orgId}/contacts/${contactId}`, data),
  deleteContact: (orgId, contactId) => apiCall('DELETE', `/organizations/${orgId}/contacts/${contactId}`),
  getAllContacts: (params) => apiCall('GET', `/organizations/contacts/all?${new URLSearchParams(params || {})}`),
};

export const reportsAPI = {
  getSummaryByStatus: () => apiCall('GET', '/reports/summary/status'),
  getSummaryBySize: () => apiCall('GET', '/reports/summary/size'),
  getSummaryByProvince: () => apiCall('GET', '/reports/summary/province'),
  getSummaryByStep: () => apiCall('GET', '/reports/summary/step'),
  getSummaryByStepStatus: () => apiCall('GET', '/reports/summary/step-status'),
  getSummaryByTimeline: () => apiCall('GET', '/reports/summary/timeline'),
  getSummaryByRisk: () => apiCall('GET', '/reports/summary/risk'),
  getSummaryByLeadTime: () => apiCall('GET', '/reports/summary/lead-time'),
  getSummaryByPerformance: () => apiCall('GET', '/reports/summary/performance'),
  getSummaryByTasks: () => apiCall('GET', '/reports/summary/tasks'),
  getTasksByAssignee: () => apiCall('GET', '/reports/tasks/by-assignee'),
  getTasksDetails: () => apiCall('GET', '/reports/tasks/details'),
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

export const customersAPI = {
  getAll: (params) => apiCall('GET', `/customers?${new URLSearchParams(params || {})}`),
  getById: (id) => apiCall('GET', `/customers/${id}`),
  getProjects: (id) => apiCall('GET', `/customers/${id}/projects`),
  create: (data) => apiCall('POST', '/customers', data),
  update: (id, data) => apiCall('PUT', `/customers/${id}`, data),
  delete: (id) => apiCall('DELETE', `/customers/${id}`),
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

export const settingsAPI = {
  getCompany: () => apiCall('GET', '/settings/company'),
  updateCompany: (data) => apiCall('PUT', '/settings/company', data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const token = localStorage.getItem('token');
    return axios.post(`${API_BASE_URL}/settings/logo`, formData, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    }).then(res => res.data);
  },
  getChangelog: () => apiCall('GET', '/settings/changelog'),
};

export const quotationsAPI = {
  getAll: (params) => apiCall('GET', `/quotations?${new URLSearchParams(params || {})}`),
  getById: (id) => apiCall('GET', `/quotations/${id}`),
  create: (data) => apiCall('POST', '/quotations', data),
  update: (id, data) => apiCall('PUT', `/quotations/${id}`, data),
  updateItems: (id, items) => apiCall('PUT', `/quotations/${id}/items`, { items }),
  changeStatus: (id, status) => apiCall('POST', `/quotations/${id}/status`, { status }),
  delete: (id) => apiCall('DELETE', `/quotations/${id}`),
};

export const contractsAPI = {
  getAll: (params) => apiCall('GET', `/contracts?${new URLSearchParams(params || {})}`),
  getById: (id) => apiCall('GET', `/contracts/${id}`),
  create: (data) => apiCall('POST', '/contracts', data),
  update: (id, data) => apiCall('PUT', `/contracts/${id}`, data),
  delete: (id) => apiCall('DELETE', `/contracts/${id}`),
};

export const portalAPI = {
  getSummary: () => apiCall('GET', '/portal/summary'),
  getProjects: () => apiCall('GET', '/portal/projects'),
  getQuotations: () => apiCall('GET', '/portal/quotations'),
  getContracts: () => apiCall('GET', '/portal/contracts'),
  getDocuments: () => apiCall('GET', '/portal/documents'),
};

export const accountingAPI = {
  getCategories: (params) => apiCall('GET', `/accounting/categories?${new URLSearchParams(params || {})}`),
  createCategory: (data) => apiCall('POST', '/accounting/categories', data),
  getTransactions: (params) => apiCall('GET', `/accounting/transactions?${new URLSearchParams(params || {})}`),
  getTransaction: (id) => apiCall('GET', `/accounting/transactions/${id}`),
  createTransaction: (data) => apiCall('POST', '/accounting/transactions', data),
  updateTransaction: (id, data) => apiCall('PUT', `/accounting/transactions/${id}`, data),
  deleteTransaction: (id) => apiCall('DELETE', `/accounting/transactions/${id}`),
  getInstallments: (params) => apiCall('GET', `/accounting/installments?${new URLSearchParams(params || {})}`),
  createInstallment: (data) => apiCall('POST', '/accounting/installments', data),
  bulkInstallments: (data) => apiCall('POST', '/accounting/installments/bulk', data),
  updateInstallment: (id, data) => apiCall('PUT', `/accounting/installments/${id}`, data),
  payInstallment: (id, data) => apiCall('POST', `/accounting/installments/${id}/pay`, data),
  deleteInstallment: (id, force) => apiCall('DELETE', `/accounting/installments/${id}${force ? '?force=true' : ''}`),
  getProjectSummary: (projectId) => apiCall('GET', `/accounting/project/${projectId}/summary`),
  getCompanySummary: () => apiCall('GET', '/accounting/company/summary'),
  export: (params) => apiCall('GET', `/accounting/export?${new URLSearchParams(params || {})}`),
};

// ============================================================
// Document Review Module API
// ============================================================
export const documentReviewAPI = {
  // Projects — cached 30s
  getReviewProjects: (params) => cachedGET(`/doc-review?${new URLSearchParams(params || {})}`, 30_000),
  createReviewProject: (data) => { invalidateCache('/doc-review'); return apiCall('POST', '/doc-review', data); },
  getReviewProject: (id) => cachedGET(`/doc-review/${id}`, 30_000),
  updateReviewProject: (id, data) => { invalidateCache('/doc-review'); return apiCall('PUT', `/doc-review/${id}`, data); },
  deleteReviewProject: (id) => { invalidateCache('/doc-review'); return apiCall('DELETE', `/doc-review/${id}`); },
  getReviewSummary: () => apiCall('GET', '/doc-review/dashboard/summary'),

  // Submission Packages
  getPackages: (projectId) => apiCall('GET', `/doc-review/projects/${projectId}/packages`),
  createPackage: (projectId, data) => apiCall('POST', `/doc-review/projects/${projectId}/packages`, data),
  getPackage: (packageId) => apiCall('GET', `/doc-review/packages/${packageId}`),
  updatePackage: (packageId, data) => apiCall('PUT', `/doc-review/packages/${packageId}`, data),
  deletePackage: (packageId) => apiCall('DELETE', `/doc-review/packages/${packageId}`),
  generateChecklist: (packageId, templateId) => apiCall('POST', `/doc-review/packages/${packageId}/generate-checklist`, { template_id: templateId }),

  // Checklists
  getReviewChecklists: (projectId) => apiCall('GET', `/doc-review/projects/${projectId}/checklists`),
  createReviewChecklist: (projectId, data) => apiCall('POST', `/doc-review/projects/${projectId}/checklists`, data),
  createChecklistsFromTemplate: (projectId, templateId) => apiCall('POST', `/doc-review/projects/${projectId}/checklists/from-template`, { template_id: templateId }),
  updateReviewChecklist: (id, data) => apiCall('PUT', `/doc-review/checklists/${id}`, data),
  deleteReviewChecklist: (id) => apiCall('DELETE', `/doc-review/checklists/${id}`),

  // Files
  uploadReviewFile: (checklistId, formData) => {
    const token = localStorage.getItem('token');
    return axios.post(`${API_BASE_URL}/doc-review/checklists/${checklistId}/files`, formData, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  getReviewFiles: (checklistId) => apiCall('GET', `/doc-review/checklists/${checklistId}/files`),
  downloadReviewFile: (fileId) => `${API_BASE_URL}/doc-review/files/${fileId}/download`,
  deleteReviewFile: (fileId) => apiCall('DELETE', `/doc-review/files/${fileId}`),

  // Comments
  addReviewComment: (checklistId, data) => apiCall('POST', `/doc-review/checklists/${checklistId}/comments`, data),
  getReviewComments: (checklistId, params) => apiCall('GET', `/doc-review/checklists/${checklistId}/comments?${new URLSearchParams(params || {})}`),

  // Approvals
  approveProject: (projectId, data) => apiCall('POST', `/doc-review/projects/${projectId}/approve`, data),
  rejectProject: (projectId, data) => apiCall('POST', `/doc-review/projects/${projectId}/reject`, data),
  getProjectApprovals: (projectId) => apiCall('GET', `/doc-review/projects/${projectId}/approvals`),

  // Agency Submissions
  submitToAgency: (projectId, data) => apiCall('POST', `/doc-review/projects/${projectId}/submit`, data),
  updateSubmission: (submissionId, data) => apiCall('PUT', `/doc-review/submissions/${submissionId}`, data),
  deleteSubmission: (submissionId) => apiCall('DELETE', `/doc-review/submissions/${submissionId}`),
  getProjectSubmissions: (projectId) => apiCall('GET', `/doc-review/projects/${projectId}/submissions`),
  getAllSubmissions: () => cachedGET('/doc-review/submissions', 30_000),

  // Template Checklists
  getTemplateChecklists: (params) => apiCall('GET', `/doc-review/template-checklists?${new URLSearchParams(params || {})}`),
  getTemplateChecklist: (id) => apiCall('GET', `/doc-review/template-checklists/${id}`),
  createTemplateChecklist: (data) => apiCall('POST', '/doc-review/template-checklists', data),
  updateTemplateChecklist: (id, data) => apiCall('PUT', `/doc-review/template-checklists/${id}`, data),
  deleteTemplateChecklist: (id) => apiCall('DELETE', `/doc-review/template-checklists/${id}`),
  copyTemplateChecklist: (id, data) => apiCall('POST', `/doc-review/template-checklists/${id}/copy`, data),

  // Document Receipts - บันทึกการรับเอกสารจากลูกค้า
  createReceipt: (data) => apiCall('POST', '/doc-review/receipts', data),
  getReceiptsByChecklist: (checklistId) => apiCall('GET', `/doc-review/receipts/checklists/${checklistId}`),

  // Document Issues - จัดการปัญหาที่ต้องแก้ไข
  createIssue: (data) => apiCall('POST', '/doc-review/issues', data),
  resolveIssue: (issueId) => apiCall('PUT', `/doc-review/issues/${issueId}/resolve`),
  getIssuesByPackage: (packageId) => apiCall('GET', `/doc-review/packages/${packageId}/issues`),

  // Correction Reports - รายงานส่งลูกค้า
  createCorrectionReport: (data) => apiCall('POST', '/doc-review/correction-reports', data),
  getCorrectionReport: (id) => apiCall('GET', `/doc-review/correction-reports/${id}`),
};

