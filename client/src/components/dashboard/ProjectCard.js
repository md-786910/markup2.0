import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PROJECT_STATUSES, statusInfo } from '../../utils/projectConstants';
import { useAuth } from '../../hooks/useAuth';
import { updateProjectEmailNotificationsApi } from '../../services/projectService';
import { toastError } from '../../utils/toast';
import { relativeTime } from '../../utils/relativeTime';
import { AvatarStack, Badge, Icon, ProjectThumb, RowMenu, toneFor } from '../kc';

// Where the wireframe thumbnail draws its pins. The list API has counts, not
// pin positions, so the spots are fixed per project (stable across renders).
const SPOTS = [[30, 40], [70, 62], [55, 30], [22, 70], [78, 35]];
function thumbPins(project) {
  const open = project.openPinCount || 0;
  const resolved = project.resolvedPinCount || 0;
  const start = toneFor(project._id) % SPOTS.length;
  const spot = (i) => SPOTS[(start + i) % SPOTS.length];
  const pins = [];
  for (let i = 0; i < Math.min(open, 2); i++) pins.push([...spot(i), String(i + 1)]);
  if (resolved > 0 && pins.length < 3) pins.push([...spot(pins.length), '', true]);
  return pins;
}

// One reviewable website or document (design system ProjectCard): wireframe
// thumbnail with pins, name, status badge, open and resolved counts, people
// and last update. The whole card is the link; the ⋯ menu sits on top.
export default function ProjectCard({ project, isAdmin, userId, onEdit, onArchive, onConfirmDelete, onStatusChange }) {
  const { user, updateUser } = useAuth();
  const [emailToggling, setEmailToggling] = useState(false);

  const isEmailOn = !user?.mutedProjectEmails?.includes(project._id);
  const isOwner = project.owner?._id === userId || project.owner === userId;
  const canManage = isAdmin || isOwner;
  const isDoc = project.projectType === 'document';
  const status = statusInfo(project.projectStatus);
  const open = project.openPinCount || 0;
  const resolved = project.resolvedPinCount || 0;

  const toggleEmails = async () => {
    if (emailToggling) return;
    setEmailToggling(true);
    try {
      const res = await updateProjectEmailNotificationsApi(project._id, !isEmailOn);
      if (res.data?.mutedProjectEmails) updateUser({ mutedProjectEmails: res.data.mutedProjectEmails });
    } catch (err) {
      toastError(err, 'Could not update email notifications for this project.');
    } finally {
      setEmailToggling(false);
    }
  };

  const menu = [
    { label: isEmailOn ? 'Mute email alerts' : 'Turn on email alerts', icon: 'mail', onClick: toggleEmails, disabled: emailToggling },
    ...(canManage ? [
      { label: 'Edit project', icon: 'edit', onClick: () => onEdit(project) },
      { divider: true },
      { header: 'Status' },
      ...PROJECT_STATUSES.map((s) => ({
        label: s.label,
        checked: (project.projectStatus || 'not_started') === s.value,
        onClick: () => onStatusChange?.(project, s.value),
      })),
      { divider: true },
      { label: project.status === 'active' ? 'Archive' : 'Restore', icon: project.status === 'active' ? 'archive' : 'restore', onClick: () => onArchive(project) },
      { label: 'Delete project', icon: 'trash', tone: 'danger', onClick: () => onConfirmDelete(project) },
    ] : []),
  ];

  return (
    <div className="kc-card-wrap">
      <Link to={`/project/${project._id}`} target="_blank" rel="noopener noreferrer" className="kc-card hover" aria-label={`Open ${project.name}`}>
        <ProjectThumb type={isDoc ? 'doc' : 'web'} pins={thumbPins(project)} />
        <div className="kc-cb">
          <div className="kc-ct1">
            <Icon name={isDoc ? 'doc' : 'globe'} size={15} />
            <span title={project.name}>{project.name}</span>
          </div>
          <div className="kc-cm">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="n">{open} open · {resolved} resolved</span>
          </div>
          <div className="kc-cm">
            <AvatarStack people={project.members || []} />
            <span>Updated {relativeTime(project.updatedAt || project.createdAt)}</span>
          </div>
        </div>
      </Link>
      <div className="kc-card-menu">
        <RowMenu items={menu} label={`Actions for ${project.name}`} />
      </div>
    </div>
  );
}
