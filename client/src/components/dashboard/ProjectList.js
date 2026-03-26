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
  onStatusChange,
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
            ? 'Create your first project to start collecting visual feedback on websites or documents.'
            : 'Projects you archive will appear here for safekeeping.'}
        </p>
      </div>
    );
  }

  const websiteProjects = projects.filter((p) => p.projectType !== 'document');
  const documentProjects = projects.filter((p) => p.projectType === 'document');

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map((project) => (
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
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );

  // If only one type exists, no need for section headers
  if (documentProjects.length === 0) return renderGrid(websiteProjects);
  if (websiteProjects.length === 0) return renderGrid(documentProjects);

  return (
    <div className="space-y-8">
      {/* Websites section */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Websites</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{websiteProjects.length}</span>
        </div>
        {renderGrid(websiteProjects)}
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Documents section */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Documents</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{documentProjects.length}</span>
        </div>
        {renderGrid(documentProjects)}
      </section>
    </div>
  );
}
