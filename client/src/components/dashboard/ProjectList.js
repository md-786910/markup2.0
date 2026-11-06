import React from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import SkeletonCard from '../common/SkeletonCard';
import { Button, DataTable, EmptyState, Icon, RowMenu } from '../kc';
import { shortDate } from '../../utils/relativeTime';

// Projects grid (design system kc-grid of ProjectCard) and the Archive table
export default function ProjectList({
  projects,
  tab,
  isAdmin,
  userId,
  loading,
  emptyTitle,
  emptyText,
  emptyAction,
  onEdit,
  onArchive,
  onConfirmDelete,
  onStatusChange,
}) {
  if (loading) {
    return (
      <div className="kc-grid" aria-busy="true" aria-label="Loading projects">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState icon={tab === 'archived' ? 'archive' : 'grid'} title={emptyTitle} action={emptyAction}>
        {emptyText}
      </EmptyState>
    );
  }

  if (tab === 'archived') {
    return <ArchiveTable projects={projects} isAdmin={isAdmin} userId={userId} onArchive={onArchive} onConfirmDelete={onConfirmDelete} />;
  }

  return (
    <div className="kc-grid">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          isAdmin={isAdmin || project.access === 'manage'}
          userId={userId}
          onEdit={onEdit}
          onArchive={onArchive}
          onConfirmDelete={onConfirmDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

// Archive: name with type icon, type, owner, archived on, Restore + row menu
function ArchiveTable({ projects, isAdmin, userId, onArchive, onConfirmDelete }) {
  const canManage = (p) => isAdmin || p.access === 'manage' || p.owner?._id === userId || p.owner === userId;
  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (p) => (
        <Link to={`/project/${p._id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }} className="hover:underline">
          <Icon name={p.projectType === 'document' ? 'doc' : 'globe'} size={16} style={{ color: 'var(--text-muted)' }} />
          {p.name}
        </Link>
      ),
    },
    { key: 'type', label: 'Type', render: (p) => (p.projectType === 'document' ? 'Document' : 'Website') },
    { key: 'owner', label: 'Owner', render: (p) => p.owner?.name || p.owner?.email || '—' },
    { key: 'on', label: 'Archived on', render: (p) => shortDate(p.updatedAt) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (p) => (canManage(p) ? (
        <span className="kc-table-actions">
          <Button size="sm" icon="restore" onClick={() => onArchive(p)}>Restore</Button>
          <RowMenu label={`More actions for ${p.name}`} items={[{ label: 'Delete project', icon: 'trash', tone: 'danger', onClick: () => onConfirmDelete(p) }]} />
        </span>
      ) : null),
    },
  ];
  return <DataTable columns={columns} rows={projects} label="Archived projects" />;
}
