import { PLAN_LABELS } from '../config/plans';
import { formatDate, formatMoney } from './formatters';

const plan = (p) => PLAN_LABELS[p] || p;

// Plain-language description of an Activity entry, without the actor's name
export function describeAction(a) {
  const m = a.metadata || {};
  switch (a.action) {
    case 'org.plan_set_by_admin': return `changed the plan from ${plan(m.from)} to ${plan(m.to)}`;
    case 'org.trial_extended': return `extended the trial by ${m.days} days${m.trialEndsAt ? ` (until ${formatDate(m.trialEndsAt)})` : ''}`;
    case 'org.limits_overridden': {
      const keys = Object.keys(m.overrides || {});
      return keys.length ? `set custom limits (${keys.length})` : 'cleared custom limits';
    }
    case 'org.locked': return `locked the organization${m.reason ? `: ${m.reason}` : ''}`;
    case 'org.unlocked': return 'unlocked the organization';
    case 'org.invoice_refunded': return `refunded ${formatMoney(m.amount, m.currency)}`;
    case 'org.plan_upgraded': return `upgraded to ${plan(m.to || m.plan)}`;
    case 'org.plan_downgraded': return `downgraded to ${plan(m.to || m.plan)}`;
    case 'org.subscription_canceled': return 'cancelled the subscription';
    case 'org.subscription_resumed': return 'resumed the subscription';
    case 'billing.payment_succeeded': return 'paid an invoice';
    case 'org.name_updated': return 'renamed the organization';
    case 'org.logo_updated': return 'changed the logo';
    case 'org.data_exported': return 'exported the organization data';
    case 'org.deletion_scheduled': return 'scheduled the organization for deletion';
    case 'org.deletion_cancelled': return 'cancelled the deletion';
    case 'project.created': return 'created a project';
    case 'project.archived': return 'archived a project';
    case 'project.unarchived': return 'restored a project';
    case 'pin.created': return 'added a pin';
    case 'pin.resolved': return 'resolved a pin';
    case 'pin.reopened': return 'reopened a pin';
    case 'pin.deleted': return 'deleted a pin';
    case 'comment.created': return 'commented';
    case 'member.invited': return 'invited a member';
    case 'member.joined': return 'joined';
    case 'member.removed': return 'removed a member';
    case 'member.role_changed': return "changed a member's access";
    case 'project.updated': return 'updated a project';
    case 'project.status_changed': return 'changed a project status';
    case 'comment.deleted': return 'deleted a comment';
    case 'share.enabled': return 'turned on a review link';
    case 'share.disabled': return 'turned off a review link';
    case 'guest.commented': return 'commented as a guest';
    case 'guest.pin_created': return 'added a pin as a guest';
    case 'workspace.created': return 'created a workspace';
    case 'workspace.renamed': return 'renamed a workspace';
    case 'workspace.deleted': return 'deleted a workspace';
    case 'workspace.members_updated': return 'changed workspace members';
    case 'workspace.share_enabled': return 'turned on a workspace review link';
    case 'workspace.share_disabled': return 'turned off a workspace review link';
    case 'integration.connected': return `connected ${m.type || 'an integration'}`;
    case 'integration.disconnected': return `disconnected ${m.type || 'an integration'}`;
    default: return a.action.replace(/[._]/g, ' ');
  }
}
