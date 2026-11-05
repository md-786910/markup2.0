import React, { useEffect, useId, useState } from 'react';
import { removeMemberApi } from '../../services/projectService';
import { toast, toastError } from '../../utils/toast';
import Modal from '../common/Modal';
import { Button, Field, Select } from '../kc';

// Takes one person off one of their projects; they stay in the organization.
export default function RemoveFromProjectDialog({ member, onClose, onRemoved }) {
  const [projectId, setProjectId] = useState(member?.projects?.[0]?._id || '');
  const [busy, setBusy] = useState(false);
  const selectId = useId();
  useEffect(() => { setProjectId(member?.projects?.[0]?._id || ''); }, [member]);
  if (!member) return null;

  const remove = async () => {
    setBusy(true);
    try {
      await removeMemberApi(projectId, member._id);
      toast.success(`${member.name || member.email} was removed from the project.`);
      onRemoved();
      onClose();
    } catch (err) {
      toastError(err, 'Could not remove them from the project.');
    } finally {
      setBusy(false);
    }
  };

  const projects = member.projects || [];
  return (
    <Modal isOpen onClose={onClose} title="Remove from a project" size="sm">
      <div className="space-y-4">
        <p className="text-ui text-slate-600">
          <span className="font-medium text-slate-900">{member.name || member.email}</span> loses access to the project you choose. They stay in your organization.
        </p>
        {projects.length > 1 ? (
          <Field id={selectId} label="Project">
            <Select id={selectId} value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projects.map((p) => ({ value: p._id, label: p.name }))} />
          </Field>
        ) : projects[0] ? (
          <p className="text-ui text-slate-600">Project: <span className="font-medium text-slate-900">{projects[0].name}</span></p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={!projectId} onClick={remove}>Remove from project</Button>
        </div>
      </div>
    </Modal>
  );
}
