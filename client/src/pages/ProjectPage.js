import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectView from '../components/project/ProjectView';
import { getProjectApi } from '../services/projectService';

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjectApi(projectId)
      .then((res) => setProject(res.data.project))
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load project');
        if (err.response?.status === 404 || err.response?.status === 403) {
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <p className="text-gray-400 text-sm mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectView
      project={project}
      onProjectUpdate={(updated) => setProject(updated)}
    />
  );
}
