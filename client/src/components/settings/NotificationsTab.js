import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateProfileApi } from '../../services/authService';
import { getProjectsApi, updateProjectEmailNotificationsApi } from '../../services/projectService';
import { toast, toastError } from '../../utils/toast';
import { Row, Section, Toggle } from '../kc';
import SettingsLayout, { Muted } from './SettingsLayout';

// Settings → Notifications: the global notification-email switch and the
// per-project mutes (User.emailNotificationsEnabled, User.mutedProjectEmails).
// Switches save on change; there is no footer.
export default function NotificationsTab() {
  const { user, updateUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const allEnabled = user?.emailNotificationsEnabled !== false;

  useEffect(() => {
    getProjectsApi()
      .then((res) => setProjects(res.data.projects || []))
      .catch((err) => toastError(err, 'Could not load your projects.'))
      .finally(() => setProjectsLoading(false));
  }, []);

  const toggleAll = async (next) => {
    setGlobalSaving(true);
    try {
      const res = await updateProfileApi({ emailNotificationsEnabled: next });
      updateUser(res.data.user);
      toast.success('Saved');
    } catch (err) {
      toastError(err, 'Could not update email notifications.');
    } finally {
      setGlobalSaving(false);
    }
  };

  const toggleProject = async (projectId, next) => {
    if (togglingId === projectId) return;
    setTogglingId(projectId);
    try {
      const res = await updateProjectEmailNotificationsApi(projectId, next);
      if (res.data?.mutedProjectEmails) updateUser({ mutedProjectEmails: res.data.mutedProjectEmails });
      toast.success('Saved');
    } catch (err) {
      toastError(err, 'Could not update email notifications for this project.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <SettingsLayout title="Notifications" subtitle="Choose which emails you get about your projects.">
      <Section title="Email" description="Account and billing emails are always sent.">
        <div>
          <Row
            padded
            last={!projectsLoading && projects.length === 0}
            title="Notification emails"
            description="Pins, comments, mentions and status changes on every project."
          >
            <Toggle label="Notification emails" checked={allEnabled} disabled={globalSaving} onChange={toggleAll} />
          </Row>
          {projectsLoading ? (
            <div style={{ paddingTop: 14 }}><Muted>Loading projects…</Muted></div>
          ) : projects.map((p, i) => {
            const enabled = !user?.mutedProjectEmails?.includes(p._id);
            return (
              <Row
                key={p._id}
                padded
                last={i === projects.length - 1}
                title={p.name}
                description={!allEnabled
                  ? 'Off while notification emails are off.'
                  : enabled ? 'Comment, mention and status emails for this project.' : 'Muted. No emails from this project.'}
              >
                <Toggle
                  label={`Emails for ${p.name}`}
                  checked={allEnabled && enabled}
                  disabled={!allEnabled || togglingId === p._id}
                  onChange={(next) => toggleProject(p._id, next)}
                />
              </Row>
            );
          })}
        </div>
      </Section>
    </SettingsLayout>
  );
}
