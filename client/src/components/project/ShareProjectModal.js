import { useState, useEffect } from 'react';
import { enableShareApi, updateShareApi, disableShareApi, updateReviewSettingsApi } from '../../services/projectService';
import { confirmDialog } from '../../utils/confirm';
import { toast } from '../../utils/toast';
import Modal from '../common/Modal';
import { Button, DatePicker, Field, Input } from '../ui';

// "YYYY-MM-DDTHH:mm" in the viewer's own time zone, the format a
// datetime-local input shows and gives back (it is read as local time on save;
// toISOString() here would be UTC and move the deadline by the UTC offset)
function toLocalInputValue(date) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function SectionTitle({ children }) {
  return <h4 className="text-ui font-semibold text-gray-900">{children}</h4>;
}

export default function ShareProjectModal({ isOpen, onClose, project, onProjectUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // The saved password is never sent to the browser (only hasPassword): the
  // field holds a new password, and an empty field keeps the current one
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState('');
  const [deadlineMessage, setDeadlineMessage] = useState('');
  // When the review link stops working (empty = no end date)
  const [expiresAt, setExpiresAt] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const isSharing = project?.shareSettings?.enabled;
  const hasPassword = !!project?.shareSettings?.hasPassword;
  const savedDeadlineAt = project?.review?.deadlineAt ? toLocalInputValue(project.review.deadlineAt) : '';
  const savedDeadlineMessage = project?.review?.deadlineMessage || '';
  const savedExpiresAt = project?.shareSettings?.expiresAt ? toLocalInputValue(project.shareSettings.expiresAt) : '';

  useEffect(() => {
    if (project?.shareSettings) {
      setPassword('');
      setRemovePassword(false);
      setExpiresAt(project.shareSettings.expiresAt ? toLocalInputValue(project.shareSettings.expiresAt) : '');
      if (project.shareSettings.token && project.shareSettings.enabled) {
        setShareUrl(`${window.location.origin}/review/${project.shareSettings.token}`);
      }
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
      // Review links are view-only: clients see the site and the feedback
      const res = await enableShareApi(project._id, { password: null, allowComments: false });
      setShareUrl(res.data.shareUrl);
      onProjectUpdate({ ...project, shareSettings: res.data.shareSettings });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the review link.');
    } finally {
      setLoading(false);
    }
  };

  // Turns the link off: guests with it can no longer open the project.
  // Turning it on again brings back the same link.
  const handleDisable = async () => {
    const ok = await confirmDialog({
      title: 'Turn off the review link?',
      message: 'Anyone with the link can no longer open this project or leave feedback. Turning it on again brings back the same link.',
      confirmLabel: 'Turn off link',
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    try {
      await disableShareApi(project._id);
      onProjectUpdate({ ...project, shareSettings: { ...project.shareSettings, enabled: false } });
      setShareUrl('');
      toast.success('Review link turned off.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not turn off the link.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const newPassword = password.trim();
    if (newPassword && newPassword.length < 6) {
      setError('The password needs at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const shareUpdate = {};
      if (newPassword) shareUpdate.password = newPassword;
      else if (removePassword) shareUpdate.password = null;
      if (expiresAt !== savedExpiresAt) shareUpdate.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
      const shareRes = await updateShareApi(project._id, shareUpdate);
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
        review: reviewRes ? reviewRes.data.review : project.review,
      });
      toast.success('Review link settings saved.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the link and copy it yourself.');
    }
  };

  const footer = isSharing ? (
    <>
      <Button variant="danger-soft" onClick={handleDisable} disabled={loading} className="mr-auto">Turn off link</Button>
      <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant="primary" onClick={handleUpdate} loading={loading}>Save settings</Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant="primary" onClick={handleEnable} loading={loading}>Create review link</Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share with clients" size="xl" footer={footer}>
      <div className="max-h-[65vh] overflow-y-auto -mx-5 px-5 space-y-6">
        {!isSharing && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-ui font-medium text-gray-900">This project isn't shared yet</p>
            <p className="text-ui text-gray-600 mt-1">
              A review link lets clients open this project and see its feedback without an account. You can add a password and an end date, and turn the link off at any time.
            </p>
          </div>
        )}

        {isSharing && shareUrl && (
          <section className="space-y-2">
            <SectionTitle>Review link</SectionTitle>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-label="Review link"
                className="font-mono text-caption bg-gray-50"
              />
              <Button variant={copied ? 'secondary' : 'primary'} onClick={handleCopy} className="shrink-0">
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            <p className="text-caption text-gray-500">
              Anyone with this link can view the project and its feedback.
              {hasPassword && !removePassword ? ' They need the password to open it.' : ''}
            </p>
          </section>
        )}

        {isSharing && (
          <>
            <section className="space-y-4 border-t border-gray-100 pt-5">
              <SectionTitle>Access</SectionTitle>
              <Field
                label="Password (optional)"
                htmlFor="share-password"
                hint={hasPassword && !removePassword ? 'A password is set. Type a new one to change it.' : 'At least 6 characters. Leave empty for no password.'}
              >
                <Input
                  id="share-password"
                  type="text"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (e.target.value) setRemovePassword(false); }}
                  disabled={removePassword}
                  placeholder={hasPassword && !removePassword ? 'New password' : 'No password'}
                />
              </Field>
              {hasPassword && (
                <label className="flex items-center gap-2 text-ui text-gray-700 cursor-pointer -mt-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-blue-600"
                    checked={removePassword}
                    onChange={(e) => { setRemovePassword(e.target.checked); if (e.target.checked) setPassword(''); }}
                  />
                  Remove the password
                </label>
              )}
              <Field label="Link ends (optional)" hint="After this time the link stops working.">
                <DatePicker withTime value={expiresAt} onChange={setExpiresAt} placeholder="No end date" ariaLabel="Review link end date" />
              </Field>
            </section>

            <section className="space-y-4 border-t border-gray-100 pt-5">
              <SectionTitle>Feedback deadline</SectionTitle>
              <Field label="Close feedback after (optional)" hint="After this time, new pins and comments are refused, except from people who manage the project.">
                <DatePicker withTime value={deadlineAt} onChange={setDeadlineAt} placeholder="No deadline" ariaLabel="Feedback deadline" />
              </Field>
              {deadlineAt && (
                <Field label="Message shown when feedback is closed" htmlFor="deadline-message">
                  <Input
                    id="deadline-message"
                    value={deadlineMessage}
                    onChange={(e) => setDeadlineMessage(e.target.value)}
                    placeholder="e.g. Feedback for this round closed on 30 October."
                  />
                </Field>
              )}
            </section>

          </>
        )}

        {error && <p role="alert" className="text-ui text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
