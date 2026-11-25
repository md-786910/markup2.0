import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ProjectView from '../components/project/ProjectView';
import { getProjectApi } from '../services/projectService';
import { useLiveSync } from '../hooks/useLiveSync';
import { toast } from '../utils/toast';

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPinId = searchParams.get('pin') || searchParams.get('comment');
  const [project, setProject] = useState(null);
  const [proxyToken, setProxyToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getProjectApi(projectId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setProject({ ...res.data.project, access: res.data.access, workspaceMembers: res.data.workspaceMembers || [] });
        setProxyToken(res.data.proxyToken || null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.response?.data?.message || 'Failed to load project');
        if (err.response?.status === 404 || err.response?.status === 403) {
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [projectId, navigate]);

  // Live: the project's details, members or access changed elsewhere. Re-fetch
  // quietly; if access was taken away, go back to the dashboard.
  useLiveSync(['project', 'workspaces', 'team'], () => {
    getProjectApi(projectId)
      .then((res) => {
        setProject((prev) => (prev ? { ...res.data.project, access: res.data.access, workspaceMembers: res.data.workspaceMembers || [] } : prev));
        if (res.data.proxyToken) setProxyToken((prev) => prev || res.data.proxyToken);
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 403 || status === 404) {
          toast.info('You no longer have access to this project.');
          navigate('/dashboard');
        }
      });
  }, { projectId, enabled: !!project });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen animate-fade-in">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-body-lg">{error || 'Project not found'}</p>
          <p className="text-gray-400 text-body-sm mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page-enter h-screen">
      <ProjectView
        project={project}
        proxyToken={proxyToken}
        onProjectUpdate={(updated) => setProject((prev) => ({ ...updated, access: updated.access || prev?.access, workspaceMembers: updated.workspaceMembers || prev?.workspaceMembers || [] }))}
        initialPinId={initialPinId}
      />
    </div>
  );
}
