import { useState, useEffect, useCallback } from 'react';
import { backupAPI, settingsAPI, usersAPI } from '../utils/api';

export function useProfileEdit(user, refreshUser) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const handleStartEditProfile = useCallback(() => {
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setProfileError('');
    setProfileSuccess('');
    setIsEditingProfile(true);
  }, [user]);

  const handleCancelEditProfile = useCallback(() => {
    setIsEditingProfile(false);
    setProfileError('');
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);
    try {
      await usersAPI.update(user.id, profileForm);
      await refreshUser();
      setIsEditingProfile(false);
      setProfileSuccess('บันทึกโปรไฟล์สำเร็จ');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProfileLoading(false);
    }
  }, [user, profileForm, refreshUser]);

  return {
    isEditingProfile,
    profileForm,
    setProfileForm,
    profileLoading,
    profileError,
    profileSuccess,
    handleStartEditProfile,
    handleCancelEditProfile,
    handleSaveProfile,
  };
}

export function useCompanySettings(isAdmin) {
  const [companyForm, setCompanyForm] = useState({
    company_name: '', address: '', phone: '', email: '', tax_id: '', logo_url: ''
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyMessage, setCompanyMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!isAdmin) return;
    const loadCompany = async () => {
      try {
        const data = await settingsAPI.getCompany();
        setCompanyForm({
          company_name: data.company_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          tax_id: data.tax_id || '',
          logo_url: data.logo_url || '',
        });
      } catch (err) {
        console.error('Failed to load company settings:', err);
      }
    };
    loadCompany();
  }, [isAdmin]);

  const handleSaveCompany = useCallback(async () => {
    setCompanyLoading(true);
    setCompanyMessage({ type: '', text: '' });
    try {
      await settingsAPI.updateCompany(companyForm);
      setCompanyMessage({ type: 'success', text: 'บันทึกข้อมูลบริษัทสำเร็จ' });
      setTimeout(() => setCompanyMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setCompanyMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setCompanyLoading(false);
    }
  }, [companyForm]);

  return {
    companyForm,
    setCompanyForm,
    companyLoading,
    companyMessage,
    handleSaveCompany,
  };
}

export function useBackupManagement(isAdmin) {
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  const [restoringName, setRestoringName] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  const loadBackups = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await backupAPI.getAll();
      setBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = useCallback(async () => {
    setBackupLoading(true);
    setBackupMessage({ type: '', text: '' });
    try {
      const result = await backupAPI.create();
      setBackupMessage({ type: 'success', text: result.message || 'สำรองฐานข้อมูลสำเร็จ' });
      loadBackups();
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setBackupLoading(false);
    }
  }, [loadBackups]);

  const handleDeleteBackup = useCallback(async (name) => {
    try {
      await backupAPI.delete(name);
      setBackupMessage({ type: 'success', text: 'ลบไฟล์ backup สำเร็จ' });
      setConfirmDelete(null);
      loadBackups();
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    }
  }, [loadBackups]);

  const handleRestoreBackup = useCallback(async (name) => {
    setRestoringName(name);
    setBackupMessage({ type: '', text: '' });
    try {
      const result = await backupAPI.restore(name);
      setBackupMessage({ type: 'success', text: result.message || 'กู้คืนสำเร็จ กรุณา restart server' });
      setConfirmRestore(null);
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setRestoringName(null);
    }
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  const formatDate = useCallback((isoString) => {
    return new Date(isoString).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }, []);

  return {
    backups,
    backupLoading,
    backupMessage,
    restoringName,
    confirmDelete,
    setConfirmDelete,
    confirmRestore,
    setConfirmRestore,
    loadBackups,
    handleCreateBackup,
    handleDeleteBackup,
    handleRestoreBackup,
    formatFileSize,
    formatDate,
  };
}
