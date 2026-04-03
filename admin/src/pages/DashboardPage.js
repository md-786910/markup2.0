import React, { useState, useEffect } from 'react';
import { getStatsApi } from '../services/adminService';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import { formatDate, timeAgo, formatNumber } from '../utils/formatters';
import { PLAN_COLORS, PLAN_LABELS } from '../config/plans';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStatsApi()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <p className="text-gray-500 py-10 text-center">Failed to load stats.</p>;

  const activeSubscriptions = (stats.subscriptionStats?.active || 0);

  const signupColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'org', label: 'Organization', render: (row) => row.organization?.name || '—' },
    { key: 'createdAt', label: 'Joined', render: (row) => formatDate(row.createdAt) },
  ];

  const activityColumns = [
    { key: 'actor', label: 'Actor', render: (row) => row.actor?.name || row.actorGuest?.name || '—' },
    { key: 'action', label: 'Action', render: (row) => (
      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{row.action}</span>
    )},
    { key: 'project', label: 'Project', render: (row) => row.project?.name || '—' },
    { key: 'createdAt', label: 'When', render: (row) => timeAgo(row.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Organizations"
          value={formatNumber(stats.totalOrgs)}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18" /></svg>}
        />
        <StatCard
          label="Total Users"
          value={formatNumber(stats.totalUsers)}
          color="purple"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
        />
        <StatCard
          label="Active Users (7d)"
          value={formatNumber(stats.activeUsers)}
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>}
        />
        <StatCard
          label="Active Subscriptions"
          value={formatNumber(activeSubscriptions)}
          color="amber"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
        />
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Plan Distribution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {['trial', 'free', 'starter', 'pro', 'enterprise'].map((plan) => (
            <div key={plan} className="text-center p-3 bg-gray-50 rounded-lg">
              <Badge label={PLAN_LABELS[plan] || plan} color={PLAN_COLORS[plan] || 'gray'} />
              <p className="text-xl font-bold text-gray-900 mt-2">{stats.planBreakdown[plan] || 0}</p>
              <p className="text-xs text-gray-500">orgs</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Signups</h2>
          <DataTable columns={signupColumns} data={stats.recentSignups} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <DataTable columns={activityColumns} data={stats.recentActivity} />
        </div>
      </div>
    </div>
  );
}
