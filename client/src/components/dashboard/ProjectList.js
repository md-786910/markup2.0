import React from 'react';
import ProjectCard from './ProjectCard';

export default function ProjectList({
  projects,
  tab,
  isAdmin,
  userId,
  confirmDelete,
  onEdit,
  onArchive,
  onDelete,
  onConfirmDelete,
  onManageMembers,
}) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          {tab === 'active' ? (
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          )}
        </div>
        <p className="text-base font-medium text-gray-600">
          {tab === 'active' ? 'No active projects' : 'No archived projects'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {tab === 'active'
            ? 'Create a project to get started'
            : 'Archived projects will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
