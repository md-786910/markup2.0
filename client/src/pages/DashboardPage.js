import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import ProjectList from '../components/dashboard/ProjectList';
import CreateProjectModal from '../components/dashboard/CreateProjectModal';
import MembersTab from '../components/dashboard/MembersTab';
import {
  getProjectsApi,
  updateProjectApi,
  deleteProjectApi,
} from '../services/projectService';

export default function DashboardPage() {
  const { user, isAdmin, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadProjects = useCallback(() => {
    setLoading(true);
    getProjectsApi()
      .then((res) => setProjects(res.data.projects))
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status === 'archived');
  const filtered = tab === 'active' ? activeProjects : archivedProjects;

  // Collect unique members across all projects
  const allMembers = [];
  const seenIds = new Set();
  projects.forEach((project) => {
    (project.members || []).forEach((member) => {
      if (!seenIds.has(member._id)) {
        seenIds.add(member._id);
        // Attach which projects this member belongs to
        const memberProjects = projects.filter((p) =>
          (p.members || []).some((m) => m._id === member._id)
        );
        allMembers.push({ ...member, projects: memberProjects });
      }
    });
  });

  const handleArchiveToggle = async (project) => {
    try {
      const newStatus = project.status === 'active' ? 'archived' : 'active';
      const res = await updateProjectApi(project._id, { status: newStatus });
      setProjects((prev) =>
        prev.map((p) => (p._id === res.data.project._id ? res.data.project : p))
      );
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await deleteProjectApi(projectId);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleEdit = async (project, data) => {
    try {
      const res = await updateProjectApi(project._id, data);
      setProjects((prev) =>
        prev.map((p) => (p._id === res.data.project._id ? res.data.project : p))
      );
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const tabs = [
    { id: 'active', label: 'Active', count: activeProjects.length },
    { id: 'archived', label: 'Archived', count: archivedProjects.length },
    { id: 'members', label: 'Manage Members', count: allMembers.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Markup</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                {(user?.name || '?')[0].toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Title + Create */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeProjects.length} active{archivedProjects.length > 0 && ` · ${archivedProjects.length} archived`} · {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && tab !== 'members' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {t.count}
              </span>
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : tab === 'members' ? (
          <MembersTab
            members={allMembers}
            projects={projects}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            onProjectsChanged={loadProjects}
          />
        ) : (
          <ProjectList
            projects={filtered}
            tab={tab}
            isAdmin={isAdmin}
            userId={user?.id}
            confirmDelete={confirmDelete}
            onEdit={setEditingProject}
            onArchive={handleArchiveToggle}
            onDelete={handleDelete}
            onConfirmDelete={setConfirmDelete}
            onManageMembers={() => {}}
          />
        )}
      </main>

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(project) => {
          setProjects((prev) => [project, ...prev]);
          setShowCreate(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Project</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete the project, all pins, and all comments. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
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
  const [name, setName] = useState(project.name);
  const [websiteUrl, setWebsiteUrl] = useState(project.websiteUrl);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(project, { name, websiteUrl });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Project</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
