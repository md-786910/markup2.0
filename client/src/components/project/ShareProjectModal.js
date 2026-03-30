import { useState, useEffect } from 'react';
import { enableShareApi, updateShareApi, disableShareApi } from '../../services/projectService';

export default function ShareProjectModal({ isOpen, onClose, project, onProjectUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  const isSharing = project?.shareSettings?.enabled;

  useEffect(() => {
    if (project?.shareSettings) {
      setPassword(project.shareSettings.password || '');
      setAllowComments(project.shareSettings.allowComments !== false);
      if (project.shareSettings.token && project.shareSettings.enabled) {
        const origin = window.location.origin;
        setShareUrl(`${origin}/review/${project.shareSettings.token}`);
      }
    }
  }, [project]);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await enableShareApi(project._id, {
        password: password || null,
        allowComments,
      });
      setShareUrl(res.data.shareUrl);
      onProjectUpdate({ ...project, shareSettings: res.data.shareSettings });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await updateShareApi(project._id, {
        password: password || null,
        allowComments,
      });
      onProjectUpdate({ ...project, shareSettings: res.data.shareSettings });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    try {
      await disableShareApi(project._id);
      setShareUrl('');
      onProjectUpdate({ ...project, shareSettings: { ...project.shareSettings, enabled: false } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Share Project</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Share link */}
          {isSharing && shareUrl && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Review Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Anyone with this link can view and leave feedback on your project.
              </p>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4">
            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Password protection (optional)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Allow comments toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Allow guest comments</p>
                <p className="text-xs text-gray-400">Guests can add pins and comments</p>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  allowComments ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                onClick={() => setAllowComments(!allowComments)}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    allowComments ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isSharing ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enabling...' : 'Enable Sharing'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDisable}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  Disable
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
