import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import IframeContainer from "./IframeContainer";
import DocumentViewer, { parseDocPageUrl } from "./DocumentViewer";
import PinListSidebar from "./PinListSidebar";
import InviteMemberModal from "./InviteMemberModal";
import NewPinCommentPopup from "./NewPinCommentPopup";
import { useAuth } from "../../hooks/useAuth";
import { useIframeMessages } from "../../hooks/useIframeMessages";
import {
  getPinsApi,
  updatePinApi,
  deletePinApi,
  uploadPinScreenshotApi,
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
  const { isAdmin, canCreate } = useAuth();
  const [pins, setPins] = useState([]);
  const [allPins, setAllPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingPinData, setPendingPinData] = useState(null);
  const [lastCreatedPinId, setLastCreatedPinId] = useState(null);
  const [targetUrl, setTargetUrl] = useState(project.websiteUrl);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [modeSwitching, setModeSwitching] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [devicePinCounts, setDevicePinCounts] = useState({ desktop: 0, tablet: 0, mobile: 0 });
  const [currentDocPage, setCurrentDocPage] = useState(1);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const iframeState = useIframeMessages();
  const { onEvent, onlineUsers, lastSeenMap } = useSocket(project._id);
  const deepLinkHandled = useRef(false);

  const isDocumentProject = project.projectType === 'document';

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
  const proxyUrl = !isDocumentProject ? `${process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'}/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${project._id}&token=${token}` : null;

  const currentDoc = isDocumentProject ? (project.documents?.[currentDocIndex] || project.documents?.[0]) : null;
  const currentPageUrl = isDocumentProject
    ? `doc:${currentDoc?.filename}:page:${currentDocPage}`
    : (iframeState.currentPageUrl || project.websiteUrl);

  const loadPins = useCallback(async () => {
    try {
      const res = await getPinsApi(project._id, currentPageUrl, undefined, deviceMode);
      setPins(res.data.pins);
    } catch (err) {
      console.error("Failed to load pins:", err);
    }
  }, [project._id, currentPageUrl, deviceMode]);

  const loadAllPins = useCallback(async () => {
    try {
      const res = await getPinsApi(project._id, undefined, undefined, deviceMode);
      setAllPins(res.data.pins);
    } catch (err) {
      console.error("Failed to load all pins:", err);
    }
  }, [project._id, deviceMode]);

  // Auto-fetch pins with cancellation when deps change
  useEffect(() => {
    const controller = new AbortController();
    getPinsApi(project._id, currentPageUrl, controller.signal, deviceMode)
      .then((res) => setPins(res.data.pins))
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error("Failed to load pins:", err);
      });
    return () => controller.abort();
  }, [project._id, currentPageUrl, deviceMode]);

  // Auto-fetch all pins with cancellation (filtered by device mode)
  useEffect(() => {
    const controller = new AbortController();
    getPinsApi(project._id, undefined, controller.signal, deviceMode)
      .then((res) => setAllPins(res.data.pins))
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error("Failed to load all pins:", err);
      });
    return () => controller.abort();
  }, [project._id, deviceMode]);

  // Fetch pin counts per device mode (all devices, for indicator dots)
  useEffect(() => {
    getPinsApi(project._id)
      .then((res) => {
        const counts = { desktop: 0, tablet: 0, mobile: 0 };
        for (const pin of res.data.pins) {
          if (pin.status === 'pending' && counts[pin.deviceMode || 'desktop'] !== undefined) {
            counts[pin.deviceMode || 'desktop']++;
          }
        }
        setDevicePinCounts(counts);
      })
      .catch(() => {});
  }, [project._id]);

  // Handle clicks from iframe — store click data for pending pin (don't create yet)
  useEffect(() => {
    if (iframeState.lastClick && pinMode && !pendingPinData) {
      const { xPercent, yPercent, viewportXPercent, viewportYPercent, selector, elementOffsetX, elementOffsetY, documentWidth, documentHeight } = iframeState.lastClick;
      setLastCreatedPinId(null);
      setPendingPinData({
        xPercent,
        yPercent,
        viewportXPercent,
        viewportYPercent,
        pageUrl: currentPageUrl,
        selector,
        elementOffsetX,
        elementOffsetY,
        documentWidth,
        documentHeight,
        deviceMode,
      });
      iframeState.clearLastClick();
    }
  }, [iframeState.lastClick, iframeState.clearLastClick, pinMode, pendingPinData, currentPageUrl, deviceMode]);

  // Attach screenshot to pending pin data when it arrives asynchronously
  useEffect(() => {
    // Path 1: popup still open — attach screenshot to pending pin data
    if (iframeState.screenshot && pendingPinData && !pendingPinData.screenshot) {
      setPendingPinData((prev) => prev ? { ...prev, screenshot: iframeState.screenshot } : prev);
      iframeState.clearScreenshot();
      return;
    }
    // Path 2: pin already created (fast user) — upload screenshot retroactively
    if (iframeState.screenshot && lastCreatedPinId && !pendingPinData) {
      const pinId = lastCreatedPinId;
      const dataUrl = iframeState.screenshot;
      setLastCreatedPinId(null);
      iframeState.clearScreenshot();
      (async () => {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const formData = new FormData();
          formData.append('screenshot', blob, 'screenshot.jpg');
          await uploadPinScreenshotApi(project._id, pinId, formData);
          loadAllPins();
          loadPins();
        } catch (err) {
          console.warn('Late screenshot upload failed:', err);
        }
      })();
    }
  }, [iframeState.screenshot, iframeState.clearScreenshot, pendingPinData, lastCreatedPinId]);

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
      // Decrement count before deleting
      const pin = allPins.find((p) => p._id === pinId);
      if (pin && pin.status === 'pending') {
        const mode = pin.deviceMode || 'desktop';
        setDevicePinCounts((prev) => ({ ...prev, [mode]: Math.max(0, (prev[mode] || 0) - 1) }));
      }
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
      // Update device count
      const mode = deviceMode;
      if (newStatus === 'resolved') {
        setDevicePinCounts((prev) => ({ ...prev, [mode]: Math.max(0, (prev[mode] || 0) - 1) }));
      } else if (newStatus === 'pending') {
        setDevicePinCounts((prev) => ({ ...prev, [mode]: (prev[mode] || 0) + 1 }));
      }
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
        if (data.pin.deviceMode && data.pin.deviceMode !== deviceMode) return prev;
        return [data.pin, ...prev];
      });
      setPins((prev) => {
        if (data.pin.pageUrl !== currentPageUrl) return prev;
        if (data.pin.deviceMode && data.pin.deviceMode !== deviceMode) return prev;
        if (prev.some((p) => p._id === data.pin._id)) return prev;
        return [data.pin, ...prev];
      });
      // Update device pin counts
      if (data.pin.status === 'pending') {
        const mode = data.pin.deviceMode || 'desktop';
        setDevicePinCounts((prev) => ({ ...prev, [mode]: (prev[mode] || 0) + 1 }));
      }
    });
  }, [onEvent, currentPageUrl, deviceMode]);

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
      // Update device pin counts on status change
      const mode = data.pin.deviceMode || 'desktop';
      if (data.pin.status === 'resolved') {
        setDevicePinCounts((prev) => ({ ...prev, [mode]: Math.max(0, (prev[mode] || 0) - 1) }));
      } else if (data.pin.status === 'pending') {
        setDevicePinCounts((prev) => ({ ...prev, [mode]: (prev[mode] || 0) + 1 }));
      }
    });
  }, [onEvent]);

  // Pin deleted
  useEffect(() => {
    return onEvent('pin:deleted', (data) => {
      // Decrement device count if the deleted pin was pending
      setAllPins((prev) => {
        const deleted = prev.find((p) => p._id === data.pinId);
        if (deleted && deleted.status === 'pending') {
          const mode = deleted.deviceMode || 'desktop';
          setDevicePinCounts((c) => ({ ...c, [mode]: Math.max(0, (c[mode] || 0) - 1) }));
        }
        return prev.filter((p) => p._id !== data.pinId);
      });
      setPins((prev) => prev.filter((p) => p._id !== data.pinId));
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

  const DEVICE_WIDTHS = { desktop: 1440, tablet: 768, mobile: 375 };

  const handleDeviceChange = (mode) => {
    setDeviceMode(mode);
    setViewportWidth(DEVICE_WIDTHS[mode]);
  };

  const handleDocumentClick = useCallback((clickData) => {
    if (pendingPinData) return;
    setLastCreatedPinId(null);
    setPendingPinData(clickData);
  }, [pendingPinData]);

  const handlePinNavigate = (pin) => {
    if (!pinMode) setPinMode(true);
    setSelectedPin(pin);

    if (isDocumentProject) {
      const parsed = parseDocPageUrl(pin.pageUrl);
      if (parsed) {
        const docIdx = project.documents.findIndex((d) => d.filename === parsed.filename);
        if (docIdx >= 0 && docIdx !== currentDocIndex) setCurrentDocIndex(docIdx);
        if (parsed.page !== currentDocPage) setCurrentDocPage(parsed.page);
      }
    } else {
      if (pin.deviceMode && pin.deviceMode !== deviceMode) {
        handleDeviceChange(pin.deviceMode);
      }
      if (pin.pageUrl !== targetUrl) {
        setTargetUrl(pin.pageUrl);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200/80 px-4 h-14 flex items-center justify-between">
        {/* Left: Brand + Project + URL */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-200/80 shrink-0"></div>
          <h2 className="font-semibold text-gray-900 shrink-0 text-[14px] tracking-tight">{project.name}</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50/80 pl-2 pr-2.5 py-1.5 rounded-lg truncate max-w-md border border-gray-100/80 hover:bg-gray-100/60 transition-colors cursor-default" title={isDocumentProject ? currentDoc?.originalName : currentPageUrl}>
            {isDocumentProject ? (
              <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            )}
            <span className="truncate">{isDocumentProject ? `${currentDoc?.originalName} — Page ${currentDocPage}` : currentPageUrl}</span>
          </div>
        </div>

        {/* Center: Device switcher — segmented control style (website only) */}
        {!isDocumentProject ? (
          <div className="flex items-center bg-gray-100/80 rounded-lg p-1 gap-0.5">
            {/* Desktop */}
            <button
              onClick={() => handleDeviceChange('desktop')}
              className={`p-1.5 rounded-md transition-all duration-150 relative ${deviceMode === 'desktop' ? 'text-gray-700 bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Desktop (1440px)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
              </svg>
              {devicePinCounts.desktop > 0 && deviceMode !== 'desktop' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </button>
            {/* Tablet */}
            <button
              onClick={() => handleDeviceChange('tablet')}
              className={`p-1.5 rounded-md transition-all duration-150 relative ${deviceMode === 'tablet' ? 'text-gray-700 bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Tablet (768px)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
              </svg>
              {devicePinCounts.tablet > 0 && deviceMode !== 'tablet' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </button>
            {/* Mobile */}
            <button
              onClick={() => handleDeviceChange('mobile')}
              className={`p-1.5 rounded-md transition-all duration-150 relative ${deviceMode === 'mobile' ? 'text-gray-700 bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Mobile (375px)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              {devicePinCounts.mobile > 0 && deviceMode !== 'mobile' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-100/80">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Document
          </div>
        )}

        {/* Right: Mode toggle + Avatars + Invite */}
        <div className="flex items-center gap-3">
          {/* View / Comment mode toggle */}
          {canCreate && <div className="relative flex bg-gray-100/80 rounded-lg p-1">
            <div
              className="absolute top-1 bottom-1 rounded-md bg-blue-600 shadow-sm transition-all duration-200 ease-in-out"
              style={{
                width: 'calc(50% - 4px)',
                left: pinMode ? 'calc(50%)' : '4px',
              }}
            />
            <button
              onClick={() => { setModeSwitching(true); setPinMode(false); setTimeout(() => setModeSwitching(false), 400); }}
              className={`relative z-10 flex-1 text-center py-1 px-5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
                !pinMode ? 'text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              View
            </button>
            <button
              onClick={() => { setModeSwitching(true); setPinMode(true); setTimeout(() => setModeSwitching(false), 400); }}
              className={`relative z-10 flex-1 text-center py-1 px-5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
                pinMode ? 'text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Comment
            </button>
          </div>}

          {/* Member avatars */}
          <div className="flex items-center -space-x-2">
            {allMembers.slice(0, 5).map((member) => {
              const color = getAvatarColor(member._id);
              return (
              <div key={member._id} className="relative" title={getMemberTooltip(member)}>
                <div className={`w-8 h-8 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[11px] font-bold border-[2.5px] border-white`}>
                  {getInitials(member.name || member.email)}
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-[2px] border-white ${
                  onlineUsers.has(member._id) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              </div>
              );
            })}
            {allMembers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold border-[2.5px] border-white">
                +{allMembers.length - 5}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200/80"></div>

          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all hover:shadow-md hover:shadow-blue-600/25"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              Invite
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - pin list or pin detail */}
        <PinListSidebar
          pins={allPins}
          selectedPinId={selectedPin?._id}
          selectedPin={selectedPin}
          onPinClick={handlePinNavigate}
          onClosePin={() => setSelectedPin(null)}
          onDeletePin={handleDeletePin}
          onNavigatePin={handlePinNavigate}
          onStatusChange={handleStatusChange}
          onCommentAdded={() => { loadAllPins(); loadPins(); }}
          onEvent={onEvent}
          members={allMembers}
          projectId={project._id}
        />

        {/* Content area */}
        <div className="flex-1 relative">
          {isDocumentProject ? (
            <DocumentViewer
              documents={project.documents}
              currentDocIndex={currentDocIndex}
              currentPage={currentDocPage}
              onPageChange={setCurrentDocPage}
              onDocIndexChange={setCurrentDocIndex}
              pinMode={pinMode}
              pins={pins}
              selectedPinId={selectedPin?._id}
              hidePins={!pinMode}
              onDocumentClick={handleDocumentClick}
              onPinClick={(pin) => { setPendingPinData(null); setSelectedPin(pin); }}
              viewportWidth={viewportWidth}
            />
          ) : (
            <IframeContainer
              key={(() => { try { return new URL(targetUrl).origin; } catch { return targetUrl; } })()}
              proxyUrl={proxyUrl}
              targetUrl={targetUrl}
              pinMode={pinMode}
              pins={pins}
              selectedPinId={selectedPin?._id}
              loading={iframeLoading || modeSwitching}
              hidePins={!pinMode}
              onLoad={handleIframeLoad}
              viewportWidth={viewportWidth}
            />
          )}
        </div>
      </div>

      {/* New pin comment popup — pin is created only when comment is submitted */}
      {pendingPinData && (
        <NewPinCommentPopup
          pinData={pendingPinData}
          projectId={project._id}
          members={allMembers}
          onClose={() => { setPendingPinData(null); if (!isDocumentProject) iframeState.clearScreenshot(); setLastCreatedPinId(null); }}
          onPinCreated={(pinId) => { loadPins(); loadAllPins(); setPendingPinData(null); setLastCreatedPinId(pinId); }}
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
