import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateProfileApi } from '../../services/authService';
import { getProjectsApi, updateProjectEmailNotificationsApi } from '../../services/projectService';
import { PROJECT_TYPES } from '../../utils/projectConstants';
import { toast, toastError } from '../../utils/toast';
import { Icon, PillMenu, Row, Section, Toggle, cx } from '../kc';
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

  // Search and filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'enabled' | 'muted'
  const [typeFilter, setTypeFilter] = useState(null); // null | 'website' | 'document'

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

  const statusItems = [
    { id: 'all', label: 'All' },
    { id: 'enabled', label: 'Enabled' },
    { id: 'muted', label: 'Muted' },
  ];

  const hasFilter = statusFilter !== 'all' || typeFilter !== null || search.trim() !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter(null);
    setSearch('');
  };

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const enabled = !user?.mutedProjectEmails?.includes(p._id);
      if (statusFilter === 'enabled' && !enabled) return false;
      if (statusFilter === 'muted' && enabled) return false;
      const pType = p.projectType || 'website';
      if (typeFilter && pType !== typeFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, user?.mutedProjectEmails, statusFilter, typeFilter, search]);

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

          {!projectsLoading && projects.length > 0 && (
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="kc-fb-wrap" role="toolbar" aria-label="Filter notification projects">
                <div className="kc-fb-row-top">
                  <div className="kc-fb-status" role="group" aria-label="Filter status">
                    {statusItems.map((it) => {
                      const on = it.id === statusFilter;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          className={cx('kc-pill', on && 'on')}
                          aria-pressed={on}
                          onClick={() => setStatusFilter(it.id)}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="kc-fb-dropdowns">
                    <PillMenu
                      label="Websites and documents"
                      icon={typeFilter === 'document' ? 'doc' : (typeFilter === 'website' ? 'globe' : 'layers')}
                      options={PROJECT_TYPES}
                      value={typeFilter}
                      onChange={setTypeFilter}
                      allLabel="Websites and documents"
                    />
                    {hasFilter && (
                      <button
                        type="button"
                        className="kc-link"
                        style={{ fontSize: 12, border: 0, background: 'none', padding: '0 4px', cursor: 'pointer', color: 'var(--slate-500)' }}
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
                <div className="kc-fb-end">
                  <div className="kc-filter-search">
                    <span className="kc-filter-search-icon">
                      <Icon name="search" size={14} />
                    </span>
                    <input
                      type="search"
                      className="kc-filter-search-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setSearch(''); }}
                      placeholder="Search projects"
                      aria-label="Search projects"
                    />
                    {search && (
                      <button
                        type="button"
                        className="kc-filter-search-clear"
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {projectsLoading ? (
            <div style={{ paddingTop: 14 }}><Muted>Loading projects…</Muted></div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <Muted>{hasFilter ? 'No projects match your filter.' : 'No projects found.'}</Muted>
              {hasFilter && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="kc-link"
                    style={{ fontSize: 13, border: 0, background: 'none', cursor: 'pointer' }}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredProjects.map((p, i) => {
              const enabled = !user?.mutedProjectEmails?.includes(p._id);
              const pType = p.projectType || 'website';
              return (
                <Row
                  key={p._id}
                  padded
                  last={i === filteredProjects.length - 1}
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name={pType === 'document' ? 'doc' : 'globe'} size={14} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
                      <span>{p.name}</span>
                    </span>
                  }
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
            })
          )}
        </div>
      </Section>
    </SettingsLayout>
  );
}
