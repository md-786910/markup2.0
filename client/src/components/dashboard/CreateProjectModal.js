import React, { useState } from 'react';
import Modal from '../common/Modal';
import { createProjectApi } from '../../services/projectService';

export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await createProjectApi(name, websiteUrl);
      onCreated(res.data.project);
      setName('');
      setWebsiteUrl('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
            placeholder="My Website Review"
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
            placeholder="https://example.com"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
