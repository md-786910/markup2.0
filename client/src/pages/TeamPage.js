import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, PageHeader } from '../components/kc';
import TeamView from '../components/team/TeamView';
import { useAuth } from '../hooks/useAuth';
import { useShell } from '../contexts/ShellContext';
import { getProjectsApi } from '../services/projectService';
import { toastError } from '../utils/toast';

const VIEWS = ['members', 'invites', 'guests'];

// Team area (rail: Team; panel: Members, Pending invites, Guests).
// `?view=` picks the table.
export default function TeamPage() {
  const { user, isAdmin } = useAuth();
  const { setCounts } = useShell();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const requested = searchParams.get('view');
  const view = VIEWS.includes(requested) ? requested : 'members';

  const loadProjects = useCallback(() => {
    getProjectsApi()
      .then((res) => setProjects(res.data.projects || []))
      .catch((err) => toastError(err, 'Could not load your projects.'))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Unique people across all projects, each with the projects they are on
  const members = useMemo(() => {
    const out = [];
    const seen = new Set();
    projects.forEach((project) => {
      (project.members || []).forEach((member) => {
        if (seen.has(member._id)) return;
        seen.add(member._id);
        out.push({ ...member, projects: projects.filter((p) => (p.members || []).some((m) => m._id === member._id)) });
      });
    });
    return out;
  }, [projects]);

  const orgName = user?.orgName || 'your organization';

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={isAdmin ? `Members, guests and pending invitations for ${orgName}.` : `The people you work with in ${orgName}.`}
        actions={isAdmin ? <Button variant="primary" icon="plus" onClick={() => setInviteOpen(true)}>Invite people</Button> : null}
      />
      <TeamView
        view={view}
        ready={loaded}
        members={members}
        projects={projects}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onProjectsChanged={loadProjects}
        inviteOpen={inviteOpen}
        onInviteOpenChange={setInviteOpen}
        onCounts={setCounts}
      />
    </div>
  );
}
