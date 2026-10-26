import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getUserDetailApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Avatar, Card, DefinitionList, PageHeader } from '../components/common/ui';
import { PlanBadge, Pill, RoleBadge } from '../components/common/StatusBadge';
import { formatDate, formatDateTime, formatLocation, timeAgo } from '../utils/formatters';

export default function UserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserDetailApi(id)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data) return <p className="py-10 text-center text-gray-500">Person not found.</p>;

  const { user, projects } = data;
  const org = user.organization;

  const projectColumns = [
    {
      key: 'name',
      label: 'Project',
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="max-w-[260px] truncate text-xs text-gray-500">{row.websiteUrl?.replace(/^https?:\/\//, '') || 'Document'}</p>
        </div>
      ),
    },
    { key: 'type', label: 'Type', render: (row) => (row.projectType === 'website' ? 'Website' : 'Document') },
    { key: 'status', label: 'Status', render: (row) => <Pill tone={row.status === 'active' ? 'green' : 'gray'}>{row.status === 'active' ? 'Active' : 'Archived'}</Pill> },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        back={{ to: '/users', label: 'People' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={user.name} size="lg" />
            <span>{user.name}</span>
            <RoleBadge role={user.role} />
          </span>
        }
      >
        <p className="mt-2 text-sm text-gray-500">{user.email} · Joined {formatDate(user.createdAt)}</p>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Organization">
          {org ? (
            <Link to={`/organizations/${org._id}`} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
              <Avatar name={org.name} square />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{org.name}</span>
                {org.isLocked && <span className="text-xs font-medium text-red-600">Locked</span>}
              </span>
              <PlanBadge plan={org.plan} />
            </Link>
          ) : (
            <p className="text-sm text-gray-500">Not part of an organization.</p>
          )}
        </Card>

        <Card title="Activity">
          <DefinitionList
            items={[
              ['Last active', <span title={formatDateTime(user.lastSeen)}>{timeAgo(user.lastSeen)}</span>],
              ['Email notifications', user.emailNotificationsEnabled === false ? 'Off' : 'On'],
              ['Projects muted', user.mutedProjectEmails?.length || 0],
            ]}
          />
        </Card>

        <Card title="Sign-in locations">
          <DefinitionList
            items={[
              ['Last sign-in', formatLocation(user.lastLoginLocation)],
              user.lastLoginIp && ['Last IP', <span className="font-mono text-xs">{user.lastLoginIp}</span>],
              ['Signed up from', formatLocation(user.signupLocation)],
              user.signupIp && ['Signup IP', <span className="font-mono text-xs">{user.signupIp}</span>],
            ]}
          />
        </Card>
      </div>

      <Card title="Projects" description="Projects this person was added to directly" padded={false} className="mt-6">
        <DataTable columns={projectColumns} data={projects} emptyMessage="Not added to any project directly" emptyDescription="They may still see projects through a workspace or as an owner or admin." />
      </Card>
    </div>
  );
}
