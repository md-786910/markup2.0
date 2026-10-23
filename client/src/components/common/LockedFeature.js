import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Shown in place of a feature the workspace's plan doesn't include
export default function LockedFeature({ title, plan, description, className = '' }) {
  const { isOwner } = useAuth();
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-6 text-gray-500">{description}</p>
      <p className="mt-1 text-xs font-medium text-blue-600">Included on the {plan} plan</p>
      {isOwner ? (
        <Link
          to="/settings?tab=billing"
          className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          See plans
        </Link>
      ) : (
        <p className="mt-5 text-xs text-gray-400">Ask your workspace owner to upgrade.</p>
      )}
    </div>
  );
}
