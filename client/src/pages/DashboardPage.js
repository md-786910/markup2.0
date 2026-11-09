import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ProjectList from '../components/dashboard/ProjectList';
import CreateProjectModal from '../components/dashboard/CreateProjectModal';
import NewProjectDropdown from '../components/dashboard/NewProjectDropdown';
import FilterBar from '../components/dashboard/FilterBar';
import TrialDashboardBanner from '../components/common/TrialDashboardBanner';
import Modal from '../components/common/Modal';
import { getProjectsApi, updateProjectApi, deleteProjectApi } from '../services/projectService';
import { toastError, toast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';
import { REVIEW_VIEWS, statusInfo } from '../utils/projectConstants';
import { Button, Field, Input, PageHeader, Select } from '../components/kc';
import { useWorkspaces } from '../contexts/WorkspaceContext';
import { useShell } from '../contexts/ShellContext';

const DEFAULT_DATE_RANGE = { preset: null, start: '', end: '' };

function getDateBounds(dateRange = DEFAULT_DATE_RANGE) {
  const now = new Date();
  const day = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (dateRange.preset) {
    case 'today': return { start: day(), end: endOfToday };
    case '7d': return { start: day(-6), end: endOfToday };
    case '30d': return { start: day(-29), end: endOfToday };
    case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    case 'custom': {
      const parse = (s, endOfDay) => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
      };
      return { start: parse(dateRange.start), end: parse(dateRange.end, true) };
    }
    default: return { start: null, end: null };
  }
}

function isInDateRange(project, dateRange) {
  const { start, end } = getDateBounds(dateRange);
  if (!start && !end) return true;
  const date = new Date(project.createdAt || project.updatedAt);
  if (Number.isNaN(date.getTime())) return false;
  return !(start && date < start) && !(end && date > end);
}

const TYPE_TITLES = { website: 'Websites', document: 'Documents' };

// Projects area: every reviewable website and document in the current
// workspace as a grid of project cards; Archive (?tab=archived) as a table.
// The view (?view=in_review|changes_requested|approved) and type
// (?type=website|document) live in the URL, so the context panel and the
// filter pills stay in step.
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { workspaces, current: workspace, refresh: refreshWorkspaces } = useWorkspaces();
  const { setCounts } = useShell();
  // Org admins, or people who can manage the current workspace, create projects in it
  const canCreateHere = isAdmin || workspace?.myLevel === 'manage';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'archived' ? 'archived' : 'active';
  const viewParam = searchParams.get('view');
  const view = REVIEW_VIEWS.includes(viewParam) ? viewParam : null;
  const typeParam = searchParams.get('type');
  const type = typeParam === 'website' || typeParam === 'document' ? typeParam : null;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('website');
  const [editingProject, setEditingProject] = useState(null);
  const initialLoadDone = useRef(false);
  const [filters, setFilters] = useState({ ownership: null, search: '', dateRange: DEFAULT_DATE_RANGE });
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const main = document.getElementById('main');
    if (!main) return;
    const onScroll = () => {
      setIsScrolled(main.scrollTop > 50);
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  }, [setSearchParams]);

  // ?create=website|document (e.g. from a blocked site) opens the create dialog
  useEffect(() => {
    const t = searchParams.get('create');
    if (!canCreateHere || (t !== 'website' && t !== 'document')) return;
    setCreateType(t);
    setShowCreate(true);
    setParam('create', null);
  }, [searchParams, setParam, canCreateHere]);

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

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Projects of the selected workspace (no workspace = the default one)
  const defaultWorkspaceId = workspaces.find((w) => w.isDefault)?._id;
  const inWorkspace = useCallback(
    (p) => !workspace || String(p.workspace?._id || p.workspace || defaultWorkspaceId) === workspace._id,
    [workspace, defaultWorkspaceId],
  );
  const workspaceProjects = useMemo(() => projects.filter(inWorkspace), [projects, inWorkspace]);
  const activeProjects = useMemo(() => workspaceProjects.filter((p) => p.status === 'active'), [workspaceProjects]);
  const archivedProjects = useMemo(() => workspaceProjects.filter((p) => p.status === 'archived'), [workspaceProjects]);

  // Counts for the context panel (Views and Type)
  useEffect(() => {
    if (loading) return;
    const by = (fn) => activeProjects.filter(fn).length;
    setCounts({
      'projects.all': activeProjects.length,
      'projects.in_review': by((p) => p.projectStatus === 'in_review'),
      'projects.changes_requested': by((p) => p.projectStatus === 'changes_requested'),
      'projects.approved': by((p) => p.projectStatus === 'approved'),
      'projects.archive': archivedProjects.length,
      'projects.website': by((p) => p.projectType !== 'document'),
      'projects.document': by((p) => p.projectType === 'document'),
    });
  }, [loading, activeProjects, archivedProjects, setCounts]);

  const filteredProjects = useMemo(() => {
    let result = tab === 'archived' ? archivedProjects : activeProjects;
    result = result.filter((p) => isInDateRange(p, filters.dateRange));
    if (tab !== 'archived' && view) result = result.filter((p) => (p.projectStatus || 'not_started') === view);
    if (type) result = result.filter((p) => (type === 'document' ? p.projectType === 'document' : p.projectType !== 'document'));
    if (filters.ownership === 'mine') {
      result = result.filter((p) => p.owner?._id === user?.id || p.owner === user?.id);
    } else if (filters.ownership === 'shared') {
      result = result.filter((p) => {
        const isOwner = p.owner?._id === user?.id || p.owner === user?.id;
        return !isOwner && (p.members || []).some((m) => m._id === user?.id);
      });
    }
    const q = filters.search.trim().toLowerCase();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q));
    return result;
  }, [tab, view, type, activeProjects, archivedProjects, filters, user?.id]);

  const extraFilterCount = [type, filters.ownership, filters.dateRange?.preset].filter(Boolean).length + (filters.search.trim() ? 1 : 0);

  const replaceProject = (updated) => setProjects((prev) => prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));

  const handleStatusChange = async (project, projectStatus) => {
    try {
      const res = await updateProjectApi(project._id, { projectStatus });
      replaceProject(res.data.project);
    } catch (err) {
      toastError(err, 'Could not update the status.');
    }
  };

  const handleArchiveToggle = async (project) => {
    try {
      const restoring = project.status !== 'active';
      const res = await updateProjectApi(project._id, { status: restoring ? 'active' : 'archived' });
      replaceProject(res.data.project);
      refreshWorkspaces().catch(() => {});
      toast.success(restoring ? `${project.name} is back in review.` : `${project.name} moved to the archive.`);
    } catch (err) {
      toastError(err, 'Could not update the project.');
    }
  };

  const handleConfirmDelete = async (project) => {
    const ok = await confirmDialog({
      title: `Delete ${project.name}?`,
      message: 'This deletes the project with all its pins and comments. This cannot be undone.',
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProjectApi(project._id);
      setProjects((prev) => prev.filter((p) => p._id !== project._id));
      refreshWorkspaces().catch(() => {});
      toast.success('Project deleted.');
    } catch (err) {
      toastError(err, 'Could not delete the project.');
    }
  };

  const handleEdit = async (project, data) => {
    const res = await updateProjectApi(project._id, data);
    replaceProject(res.data.project);
    setEditingProject(null);
    if (data.workspace) refreshWorkspaces().catch(() => {});
  };

  const openCreate = (t) => { setCreateType(t); setShowCreate(true); };

  // Old Team link
  if (searchParams.get('tab') === 'members') return <Navigate to="/team" replace />;

  const wsName = workspace?.name || user?.orgName || 'Your workspace';
  const title = tab === 'archived' ? 'Archive' : view ? statusInfo(view).label : type && !view ? TYPE_TITLES[type] : 'Projects';
  const subtitle = tab === 'archived'
    ? `Archived projects from ${wsName} appear here. Restore one to review it again.`
    : `${wsName} · ${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'}`;

  // Empty states: the fact, one sentence, at most one action
  let emptyTitle;
  let emptyText;
  let emptyAction = null;
  if (tab === 'archived') {
    emptyTitle = extraFilterCount ? 'No archived projects match' : 'Nothing archived yet';
    emptyText = extraFilterCount ? 'Try another filter or clear the search.' : 'Projects you archive appear here, ready to restore.';
  } else if (activeProjects.length === 0) {
    emptyTitle = 'No projects yet';
    emptyText = canCreateHere
      ? 'Paste a website link or upload a PDF to start collecting feedback.'
      : 'Projects shared with you in this workspace appear here.';
    emptyAction = canCreateHere ? <NewProjectDropdown onSelect={openCreate} /> : null;
  } else if (view && !extraFilterCount) {
    emptyTitle = `No projects ${view === 'in_review' ? 'in review' : view === 'approved' ? 'approved' : 'with changes requested'}`;
    emptyText = 'Projects move here when their status changes.';
    emptyAction = <Button onClick={() => setParam('view', null)}>Show all projects</Button>;
  } else {
    emptyTitle = 'No projects match';
    emptyText = 'Try another filter or clear the search.';
    emptyAction = <Button onClick={() => { setFilters({ ownership: null, search: '', dateRange: DEFAULT_DATE_RANGE }); setParam('type', null); }}>Clear filters</Button>;
  }

  const newProjectAction = tab !== 'archived' && canCreateHere ? (
    <NewProjectDropdown onSelect={openCreate} />
  ) : null;

  return (
    <div>
      {tab !== 'archived' && <TrialDashboardBanner />}

      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={newProjectAction}
      />

      {(tab !== 'archived' || archivedProjects.length > 10 || extraFilterCount > 0) && (
        <FilterBar
          showStatus={tab !== 'archived'}
          status={view}
          onStatusChange={(id) => setParam('view', id)}
          filters={{ ...filters, type }}
          onFiltersChange={(next) => {
            if (next.type !== type) setParam('type', next.type);
            setFilters({ ownership: next.ownership, search: next.search, dateRange: next.dateRange });
          }}
          activeFilterCount={extraFilterCount}
          action={isScrolled ? newProjectAction : null}
          isSticky={isScrolled}
        />
      )}

      <ProjectList
        projects={filteredProjects}
        tab={tab}
        isAdmin={isAdmin}
        userId={user?.id}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyText={emptyText}
        emptyAction={emptyAction}
        onEdit={setEditingProject}
        onArchive={handleArchiveToggle}
        onConfirmDelete={handleConfirmDelete}
        onStatusChange={handleStatusChange}
      />

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

      {editingProject && (
        <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSave={handleEdit} />
      )}
    </div>
  );
}

function EditProjectModal({ project, onClose, onSave }) {
  const { workspaces } = useWorkspaces();
  const defaultWorkspaceId = workspaces.find((w) => w.isDefault)?._id;
  const initialWorkspace = String(project.workspace?._id || project.workspace || defaultWorkspaceId || '');
  const [workspaceId, setWorkspaceId] = useState(initialWorkspace);
  const [name, setName] = useState(project.name);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(project, {
        name,
        websiteUrl: project.websiteUrl,
        ...(workspaceId && workspaceId !== initialWorkspace ? { workspace: workspaceId } : {}),
      });
    } catch (err) {
      toastError(err, 'Could not save the project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit project" size="sm">
      <form onSubmit={handleSubmit} className="kc" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field id="edit-project-name" label="Project name">
          <Input id="edit-project-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus />
        </Field>
        {workspaces.length > 1 && (
          <Field id="edit-project-ws" label="Workspace" hint="Moving a project changes who can see it.">
            <Select id="edit-project-ws" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} options={workspaces.map((w) => ({ value: w._id, label: w.name }))} />
          </Field>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name.trim()}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
