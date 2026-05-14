import { useState, useEffect, useRef, useCallback } from 'react';
import { projectsAPI, usersAPI, organizationsAPI } from '../utils/api';

export function useProjectDetail(id) {
  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allOrgs, setAllOrgs] = useState([]);
  const [projectOrgs, setProjectOrgs] = useState([]);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const requestIdRef = useRef(0);

  const loadAll = useCallback(async (reqId) => {
    try {
      setLoading(true);
      const [proj, tl, orgs, usersResult] = await Promise.all([
        projectsAPI.getById(id),
        projectsAPI.getTimeline(id),
        projectsAPI.getOrganizations(id),
        usersAPI.getAll(),
      ]);
      if (reqId !== requestIdRef.current) return;
      setProject(proj);
      setTimeline(tl);
      setProjectOrgs(Array.isArray(orgs) ? orgs : (orgs.data || []));
      setAllUsers(Array.isArray(usersResult) ? usersResult : (usersResult.data || []));
    } catch (error) {
      if (reqId === requestIdRef.current) console.error('Failed to load:', error);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const currentId = ++requestIdRef.current;
    loadAll(currentId);
  }, [loadAll]);

  const loadOrgsList = useCallback(async () => {
    try {
      const orgsResult = await organizationsAPI.getAll();
      setAllOrgs(Array.isArray(orgsResult) ? orgsResult : (orgsResult.data || []));
      setShowOrgPicker(true);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  }, []);

  const handleAddOrg = useCallback(async (orgId) => {
    try {
      await projectsAPI.addOrganization(id, orgId);
      const orgs = await projectsAPI.getOrganizations(id);
      setProjectOrgs(Array.isArray(orgs) ? orgs : (orgs.data || []));
      setShowOrgPicker(false);
    } catch (error) {
      console.error('Failed to add organization:', error);
    }
  }, [id]);

  const handleRemoveOrg = useCallback(async (orgId) => {
    if (!window.confirm('ต้องการลบหน่วยงานนี้ออกจากโครงการหรือไม่?')) return;
    try {
      await projectsAPI.removeOrganization(id, orgId);
      const orgs = await projectsAPI.getOrganizations(id);
      setProjectOrgs(Array.isArray(orgs) ? orgs : (orgs.data || []));
    } catch (error) {
      console.error('Failed to remove organization:', error);
    }
  }, [id]);

  const handleChangeUser = useCallback(async (userId) => {
    try {
      setSavingUser(true);
      await projectsAPI.update(id, { responsible_user: userId || null });
      const proj = await projectsAPI.getById(id);
      setProject(proj);
      setShowUserPicker(false);
    } catch (error) {
      console.error('Failed to update responsible user:', error);
    } finally {
      setSavingUser(false);
    }
  }, [id]);

  const handleDeleteTimeline = useCallback(async (timelineId) => {
    if (!window.confirm('ต้องการลบรายการ timeline นี้หรือไม่?')) return;
    try {
      await projectsAPI.deleteTimeline(id, timelineId);
      const tl = await projectsAPI.getTimeline(id);
      setTimeline(Array.isArray(tl) ? tl : (tl.data || []));
    } catch (error) {
      console.error('Failed to delete timeline:', error);
    }
  }, [id]);

  return {
    project,
    timeline,
    setTimeline,
    loading,
    allOrgs,
    projectOrgs,
    showOrgPicker,
    setShowOrgPicker,
    allUsers,
    showUserPicker,
    setShowUserPicker,
    savingUser,
    loadAll,
    loadOrgsList,
    handleAddOrg,
    handleRemoveOrg,
    handleChangeUser,
    handleDeleteTimeline,
  };
}

export function useProjectCheckpoints(id, currentStep) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [showCpForm, setShowCpForm] = useState(false);
  const [cpForm, setCpForm] = useState({ checkpoint_name: '', notes: '', required: true });
  const [editingCp, setEditingCp] = useState(null);

  const loadCheckpoints = useCallback(async (step) => {
    try {
      const cps = await projectsAPI.getCheckpoints(id, step);
      setCheckpoints(Array.isArray(cps) ? cps : (cps.data || []));
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
    }
  }, [id]);

  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  const handleStepClick = useCallback((step) => {
    if (selectedStep === step) {
      setSelectedStep(null);
      loadCheckpoints();
    } else {
      setSelectedStep(step);
      loadCheckpoints(step);
    }
  }, [selectedStep, loadCheckpoints]);

  const handleCreateCheckpoint = useCallback(async () => {
    if (!cpForm.checkpoint_name.trim()) return;
    try {
      await projectsAPI.createCheckpoint(id, {
        step: selectedStep || currentStep,
        checkpoint_name: cpForm.checkpoint_name.trim(),
        notes: cpForm.notes.trim() || null,
        required: cpForm.required ? 1 : 0
      });
      setCpForm({ checkpoint_name: '', notes: '', required: true });
      setShowCpForm(false);
      await loadCheckpoints(selectedStep);
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
    }
  }, [id, cpForm, selectedStep, currentStep, loadCheckpoints]);

  const handleUpdateCheckpointStatus = useCallback(async (cpId, status) => {
    try {
      await projectsAPI.updateCheckpoint(cpId, { status });
      await loadCheckpoints(selectedStep);
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (error) {
      console.error('Failed to update checkpoint:', error);
    }
  }, [selectedStep, loadCheckpoints]);

  const handleApproveCheckpoint = useCallback(async (cpId) => {
    try {
      await projectsAPI.approveCheckpoint(cpId, { reason: 'อนุมัติ' });
      await loadCheckpoints(selectedStep);
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (error) {
      console.error('Failed to approve checkpoint:', error);
    }
  }, [selectedStep, loadCheckpoints]);

  const handleDeleteCheckpoint = useCallback(async (cpId) => {
    if (!window.confirm('ต้องการลบจุดตรวจสอบนี้หรือไม่?')) return;
    try {
      await projectsAPI.deleteCheckpoint(cpId);
      await loadCheckpoints(selectedStep);
    } catch (error) {
      console.error('Failed to delete checkpoint:', error);
    }
  }, [selectedStep, loadCheckpoints]);

  const handleUpdateCheckpointNotes = useCallback(async (cpId, notes) => {
    try {
      await projectsAPI.updateCheckpoint(cpId, { notes });
      setEditingCp(null);
      await loadCheckpoints(selectedStep);
    } catch (error) {
      console.error('Failed to update checkpoint notes:', error);
    }
  }, [selectedStep, loadCheckpoints]);

  return {
    checkpoints,
    selectedStep,
    setSelectedStep,
    showCpForm,
    setShowCpForm,
    cpForm,
    setCpForm,
    editingCp,
    setEditingCp,
    loadCheckpoints,
    handleStepClick,
    handleCreateCheckpoint,
    handleUpdateCheckpointStatus,
    handleApproveCheckpoint,
    handleDeleteCheckpoint,
    handleUpdateCheckpointNotes,
  };
}
