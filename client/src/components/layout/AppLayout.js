import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import OrgLockedBanner from '../common/OrgLockedBanner';
import PendingPaymentBanner from '../common/PendingPaymentBanner';
import NotificationBell from '../common/NotificationBell';
import TrialBadge from '../common/TrialBadge';
import WorkspaceSwitcher, { workspaceTone } from './WorkspaceSwitcher';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { ShellProvider, useShell } from '../../contexts/ShellContext';
import { openSupport } from '../../utils/supportPanel';
import { openChat, chatAvailable } from '../../utils/supportChat';
import { uploadUrl } from '../../utils/uploadUrl';
import { Avatar, Icon, IconButton, Logo, Menu, Tile, cx, useDismiss } from '../kc';
import {
  AREAS, PROJECT_VIEWS, PROJECT_TYPES_NAV, INTEGRATION_PROVIDERS, SETTINGS_PAGES, areaOf, activeItemOf,
} from './shellNav';

// Layout C: a 60px dark icon rail, a 232px light context panel that changes
// with the rail area, and a 56px header (breadcrumb) above the
// scrolling content. Below 1024px the panel is a drawer; below 640px the rail
// becomes a bottom bar. Spec: kommently-design-system/shell.md.
export default function AppLayout() {
  return (
    <ShellProvider>
      <Shell />
    </ShellProvider>
  );
}

function useVisibleAreas() {
  const { canManage } = useAuth();
  return AREAS.filter((a) => !a.managersOnly || canManage);
}

// Panel groups for an area: [{ label?, items: [{ id, label, icon, to, count?, dot?, lock? }] }]
function usePanel(area) {
  const { user, isAdmin } = useAuth();
  const { workspaces } = useWorkspaces();
  const { counts } = useShell();
  const managesAWorkspace = workspaces.some((w) => w.myLevel === 'manage');

  if (area === 'projects') {
    return {
      groups: [
        { label: 'Views', items: PROJECT_VIEWS.map((v) => ({ ...v, count: counts[`projects.${v.id}`] })) },
        { label: 'Type', items: PROJECT_TYPES_NAV.map((v) => ({ ...v, count: counts[`projects.${v.id}`] })) },
      ],
    };
  }
  if (area === 'team') {
    return {
      title: 'Team',
      groups: [{
        items: [
          { id: 'members', label: 'Members', icon: 'team', to: '/team', count: counts['team.members'] },
          isAdmin && { id: 'invites', label: 'Pending invites', icon: 'mail', to: '/team?view=invites', count: counts['team.invites'] },
          { id: 'guests', label: 'Guests', icon: 'user', to: '/team?view=guests', count: counts['team.guests'] },
        ].filter(Boolean),
      }],
    };
  }
  if (area === 'integrations') {
    const locked = !user?.orgLimits?.hasIntegrations;
    return {
      title: 'Integrations',
      groups: [{ items: INTEGRATION_PROVIDERS.map((p) => ({ id: p.id, label: p.label, icon: 'link', to: `/integrations?provider=${p.id}`, lock: locked })) }],
    };
  }
  const visible = SETTINGS_PAGES.filter((p) => (p.who === 'admins' ? isAdmin : p.who === 'managers' ? isAdmin || managesAWorkspace : true));
  const groups = [];
  visible.forEach((p) => {
    let g = groups.find((x) => x.label === p.group);
    if (!g) { g = { label: p.group, items: [] }; groups.push(g); }
    g.items.push({ ...p, dot: p.id === 'billing' && !!user?.orgPendingInvoice });
  });
  return { title: 'Settings', groups };
}

function Shell() {
  const location = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, orgLocked, logout } = useAuth();
  const { current: workspace } = useWorkspaces();
  const areas = useVisibleAreas();
  const area = areaOf(location.pathname);
  const active = activeItemOf(location.pathname, params);
  const panel = usePanel(area);

  const [panelOpen, setPanelOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(null); // 'rail' | 'bottom' | null
  const mainRef = useRef(null);

  // Close the drawer and scroll to the top on every navigation
  useEffect(() => {
    setPanelOpen(false);
    setAcctOpen(null);
    mainRef.current?.scrollTo?.(0, 0);
  }, [location.pathname, location.search]);

  // Escape closes the panel drawer
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPanelOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Breadcrumb: Organization / area (or workspace tile and name) / page
  const areaDef = AREAS.find((a) => a.id === area);
  const pageLabel = (() => {
    for (const g of panel.groups) {
      const it = g.items.find((x) => x.id === active);
      if (it) return it.label;
    }
    if (/^\/project\/[^/]+\/members/.test(location.pathname)) return 'Project members';
    return areaDef?.label;
  })();
  const crumbs = [user?.orgName || 'Organization'];
  if (area === 'projects' && workspace) crumbs.push({ ws: workspace });
  else if (pageLabel !== areaDef?.label) crumbs.push(areaDef?.label);
  crumbs.push(pageLabel);

  const accountItems = [
    { header: user?.email },
    { label: 'Profile', icon: 'user', onClick: () => navigate('/profile') },
    { label: 'Help and support', icon: 'help', onClick: () => openSupport() },
    chatAvailable && { label: 'Chat with support', icon: 'chat', onClick: () => openChat() },
    { divider: true },
    { label: 'Log out', icon: 'out', tone: 'danger', onClick: () => logout() },
  ].filter(Boolean);

  const avatar = <Avatar name={user?.name || user?.email} src={user?.avatar ? uploadUrl(user.avatar) : undefined} toneKey={user?.id} tone={undefined} />;

  return (
    <div className={cx('kc kc-shell kc-app', panelOpen && 'panel-open')}>
      {/* Rail */}
      <aside className="kc-rail" aria-label="Areas">
        <Logo size={30} />
        <nav aria-label="Main">
          {areas.map((a) => (
            <button
              key={a.id}
              type="button"
              className={cx('kc-icb', 'lg', 'dark', a.id === area && 'on')}
              data-tip={a.label}
              aria-label={a.label}
              aria-current={a.id === area ? 'page' : undefined}
              onClick={() => navigate(a.to)}
            >
              <Icon name={a.icon} size={20} />
            </button>
          ))}
        </nav>
        <span className="sp" />
        <IconButton icon="help" label="Help and support" tip="Help" onDark size="lg" onClick={() => openSupport()} />
        <NotificationBell rail />
        <AccountButton open={acctOpen === 'rail'} onToggle={(v) => setAcctOpen(v ? 'rail' : null)} items={accountItems} placement="rail">
          {avatar}
        </AccountButton>
      </aside>

      {/* Context panel (drawer below 1024px) */}
      <div className="kc-drawer-scrim" onClick={() => setPanelOpen(false)} aria-hidden="true" />
      <aside className="kc-panel" aria-label={panel.title || 'Projects'}>
        {area === 'projects' ? <WorkspaceSwitcher onNavigate={() => setPanelOpen(false)} /> : <div className="head">{panel.title}</div>}
        <div className="body">
          {panel.groups.map((g, gi) => (
            <div key={gi}>
              {g.label ? <div className="kc-grp">{g.label}</div> : null}
              <nav className="kc-nav" aria-label={g.label || panel.title}>
                {g.items.map((it) => {
                  const on = it.id === active;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={cx('kc-ni', on && 'on')}
                      aria-current={on ? 'page' : undefined}
                      onClick={() => navigate(it.to)}
                    >
                      <Icon name={it.icon} size={16} style={it.id === 'approved' && !on ? { color: 'var(--success-700)' } : undefined} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
                      {it.dot ? <span className="dot" title="You have an unpaid invoice" /> : null}
                      {it.lock ? <span className="lock" title="Not in your plan"><Icon name="lock" size={14} /></span> : null}
                      {!it.dot && !it.lock && it.count != null ? <span className="ct">{it.count}</span> : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
        <div className="foot"><TrialBadge /></div>
      </aside>

      {/* Header + content */}
      <div className="kc-col">
        <header className="kc-top">
          <IconButton className="kc-menu-btn" icon="menu" label="Open navigation" onClick={() => setPanelOpen(true)} />
          <nav className="kc-crumb" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="sep" aria-hidden="true">/</span>}
                {c && c.ws ? (
                  <span className="kc-crumb-ws"><Tile letter={c.ws.name} tone={workspaceTone(c.ws.name)} size={18} /><span>{c.ws.name}</span></span>
                ) : i === crumbs.length - 1 ? <b aria-current="page">{c}</b> : <span>{c}</span>}
              </React.Fragment>
            ))}
          </nav>
        </header>

        <main ref={mainRef} className="kc-main" id="main">
          {orgLocked ? <div style={{ marginBottom: 16 }}><OrgLockedBanner /></div> : user?.orgPendingInvoice ? <PendingPaymentBanner /> : null}
          <Outlet />
        </main>

        {/* Below 640px: the four areas and the account as a bottom bar */}
        <nav className="kc-bottom" aria-label="Main">
          {areas.map((a) => (
            <IconButton key={a.id} icon={a.icon} label={a.label} onDark size="lg" active={a.id === area} aria-current={a.id === area ? 'page' : undefined} onClick={() => navigate(a.to)} />
          ))}
          <NotificationBell rail className="kc-bottom-bell" />
          <AccountButton open={acctOpen === 'bottom'} onToggle={(v) => setAcctOpen(v ? 'bottom' : null)} items={accountItems} placement="bottom">
            {avatar}
          </AccountButton>
        </nav>
      </div>
    </div>
  );
}

// Account avatar; its menu opens to the right of the rail, aligned to the bottom
function AccountButton({ open, onToggle, items, placement, children }) {
  const ref = useRef(null);
  const triggerRef = useRef(null);
  useDismiss(ref, open, () => onToggle(false), triggerRef);
  const pos = placement === 'rail' ? { left: 'calc(100% + 12px)', bottom: 0 } : { right: 0, bottom: 'calc(100% + 10px)' };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button ref={triggerRef} type="button" className="kc-rail-acct" aria-label="Account" aria-haspopup="menu" aria-expanded={open} onClick={() => onToggle(!open)}>
        {children}
      </button>
      {open && (
        <div className="kc-pop" style={pos}>
          <Menu items={items} label="Account" onPick={() => onToggle(false)} />
        </div>
      )}
    </div>
  );
}
