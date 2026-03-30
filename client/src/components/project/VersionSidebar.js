import { useState, useEffect, useCallback } from 'react';
import { getVersionsApi, createVersionApi, deleteVersionApi } from '../../services/projectService';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function VersionSidebar({ projectId, selectedVersionId, onVersionSelect }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const loadVersions = useCallback(async () => {
    try {
      const res = await getVersionsApi(projectId);
      setVersions(res.data.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await createVersionApi(projectId, {
        name: newName || undefined,
        notes: newNotes || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewNotes('');
      await loadVersions();
    } catch (err) {
      console.error('Failed to create version:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (versionId) => {
    if (!window.confirm('Delete this version? Pins will not be deleted.')) return;
    try {
      await deleteVersionApi(projectId, versionId);
      if (selectedVersionId === versionId) onVersionSelect(null);
      await loadVersions();
    } catch (err) {
      console.error('Failed to delete version:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Create version button */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Version
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Version name (e.g. Round 2)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCreate(false); setNewName(''); setNewNotes(''); }}
                className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* "All versions" option */}
      <button
        onClick={() => onVersionSelect(null)}
        className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
          !selectedVersionId ? 'bg-blue-50' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">All Versions</span>
          {!selectedVersionId && (
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Show all feedback across versions</p>
      </button>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm">No versions yet</p>
            <p className="text-xs mt-1">Create a version to track feedback rounds</p>
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version._id}
              className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                selectedVersionId === version._id ? 'bg-blue-50' : ''
              }`}
              onClick={() => onVersionSelect(version._id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                    v{version.versionNumber}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{version.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(version._id); }}
                  className="p-1 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all"
                  title="Delete version"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{version.pinSnapshot} pins</span>
                <span>{version.resolvedSnapshot} resolved</span>
                <span>{timeAgo(version.createdAt)}</span>
              </div>
              {version.notes && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{version.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
