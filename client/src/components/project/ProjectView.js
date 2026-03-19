import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import IframeContainer from "./IframeContainer";
import CommentSidebar from "./CommentSidebar";
import PinListSidebar from "./PinListSidebar";
import InviteMemberModal from "./InviteMemberModal";
import NewPinCommentPopup from "./NewPinCommentPopup";
import { useAuth } from "../../hooks/useAuth";
import { useIframeMessages } from "../../hooks/useIframeMessages";
import {
  getPinsApi,
  updatePinApi,
  deletePinApi,
} from "../../services/pinService";
import { TOKEN_KEY } from "../../utils/constants";
import { useSocket } from "../../hooks/useSocket";

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id) {
  let hash = 0;
  const str = id || '';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ProjectView({ project, onProjectUpdate, initialPinId }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [pins, setPins] = useState([]);
  const [allPins, setAllPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingPinData, setPendingPinData] = useState(null);
  const [targetUrl, setTargetUrl] = useState(project.websiteUrl);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [modeSwitching, setModeSwitching] = useState(false);
  const iframeState = useIframeMessages();
  const { onEvent, onlineUsers, lastSeenMap } = useSocket(project._id);
  const deepLinkHandled = useRef(false);

  // Combine owner + members into a unique list for avatar display
  const allMembers = useMemo(() => {
    const seen = new Set();
    const list = [];
    const add = (u) => {
      if (u && u._id && !seen.has(u._id)) {
        seen.add(u._id);
        list.push(u);
      }
    };
    add(project.owner);
    (project.members || []).forEach(add);
    return list;
  }, [project.owner, project.members]);

  const formatLastSeen = useCallback((dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, []);

  const getMemberTooltip = useCallback((member) => {
    const name = member.name || member.email;
    if (onlineUsers.has(member._id)) return `${name} — Online`;
    const lastSeen = lastSeenMap[member._id] || member.lastSeen;
    if (lastSeen) return `${name} — Last seen ${formatLastSeen(lastSeen)}`;
    return name;
  }, [onlineUsers, lastSeenMap, formatLastSeen]);

  const token = localStorage.getItem(TOKEN_KEY);
  const proxyUrl = `${process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'}/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${project._id}&token=${token}`;

  const currentPageUrl = iframeState.currentPageUrl || project.websiteUrl;

  const loadPins = useCallback(async () => {
    try {
      const res = await getPinsApi(project._id, currentPageUrl);
      setPins(res.data.pins);
    } catch (err) {
      console.error("Failed to load pins:", err);
    }
  }, [project._id, currentPageUrl]);

  const loadAllPins = useCallback(async () => {
    try {
      const res = await getPinsApi(project._id);
      setAllPins(res.data.pins);
    } catch (err) {
      console.error("Failed to load all pins:", err);
    }
  }, [project._id]);

  // Auto-fetch pins with cancellation when deps change
  useEffect(() => {
    const controller = new AbortController();
    getPinsApi(project._id, currentPageUrl, controller.signal)
      .then((res) => setPins(res.data.pins))
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error("Failed to load pins:", err);
      });
    return () => controller.abort();
  }, [project._id, currentPageUrl]);

  // Auto-fetch all pins with cancellation
  useEffect(() => {
    const controller = new AbortController();
    getPinsApi(project._id, undefined, controller.signal)
      .then((res) => setAllPins(res.data.pins))
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error("Failed to load all pins:", err);
      });
    return () => controller.abort();
  }, [project._id]);

  // Handle clicks from iframe — store click data for pending pin (don't create yet)
  useEffect(() => {
    if (iframeState.lastClick && pinMode && !pendingPinData) {
      const { xPercent, yPercent, selector, elementOffsetX, elementOffsetY, documentWidth, documentHeight } = iframeState.lastClick;
      setPendingPinData({
        xPercent,
        yPercent,
        pageUrl: currentPageUrl,
        selector,
        elementOffsetX,
        elementOffsetY,
        documentWidth,
        documentHeight,
      });
      iframeState.clearLastClick();
    }
  }, [iframeState.lastClick, iframeState.clearLastClick, pinMode, pendingPinData, currentPageUrl]);

  // Listen for pin clicks from iframe
  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (data?.type === "MARKUP_PIN_CLICK") {
        const pin = pins.find((p) => p._id === data.pinId) || allPins.find((p) => p._id === data.pinId);
        if (pin) {
          setPendingPinData(null);
          setSelectedPin(pin);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [pins, allPins]);

  const handleDeletePin = async (pinId) => {
    try {
      await deletePinApi(project._id, pinId);
      setSelectedPin(null);
      await loadPins();
      await loadAllPins();
    } catch (err) {
      console.error("Failed to delete pin:", err);
    }
  };

  const handleStatusChange = async (pinId, newStatus) => {
    try {
      await updatePinApi(project._id, pinId, { status: newStatus });
      await loadPins();
      await loadAllPins();
      if (selectedPin?._id === pinId) {
        setSelectedPin((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Failed to update pin:", err);
    }
  };

  // Reset loading when iframe signals ready
  useEffect(() => {
    if (iframeState.ready) {
      setIframeLoading(false);
    }
  }, [iframeState.ready]);

  // Fallback: also clear spinner when iframe's native load event fires
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => setIframeLoading(false), 500);
  }, []);

  // --- Socket.IO real-time event listeners ---

  // Pin created by another member
  useEffect(() => {
    return onEvent('pin:created', (data) => {
      setAllPins((prev) => {
        if (prev.some((p) => p._id === data.pin._id)) return prev;
        return [data.pin, ...prev];
      });
      setPins((prev) => {
        if (data.pin.pageUrl !== currentPageUrl) return prev;
        if (prev.some((p) => p._id === data.pin._id)) return prev;
        return [data.pin, ...prev];
      });
    });
  }, [onEvent, currentPageUrl]);

  // Pin updated (status change)
  useEffect(() => {
    return onEvent('pin:updated', (data) => {
      const updater = (prev) =>
        prev.map((p) => (p._id === data.pin._id ? { ...p, ...data.pin } : p));
      setPins(updater);
      setAllPins(updater);
      setSelectedPin((prev) =>
        prev && prev._id === data.pin._id ? { ...prev, ...data.pin } : prev
      );
    });
  }, [onEvent]);

  // Pin deleted
  useEffect(() => {
    return onEvent('pin:deleted', (data) => {
      setPins((prev) => prev.filter((p) => p._id !== data.pinId));
      setAllPins((prev) => prev.filter((p) => p._id !== data.pinId));
      setSelectedPin((prev) => (prev && prev._id === data.pinId ? null : prev));
    });
  }, [onEvent]);

  // Comment created — update counts in pin lists
  useEffect(() => {
    return onEvent('comment:created', (data) => {
      const updater = (prev) =>
        prev.map((p) => {
          if (p._id !== data.pinId) return p;
          return {
            ...p,
            commentsCount: (p.commentsCount || 0) + 1,
            latestComment: {
              body: data.comment.body,
              author: data.comment.author,
              createdAt: data.comment.createdAt,
            },
          };
        });
      setPins(updater);
      setAllPins(updater);
    });
  }, [onEvent]);

  // Comment deleted — decrement count
  useEffect(() => {
    return onEvent('comment:deleted', (data) => {
      const updater = (prev) =>
        prev.map((p) => {
          if (p._id !== data.pinId) return p;
          return { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) };
        });
      setPins(updater);
      setAllPins(updater);
    });
  }, [onEvent]);

  // --- Deep-link from email: navigate to pin ---
  useEffect(() => {
    if (!initialPinId || allPins.length === 0 || deepLinkHandled.current) return;
    const targetPin = allPins.find((p) => p._id === initialPinId);
    if (targetPin) {
      deepLinkHandled.current = true;
      handlePinNavigate(targetPin);
    }
  }, [initialPinId, allPins]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePinNavigate = (pin) => {
    setPinMode(true);
    setSelectedPin(pin);
    if (pin.pageUrl !== targetUrl) {
      setTargetUrl(pin.pageUrl);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="w-px h-5 bg-gray-200 shrink-0"></div>
          <h2 className="font-semibold text-gray-800 shrink-0">{project.name}</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded truncate max-w-md" title={currentPageUrl}>
            {currentPageUrl}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Browser / Comment mode tabs */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setModeSwitching(true); setPinMode(false); setTimeout(() => setModeSwitching(false), 400); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                !pinMode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              View
            </button>
            <button
              onClick={() => { setModeSwitching(true); setPinMode(true); setTimeout(() => setModeSwitching(false), 400); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                pinMode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Comment
            </button>
          </div>

          {/* Member avatars with online/offline status */}
          <div className="flex items-center -space-x-2">
            {allMembers.slice(0, 5).map((member) => {
              const color = getAvatarColor(member._id);
              return (
              <div key={member._id} className="relative" title={getMemberTooltip(member)}>
                <div className={`w-7 h-7 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[10px] font-bold border-2 border-white`}>
                  {getInitials(member.name || member.email)}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  onlineUsers.has(member._id) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              </div>
              );
            })}
            {allMembers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold border-2 border-white">
                +{allMembers.length - 5}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200"></div>

          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - all pins list */}
        <PinListSidebar
          pins={allPins}
          selectedPinId={selectedPin?._id}
          onPinClick={handlePinNavigate}
          onStatusChange={handleStatusChange}
          onDelete={handleDeletePin}
          onCommentAdded={() => { loadAllPins(); loadPins(); }}
          onEvent={onEvent}
          members={allMembers}
          projectId={project._id}
        />

        {/* Iframe area */}
        <div className="flex-1 relative">
          <IframeContainer
            key={targetUrl}
            proxyUrl={proxyUrl}
            pinMode={pinMode}
            pins={pins}
            selectedPinId={selectedPin?._id}
            loading={iframeLoading || modeSwitching}
            hidePins={!pinMode}
            onLoad={handleIframeLoad}
          />

          {/* Right comment sidebar - overlays iframe, doesn't push it */}
          {selectedPin && (
            <CommentSidebar
              pin={selectedPin}
              onClose={() => setSelectedPin(null)}
              onStatusChange={handleStatusChange}
              onDelete={handleDeletePin}
              onEvent={onEvent}
              members={allMembers}
            />
          )}
        </div>
      </div>

      {/* New pin comment popup — pin is created only when comment is submitted */}
      {pendingPinData && (
        <NewPinCommentPopup
          pinData={pendingPinData}
          projectId={project._id}
          onClose={() => setPendingPinData(null)}
          onPinCreated={() => { loadPins(); loadAllPins(); setPendingPinData(null); }}
        />
      )}

      {/* Invite modal */}
      <InviteMemberModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        projectId={project._id}
        onInvited={(updated) => {
          onProjectUpdate(updated);
          setShowInvite(false);
        }}
      />
    </div>
  );
}
