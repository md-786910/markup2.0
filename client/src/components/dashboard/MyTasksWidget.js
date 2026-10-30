import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTasksApi } from '../../services/pinService';
import { formatDueDate, isPastDue } from '../../utils/dueDate';

const PRIORITY_BADGE = {
  urgent: 'bg-rose-100 text-rose-700 border-rose-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_BADGE = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  in_review: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function MyTasksWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState({ total: 0, overdue: [], dueSoon: [], other: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'overdue' | 'dueSoon'
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyTasksApi()
      .then((res) => {
        if (!cancelled && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || data.total === 0) {
    return null;
  }

  const allTasks = [...data.overdue, ...data.dueSoon, ...data.other];
  const displayTasks =
    activeTab === 'overdue'
      ? data.overdue
      : activeTab === 'dueSoon'
      ? data.dueSoon
      : allTasks;

  return (
    <div className="mb-8 bg-white border border-gray-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">My Assigned Tasks</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {data.total}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Tasks assigned to you across all your projects</p>
          </div>
        </div>

        {/* Filter pills & Collapse */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({data.total})
            </button>
            {data.overdue.length > 0 && (
              <button
                onClick={() => setActiveTab('overdue')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'overdue' ? 'bg-white text-rose-700 shadow-sm' : 'text-rose-600 hover:text-rose-800'
                }`}
              >
                <span>Overdue</span>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {data.overdue.length}
                </span>
              </button>
            )}
            {data.dueSoon.length > 0 && (
              <button
                onClick={() => setActiveTab('dueSoon')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'dueSoon' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800'
                }`}
              >
                <span>Due this week</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {data.dueSoon.length}
                </span>
              </button>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand widget' : 'Collapse widget'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Task List */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTasks.map((task) => {
            const isOverdue = isPastDue(task.dueAt);
            const priorityCls = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.normal;
            const statusCls = STATUS_BADGE[task.status] || STATUS_BADGE.open;
            const statusLabel =
              task.status === 'in_progress'
                ? 'In Progress'
                : task.status === 'in_review'
                ? 'In Review'
                : 'Open';

            return (
              <div
                key={task._id}
                onClick={() => navigate(`/project/${task.project._id}?pin=${task._id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Top: Project pill & Priority */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                      {task.project?.name || 'Project'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${priorityCls}`}>
                      {task.priority || 'normal'}
                    </span>
                  </div>

                  {/* Pin Number & Title preview */}
                  <div className="mb-2">
                    <span className="text-xs font-bold text-blue-600 group-hover:underline mr-1.5">
                      #{task.pinNumber || '?'}
                    </span>
                    <span className="text-xs text-gray-700 line-clamp-2">
                      {task.pageUrl ? task.pageUrl.replace(/^https?:\/\//, '') : 'Task'}
                    </span>
                  </div>

                  {/* Labels chips */}
                  {task.labels && task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.labels.slice(0, 3).map((l, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          #{l}
                        </span>
                      ))}
                      {task.labels.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{task.labels.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom row: status pill + due date */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px]">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCls}`}>
                    {statusLabel}
                  </span>

                  {task.dueAt ? (
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isOverdue ? 'text-rose-600 font-bold' : 'text-gray-500'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {isOverdue ? 'Overdue: ' : 'Due: '}
                      {formatDueDate(task.dueAt)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">No due date</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

