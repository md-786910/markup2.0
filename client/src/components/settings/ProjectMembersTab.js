import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProjectsApi } from '../../services/projectService';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { EmptyState, PageHeader } from '../kc';
import ProjectMembersView from '../project/ProjectMembersView';

export default function ProjectMembersTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { current: workspace } = useWorkspaces();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectsApi()
      .then((res) => setProjects(res.data?.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const requestedProjectId = searchParams.get('project');

  // Active project: URL param, or matching current workspace, or first available project
  const selectedProjectId = useMemo(() => {
    if (requestedProjectId && projects.some((p) => p._id === requestedProjectId)) {
      return requestedProjectId;
    }
    if (workspace?._id) {
      const match = projects.find(
        (p) => String(p.workspace?._id || p.workspace) === String(workspace._id)
      );
      if (match) return match._id;
    }
    return projects[0]?._id || null;
  }, [requestedProjectId, projects, workspace?._id]);

  const handleSelectProject = (projectId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'project-members');
      next.set('project', projectId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div>
        <PageHeader
          title="Project members"
          subtitle="Manage members and access levels for your projects."
        />
        <EmptyState icon="grid" title="No projects found">
          You don&apos;t have any projects yet. Create a project to manage its members and access levels.
        </EmptyState>
      </div>
    );
  }

  return (
    <ProjectMembersView
      projectId={selectedProjectId}
      projects={projects}
      showProjectPicker={projects.length > 1}
      onSelectProject={handleSelectProject}
    />
  );
}

