import { useState, useEffect } from 'react';
import { enableShareApi, updateShareApi, updateProjectApi, updateReviewSettingsApi } from '../../services/projectService';
import useEscape from '../../hooks/useEscape';

// "YYYY-MM-DDTHH:mm" in the viewer's own time zone, the format a
// datetime-local input shows and gives back (it is read as local time on save;
// toISOString() here would be UTC and move the deadline by the UTC offset)
function toLocalInputValue(date) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function ShareProjectModal({ isOpen, onClose, project, onProjectUpdate }) {
  useEscape(onClose, isOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [captureConsoleErrors, setCaptureConsoleErrors] = useState(true);
  const [guestConsoleCapture, setGuestConsoleCapture] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState('');
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const isSharing = project?.shareSettings?.enabled;
  const savedDeadlineAt = project?.review?.deadlineAt ? toLocalInputValue(project.review.deadlineAt) : '';
  const savedDeadlineMessage = project?.review?.deadlineMessage || '';

  useEffect(() => {
    if (project?.shareSettings) {
      setPassword(project.shareSettings.password || '');
      setAllowComments(project.shareSettings.allowComments !== false);
      if (project.shareSettings.token && project.shareSettings.enabled) {
        const origin = window.location.origin;
        setShareUrl(`${origin}/review/${project.shareSettings.token}`);
      }
    }
    if (project?.settings) {
      setCaptureConsoleErrors(project.settings.captureConsoleErrors !== false);
      setGuestConsoleCapture(!!project.settings.guestConsoleCapture);
    }
    if (project?.review) {
      setDeadlineAt(project.review.deadlineAt ? toLocalInputValue(project.review.deadlineAt) : '');
      setDeadlineMessage(project.review.deadlineMessage || '');
    }
  }, [project]);

  // A public review link is only created when someone asks for one (opening
  // this dialog must not publish the project)
  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await enableShareApi(project._id, { password: null, allowComments: true });
      setShareUrl(res.data.shareUrl);
      onProjectUpdate({ ...project, shareSettings: res.data.shareSettings });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable sharing');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleUpdate = async () => {
    setLoading(true);
    setError('');
    try {
      const shareRes = await updateShareApi(project._id, {
        password: password || null,
        allowComments,
      });
      const projRes = await updateProjectApi(project._id, {
        settings: {
          captureConsoleErrors,
          guestConsoleCapture,
        },
      });
      // Deadlines are a plan feature: only save them when they changed, so the
      // other share settings save on plans without it
      const deadlineChanged = deadlineAt !== savedDeadlineAt || (deadlineAt && deadlineMessage !== savedDeadlineMessage);
      const reviewRes = deadlineChanged
        ? await updateReviewSettingsApi(project._id, {
          deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
          deadlineMessage,
        })
        : null;
      onProjectUpdate({
        ...project,
        shareSettings: shareRes.data.shareSettings,
        settings: projRes.data.project?.settings || { ...project.settings, captureConsoleErrors, guestConsoleCapture },
        review: reviewRes ? reviewRes.data.review : project.review,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-body-lg font-semibold text-gray-900">Share Project</h3>
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
          {!isSharing && (
            <div className="space-y-4">
              <p className="text-body-sm text-gray-600">
                Create a review link to let clients view this project and leave feedback without an account. You can add a password and turn it off at any time.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 text-label text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-label text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Creating link...' : 'Create review link'}
                </button>
              </div>
            </div>
          )}

          {/* Share link */}
          {isSharing && shareUrl && (
            <div>
              <label className="text-overline text-gray-500 mb-2 block">
                Review Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-body bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 text-label rounded-lg transition-colors shrink-0 ${copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-caption text-gray-400 mt-1.5">
                Anyone with this link can view and leave feedback on your project.
              </p>
            </div>
          )}

          {/* Settings */}
          {isSharing && <div className="space-y-4">
            {/* Password */}
            <div>
              <label className="text-label text-gray-700 mb-1.5 block">
                Password protection (optional)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Allow comments toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-body-sm font-medium text-gray-700">Allow guest comments</p>
                <p className="text-caption text-gray-400">Guests can add pins and comments</p>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${allowComments ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                onClick={() => setAllowComments(!allowComments)}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowComments ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                />
              </div>
            </label>

            {/* Team console errors capture toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-body-sm font-medium text-gray-700">Capture team console errors</p>
                <p className="text-caption text-gray-400">Collect browser errors and network logs for pins created by team</p>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${captureConsoleErrors ? 'bg-blue-600' : 'bg-gray-200'}`}
                onClick={() => setCaptureConsoleErrors(!captureConsoleErrors)}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${captureConsoleErrors ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                />
              </div>
            </label>

            {/* Guest console errors capture toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-body-sm font-medium text-gray-700">Capture guest console errors</p>
                <p className="text-caption text-gray-400">Collect browser errors and network logs from guest reviewers</p>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${guestConsoleCapture ? 'bg-blue-600' : 'bg-gray-200'}`}
                onClick={() => setGuestConsoleCapture(!guestConsoleCapture)}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${guestConsoleCapture ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                />
              </div>
            </label>

            <div className="pt-2 border-t border-gray-100">
              <span className="text-overline text-gray-400 block mb-3">
                Review policy
              </span>

              {/* Feedback deadline */}
              <div className="space-y-1.5 mb-3">
                <label className="text-label text-gray-700 block">Feedback deadline (optional)</label>
                <p className="text-caption text-gray-400">New feedback is politely refused after this time</p>
                <input
                  type="datetime-local"
                  value={deadlineAt}
                  onChange={(e) => setDeadlineAt(e.target.value)}
                  className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {deadlineAt && (
                <div className="space-y-1">
                  <label className="text-label text-gray-700 block">Closed feedback notice</label>
                  <input
                    type="text"
                    value={deadlineMessage}
                    onChange={(e) => setDeadlineMessage(e.target.value)}
                    placeholder="e.g. Feedback for this round closed on 30 Oct."
                    className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>}

          {error && (
            <p className="text-body-sm text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          {isSharing && (
            <div className="flex gap-3">
              <>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 text-label text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-label text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
