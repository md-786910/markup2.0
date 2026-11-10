import React from 'react';
import { useParams } from 'react-router-dom';
import ProjectMembersView from '../components/project/ProjectMembersView';

export default function MembersPage() {
  const { projectId } = useParams();
  return <ProjectMembersView projectId={projectId} />;
}
