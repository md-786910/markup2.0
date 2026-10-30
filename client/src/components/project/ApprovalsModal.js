import { useState, useEffect } from 'react';
import { getApprovalsApi, recordMemberDecisionApi } from '../../services/projectService';
import { toast, toastError } from '../../utils/toast';

export default function ApprovalsModal({
  isOpen,
  onClose,
  project,
  onProjectUpdate,
  pins = [],
  canManage = false,
}) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState('approved');
  const [note, setNote] = useState('');
  const [showSignOff, setShowSignOff] = useState(false);

  // The open round is the pins not yet in a saved version (as the server counts them)
  const openPinsCount = pins.filter((p) => p.status !== 'resolved' && !p.version).length;
  const isRequireResolvedBlocked = project?.review?.requireAllResolved && openPinsCount > 0;
  const isPastDeadline = project?.review?.deadlineAt && new Date() > new Date(project?.review?.deadlineAt);

  useEffect(() => {
    // The decision history is for people who manage the project
    if (!isOpen || !project?._id || !canManage) return;
    setLoading(true);
    getApprovalsApi(project._id)
      .then((res) => {
        setApprovals(res.data.approvals || []);
      })
      .catch((err) => {
        toastError(err, 'Could not load approvals history.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, project?._id, canManage]);

  if (!isOpen) return null;

  const handleDecisionSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    if (decision === 'approved' && isRequireResolvedBlocked) {
      toastError(null, `Cannot approve: ${openPinsCount} open pins must be resolved first.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordMemberDecisionApi(project._id, {
        decision,
        note: note.trim(),
      });
      toast.success(decision === 'approved' ? 'Round approved successfully!' : 'Changes requested recorded.');
      setApprovals([res.data.approval, ...approvals.filter((a) => a._id !== res.data.approval._id)]);
      onProjectUpdate({ ...project, projectStatus: res.data.projectStatus });
      setShowSignOff(false);
      setNote('');
    } catch (err) {
      toastError(err, 'Failed to record decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 print:shadow-none print:max-h-none print:w-full print:border-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Client Approvals & Sign-Off</h2>
              <p className="text-xs text-gray-500">{project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
              title="Print formal approval certificate"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Download Record</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Print Header (Visible only when printed) */}
        <div className="hidden print:block p-8 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Approval Certificate</h1>
              <p className="text-sm text-gray-600 mt-1">Project: <strong>{project.name}</strong></p>
              <p className="text-xs text-gray-400 mt-0.5">Target: {project.websiteUrl || 'Document'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Generated</span>
              <p className="text-sm font-semibold text-gray-800">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-8">
          {/* Current Status Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <span className="text-xs text-gray-400 font-medium">Status</span>
              <p className="text-sm font-semibold capitalize mt-1 flex items-center gap-1.5">
                {project.projectStatus === 'approved' ? (
                  <span className="text-emerald-600 flex items-center gap-1">● Approved</span>
                ) : project.projectStatus === 'changes_requested' ? (
                  <span className="text-rose-600 flex items-center gap-1">● Changes requested</span>
                ) : (
                  <span className="text-blue-600 flex items-center gap-1">● In review</span>
                )}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <span className="text-xs text-gray-400 font-medium">Open Items</span>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {openPinsCount} {openPinsCount === 1 ? 'pin' : 'pins'} unresolved
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <span className="text-xs text-gray-400 font-medium">Feedback Deadline</span>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {project.review?.deadlineAt ? (
                  <span className={isPastDeadline ? 'text-amber-600' : 'text-gray-700'}>
                    {new Date(project.review.deadlineAt).toLocaleDateString()}
                    {isPastDeadline && ' (Closed)'}
                  </span>
                ) : (
                  'No deadline set'
                )}
              </p>
            </div>
          </div>

          {/* Member Decision Action Toggle */}
          {!showSignOff && !isPastDeadline && (
            <div className="flex justify-between items-center bg-blue-50/60 border border-blue-100 rounded-xl p-4 print:hidden">
              <div>
                <p className="text-sm font-semibold text-blue-900">Record a sign-off decision</p>
                <p className="text-xs text-blue-700 mt-0.5">Submit an approval or change request on behalf of the team</p>
              </div>
              <button
                onClick={() => setShowSignOff(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Sign Off Round
              </button>
            </div>
          )}

          {/* Sign-off Form */}
          {showSignOff && (
            <form onSubmit={handleDecisionSubmit} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3.5 animate-scale-in print:hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800">Your Sign-Off Decision</span>
                <button
                  type="button"
                  onClick={() => setShowSignOff(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('approved')}
                  disabled={isRequireResolvedBlocked}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                    decision === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  } ${isRequireResolvedBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>✓</span> Approve Round
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('changes_requested')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                    decision === 'changes_requested'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>✎</span> Request Changes
                </button>
              </div>

              {isRequireResolvedBlocked && decision === 'approved' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ This project requires all pins to be resolved before approval ({openPinsCount} open).
                </p>
              )}

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Decision Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add details, feedback, or conditions for this decision..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting || (decision === 'approved' && isRequireResolvedBlocked)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          )}

          {/* Audit History List */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Decision History & Audit Trail ({approvals.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-xs text-gray-400">Loading history...</div>
            ) : approvals.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-500">No decisions recorded yet for this project.</p>
                <p className="text-[11px] text-gray-400 mt-1">Clients can sign off from the shared review link.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((appr) => {
                  const isApproved = appr.decision === 'approved';
                  const reviewerName = appr.reviewer?.user?.name || appr.reviewer?.guestName || 'Anonymous Reviewer';
                  const reviewerEmail = appr.reviewer?.user?.email || appr.reviewer?.guestEmail;
                  const isGuest = !appr.reviewer?.user;

                  return (
                    <div
                      key={appr._id}
                      className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-2 print:border-gray-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isApproved ? '✓ Approved' : '✎ Changes Requested'}
                          </span>
                          <span className="text-xs font-medium text-gray-800">{reviewerName}</span>
                          {isGuest && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                              Guest
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {new Date(appr.updatedAt || appr.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {appr.note && (
                        <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                          "{appr.note}"
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1">
                        {reviewerEmail && <span>Email: {reviewerEmail}</span>}
                        <span>Snapshot: {appr.openPinsAtDecision} open pins</span>
                        {appr.ip && <span className="print:inline">IP: {appr.ip}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
