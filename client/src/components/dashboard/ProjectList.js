import React from 'react';
import ProjectCard from './ProjectCard';
import SkeletonCard from '../common/SkeletonCard';

export default function ProjectList({
  projects,
  tab,
  isAdmin,
  userId,
  loading,
  confirmDelete,
  onEdit,
  onArchive,
  onDelete,
  onConfirmDelete,
  onManageMembers,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          {tab === 'active' || tab === 'archived' ? (
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {tab === 'active' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              )}
            </svg>
          ) : (
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          )}
        </div>
        <p className="text-base font-semibold text-gray-700 mb-1">
          {tab === 'active' ? 'No active projects yet' : 'No archived projects'}
        </p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          {tab === 'active'
            ? 'Create your first project to start collecting visual feedback on your website.'
            : 'Projects you archive will appear here for safekeeping.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          isAdmin={isAdmin}
          userId={userId}
          confirmDelete={confirmDelete}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onConfirmDelete={onConfirmDelete}
          onManageMembers={onManageMembers}
        />
      ))}
    </div>
  );
}
