import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ProjectList from '../components/dashboard/ProjectList';
import CreateProjectModal from '../components/dashboard/CreateProjectModal';
import MembersTab from '../components/dashboard/MembersTab';
import NewProjectDropdown from '../components/dashboard/NewProjectDropdown';
import FilterBar from '../components/dashboard/FilterBar';
import TrialDashboardBanner from '../components/common/TrialDashboardBanner';
import {
  getProjectsApi,
  updateProjectApi,
  deleteProjectApi,
} from '../services/projectService';
import { toastError } from '../utils/toast';
import useEscape from '../hooks/useEscape';
import { useWorkspaces } from '../contexts/WorkspaceContext';

const DEFAULT_DATE_RANGE = { preset: null, start: '', end: '' };

function getDateBounds(dateRange = DEFAULT_DATE_RANGE) {
  const now = new Date();
  let start = null;
  let end = null;

  if (dateRange.preset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (dateRange.preset === '7d') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (dateRange.preset === '30d') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (dateRange.preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (dateRange.preset === 'custom') {
    if (dateRange.start) {
      const [year, month, day] = dateRange.start.split('-').map(Number);
      start = new Date(year, month - 1, day);
    }
    if (dateRange.end) {
      const [year, month, day] = dateRange.end.split('-').map(Number);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    }
  }

  return { start, end };
}

function isInDateRange(project, dateRange) {
  const { start, end } = getDateBounds(dateRange);
  if (!start && !end) return true;

  const value = project.createdAt || project.updatedAt;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { workspaces, current: workspace, refresh: refreshWorkspaces } = useWorkspaces();
  // Org admins, or people who can manage the current workspace, create projects in it
  const canCreateHere = isAdmin || workspace?.myLevel === 'manage';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'active';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('website');

  // ?create=website|document (e.g. from a blocked site) opens the create dialog
  useEffect(() => {
    const type = searchParams.get('create');
    if (!canCreateHere || (type !== 'website' && type !== 'document')) return;
    setCreateType(type);
    setShowCreate(true);
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('create'); return next; }, { replace: true });
  }, [searchParams, setSearchParams, canCreateHere]);
  const [editingProject, setEditingProject] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  useEscape(() => setConfirmDelete(null), !!confirmDelete);
  const initialLoadDone = useRef(false);
  const [filters, setFilters] = useState({
    status: null,
    type: null,
    ownership: null,
    search: '',
    dateRange: DEFAULT_DATE_RANGE,
  });

  const loadProjects = useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    getProjectsApi()
      .then((res) => {
        setProjects(res.data.projects);
        initialLoadDone.current = true;
      })
      .catch((err) => toastError(err, 'Could not load your projects.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const dateFilteredProjects = useMemo(
    () => projects.filter((p) => isInDateRange(p, filters.dateRange)),
    [projects, filters.dateRange]
  );

  // Projects of the selected workspace (no workspace = the default one)
  const defaultWorkspaceId = workspaces.find((w) => w.isDefault)?._id;
  const inWorkspace = (p) => !workspace || String(p.workspace?._id || p.workspace || defaultWorkspaceId) === workspace._id;
  const activeProjects = dateFilteredProjects.filter((p) => p.status === 'active' && inWorkspace(p));
  const archivedProjects = dateFilteredProjects.filter((p) => p.status === 'archived' && inWorkspace(p));

  const filteredProjects = useMemo(() => {
    let result = tab === 'archived' ? archivedProjects : activeProjects;

    if (filters.status) {
      result = result.filter((p) => (p.projectStatus || 'not_started') === filters.status);
    }
    if (filters.type) {
      result = result.filter((p) => p.projectType === filters.type);
    }
    if (filters.ownership === 'mine') {
      result = result.filter((p) => p.owner?._id === user?.id || p.owner === user?.id);
    } else if (filters.ownership === 'shared') {
      result = result.filter((p) => {
        const isOwner = p.owner?._id === user?.id || p.owner === user?.id;
        const isMember = (p.members || []).some((m) => m._id === user?.id);
        return !isOwner && isMember;
      });
    }
    if (filters.search.trim()) {
      const searchLower = filters.search.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(searchLower));
    }

    return result;
  }, [tab, activeProjects, archivedProjects, filters, user?.id]);

  const activeFilterCount =
    [filters.status, filters.type, filters.ownership, filters.dateRange?.preset].filter(Boolean).length +
    (filters.search.trim() ? 1 : 0);

  // Collect unique members across all projects
  const allMembers = [];
  const seenIds = new Set();
  projects.forEach((project) => {
    (project.members || []).forEach((member) => {
      if (!seenIds.has(member._id)) {
        seenIds.add(member._id);
        const memberProjects = projects.filter((p) =>
          (p.members || []).some((m) => m._id === member._id)
        );
        allMembers.push({ ...member, projects: memberProjects });
      }
    });
  });

  const handleStatusChange = async (project, projectStatus) => {
    try {
      const res = await updateProjectApi(project._id, { projectStatus });
      setProjects((prev) =>
        prev.map((p) => (p._id === res.data.project._id ? { ...p, ...res.data.project } : p))
      );
    } catch (err) {
      toastError(err, 'Could not update the status.');
    }
  };

  const handleArchiveToggle = async (project) => {
    try {
      const newStatus = project.status === 'active' ? 'archived' : 'active';
      const res = await updateProjectApi(project._id, { status: newStatus });
      setProjects((prev) =>
        prev.map((p) => (p._id === res.data.project._id ? { ...p, ...res.data.project } : p))
      );
      refreshWorkspaces().catch(() => {});
    } catch (err) {
      toastError(err, 'Could not update the project.');
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await deleteProjectApi(projectId);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
      setConfirmDelete(null);
      refreshWorkspaces().catch(() => {});
    } catch (err) {
      toastError(err, 'Could not delete the project.');
    }
  };

  const handleEdit = async (project, data) => {
    try {
      const res = await updateProjectApi(project._id, data);
      setProjects((prev) =>
        prev.map((p) => (p._id === res.data.project._id ? { ...p, ...res.data.project } : p))
      );
      setEditingProject(null);
      if (data.workspace) refreshWorkspaces().catch(() => {});
    } catch (err) {
      toastError(err, 'Could not update the project.');
    }
  };

  const websiteCount = filteredProjects.filter((p) => p.projectType !== 'document').length;
  const documentCount = filteredProjects.filter((p) => p.projectType === 'document').length;

  const pageTitle = tab === 'members' ? 'Team' : tab === 'archived' ? 'Archive' : (workspace?.name || 'Dashboard');
  const pageSubtitle = tab === 'members'
    ? `${allMembers.length} member${allMembers.length !== 1 ? 's' : ''} across ${projects.length} project${projects.length !== 1 ? 's' : ''}`
    : `${websiteCount} website${websiteCount !== 1 ? 's' : ''}${documentCount > 0 ? ` · ${documentCount} document${documentCount !== 1 ? 's' : ''}` : ''}${archivedProjects.length > 0 && tab !== 'archived' ? ` · ${archivedProjects.length} archived` : ''}`;

  return (
    <div className="px-6 lg:px-8 py-6 lg:py-8 animate-page-enter">
      {/* Trial banner */}
      <TrialDashboardBanner />

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateHere && tab !== 'members' && (
            <NewProjectDropdown
              onSelect={(type) => {
                setCreateType(type);
                setShowCreate(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Filter Bar (projects only; the team list is not filtered) */}
      {tab !== 'members' && (
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
        />
      )}

      {/* Content */}
      {tab === 'members' ? (
        <MembersTab
          members={allMembers}
          projects={projects}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onProjectsChanged={loadProjects}
        />
      ) : (
        <ProjectList
          projects={filteredProjects}
          tab={tab}
          isAdmin={isAdmin}
          userId={user?.id}
          loading={loading}
          confirmDelete={confirmDelete}
          hasActiveFilters={activeFilterCount > 0}
          onEdit={setEditingProject}
          onArchive={handleArchiveToggle}
          onDelete={handleDelete}
          onConfirmDelete={setConfirmDelete}
          onCreate={canCreateHere ? (type) => { setCreateType(type); setShowCreate(true); } : null}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={showCreate}
        defaultType={createType}
        onClose={() => setShowCreate(false)}
        onCreated={(project) => {
          setProjects((prev) => [project, ...prev]);
          setShowCreate(false);
          refreshWorkspaces().catch(() => {});
          // Straight into the new project: the next step is the first comment
          navigate(`/project/${project._id}`);
        }}
      />

      {/* Edit Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleEdit}
        />
      )}

      {/* Delete confirm overlay */}
      {confirmDelete && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Project</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete the project, all pins, and all comments. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Inline Edit Modal */
function EditProjectModal({ project, onClose, onSave }) {
  useEscape(onClose);
  const { workspaces } = useWorkspaces();
  const defaultWorkspaceId = workspaces.find((w) => w.isDefault)?._id;
  const initialWorkspace = String(project.workspace?._id || project.workspace || defaultWorkspaceId || '');
  const [workspaceId, setWorkspaceId] = useState(initialWorkspace);
  const [name, setName] = useState(project.name);
  const [websiteUrl] = useState(project.websiteUrl);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(project, { name, websiteUrl, ...(workspaceId && workspaceId !== initialWorkspace ? { workspace: workspaceId } : {}) });
    } catch (err) {
      toastError(err, 'Could not save the project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edit project</h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
            />
          </div>
          {workspaces.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace</label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {workspaces.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
            />
          </div> */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
