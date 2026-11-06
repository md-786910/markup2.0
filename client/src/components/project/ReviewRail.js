import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo, Icon, IconButton, cx } from '../kc';
import NotificationBell from '../common/NotificationBell';
import { openSupport } from '../../utils/supportPanel';
import { getAvatarColor } from '../../utils/avatarColors';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ReviewRail({ active = 'canvas', onNavigate, projectId, onSelectPin, user }) {
  const navigate = useNavigate();
  const avatarColor = getAvatarColor(user?.id || user?._id);

  return (
    <aside className="kc-rail hidden md:flex shrink-0 z-30" aria-label="Review">
      <button
        type="button"
        onClick={() => onNavigate ? onNavigate('projects') : navigate('/dashboard')}
        className="logo transition-transform hover:scale-105"
        title="Back to dashboard"
      >
        <Logo size={30} />
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }} aria-label="Review views">
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('projects') : navigate('/dashboard')}
          className="kc-icb lg dark"
          title="Back to Projects"
          aria-label="Back to Projects"
        >
          <Icon name="grid" size={20} />
        </button>

        <span className="kr-rail-sep" />

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('canvas')}
          className={cx('kc-icb lg dark', active === 'canvas' && 'on')}
          title="Canvas"
          aria-label="Canvas"
          aria-current={active === 'canvas' ? 'page' : undefined}
        >
          <Icon name="expand" size={20} />
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('board')}
          className={cx('kc-icb lg dark', active === 'board' && 'on')}
          title="Board"
          aria-label="Board"
          aria-current={active === 'board' ? 'page' : undefined}
        >
          <Icon name="board" size={20} />
        </button>
      </nav>

      <span style={{ flex: 1 }} />

      <IconButton
        icon="help"
        label="Help and support"
        tip="Help"
        onDark
        size="lg"
        onClick={() => openSupport()}
      />

      <NotificationBell
        rail
        dark
        variant="detailed"
        projectId={projectId}
        onSelectPin={onSelectPin}
      />

      <button
        type="button"
        onClick={() => navigate('/settings')}
        aria-label="Account"
        className="kc-rail-acct"
        style={{ marginTop: 6, borderRadius: '50%' }}
        title={user?.name || 'Account'}
      >
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor.bg} ${avatarColor.text}`}>
          {getInitials(user?.name)}
        </span>
      </button>
    </aside>
  );
}

