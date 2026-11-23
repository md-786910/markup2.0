import React, { useId, useState } from 'react';
import { transferOwnershipApi } from '../../services/workspaceService';
import { toast, toastError } from '../../utils/toast';
import Modal from '../common/Modal';
import { Button, Field, Input } from '../kc';

// The owner hands the organization to someone else and becomes an admin.
export default function TransferOwnershipDialog({ member, onClose, onTransferred }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordId = useId();
  if (!member) return null;

  const transfer = async (e) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const res = await transferOwnershipApi(member._id, password);
      toast.success(res.data?.message || 'Ownership transferred.');
      onTransferred();
      onClose();
    } catch (err) {
      if (err.response?.status === 400) setError(err.response.data?.message || 'Could not transfer ownership.');
      else toastError(err, 'Could not transfer ownership.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Transfer ownership" size="sm">
      <form className="space-y-4" onSubmit={transfer}>
        <p className="text-ui text-slate-600">
          <span className="font-medium text-slate-900">{member.name || member.email}</span> becomes the owner of this organization, with billing and deletion rights. You become an admin.
        </p>
        <Field id={passwordId} label="Your password" error={error}>
          <Input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={busy} disabled={!password}>Transfer ownership</Button>
        </div>
      </form>
    </Modal>
  );
}
