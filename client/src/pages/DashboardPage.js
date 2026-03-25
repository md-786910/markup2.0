import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'active';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const initialLoadDone = useRef(false);

  const loadProjects = useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    getProjectsApi()
      .then((res) => {
        setProjects(res.data.projects);
        initialLoadDone.current = true;
      })
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status === 'archived');
  const filtered = tab === 'archived' ? archivedProjects : activeProjects;

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
        prev.map((p) => (p._id === res.data.project._id ? res.data.project : p))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

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

  const pageTitle = tab === 'members' ? 'Team' : tab === 'archived' ? 'Archive' : 'Dashboard';
  const pageSubtitle = tab === 'members'
    ? `${allMembers.length} member${allMembers.length !== 1 ? 's' : ''} across ${projects.length} project${projects.length !== 1 ? 's' : ''}`
    : `${activeProjects.length} active${archivedProjects.length > 0 ? ` · ${archivedProjects.length} archived` : ''}`;

  return (
    <div className="px-6 lg:px-8 py-6 lg:py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">{pageSubtitle}</p>
        </div>
        {isAdmin && tab !== 'members' && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        )}
      </div>

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
          projects={filtered}
          tab={tab}
          isAdmin={isAdmin}
          userId={user?.id}
          loading={loading}
          confirmDelete={confirmDelete}
          onEdit={setEditingProject}
          onArchive={handleArchiveToggle}
          onDelete={handleDelete}
          onConfirmDelete={setConfirmDelete}
          onManageMembers={() => {}}
          onStatusChange={handleStatusChange}
        />
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
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
  const [name, setName] = useState(project.name);
  const [websiteUrl, setWebsiteUrl] = useState(project.websiteUrl);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(project, { name, websiteUrl });
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edit Project</h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
