import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import IframeContainer from "./IframeContainer";
import { parseDocPageUrl } from "../../utils/docPageUrl";
import { normalizePageUrl } from "../../utils/pageUrl";
import PinListSidebar from "./PinListSidebar";
import SidebarTabs, { isTabLocked } from "./SidebarTabs";
import LockedFeature from "../common/LockedFeature";
import ActivitySidebar from "./ActivitySidebar";
import VersionSidebar from "./VersionSidebar";
import InviteMemberModal from "./InviteMemberModal";
import ShareProjectModal from "./ShareProjectModal";
import ApprovalsModal from "./ApprovalsModal";
import NewPinCommentPopup from "./NewPinCommentPopup";
import NotificationBell from "../common/NotificationBell";
import MembersPresencePopover from "./MembersPresencePopover";
import { useAuth } from "../../hooks/useAuth";
import { useIframeMessages } from "../../hooks/useIframeMessages";
import {
  getPinsApi,
  updatePinApi,
  deletePinApi,
  uploadPinScreenshotApi,
} from "../../services/pinService";
import { useSocket } from "../../hooks/useSocket";
import { toastError } from '../../utils/toast';
import { getClientEnvironment } from "../../utils/clientEnv";
import BrandMark from "../common/BrandMark";
import TaskBoard from "./TaskBoard";

// PDF viewer (react-pdf + pdf.js) is only downloaded for document projects
const DocumentViewer = React.lazy(() => import("./DocumentViewer"));

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

export default function ProjectView({ project, proxyToken, onProjectUpdate, initialPinId }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, orgLocked } = useAuth();
  // This user's level on the project (server: utils/access.js)
  const canComment = (project.access === 'comment' || project.access === 'manage') && !orgLocked;
  const canManageProject = project.access === 'manage';
  const limits = user?.orgLimits || {};

  const [pins, setPins] = useState([]);
  const [allPins, setAllPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [pendingPinData, setPendingPinData] = useState(null);
  // Saved pins still waiting for their screenshot: clickId -> pinId
  const pinsAwaitingShotRef = useRef(new Map());
  const pendingPinRef = useRef(null);
  const [targetUrl, setTargetUrl] = useState(project.websiteUrl);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [devicePinCounts, setDevicePinCounts] = useState({ desktop: 0, tablet: 0, mobile: 0 });
  const [currentDocPage, setCurrentDocPage] = useState(1);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [sidebarTab, setSidebarTab] = useState('pins');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [viewLayout, setViewLayout] = useState('canvas'); // 'canvas' | 'board'
  // Phones show the page or the comments, switched by a bottom tab bar
  const [mobilePane, setMobilePane] = useState('page');
  const showCommentsOnPhone = () => { if (window.innerWidth < 768) setMobilePane('comments'); };
  const iframeState = useIframeMessages();
  const { onEvent, onlineUsers, lastSeenMap, resyncKey } = useSocket(project._id);
  const initialPinHandled = useRef(false);

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
    // Members of the project's workspace see it too (mentions, presence)
    (project.workspaceMembers || []).forEach(add);
    return list;
  }, [project.owner, project.members, project.workspaceMembers]);

  // Presence info for the header avatar hover cards
  const getMemberPresence = useCallback((member) => {
    const ownerId = project.owner?._id || project.owner;
    return {
      member,
      isOnline: onlineUsers.has(member._id),
      lastSeen: lastSeenMap[member._id] || member.lastSeen,
      role: member._id === ownerId ? 'owner' : member.role,
      isYou: member._id === (user?.id || user?._id),
      color: getAvatarColor(member._id),
      initials: getInitials(member.name || member.email),
    };
  }, [onlineUsers, lastSeenMap, project.owner, user?.id, user?._id]);

  const memberPresence = useMemo(() => allMembers.map(getMemberPresence), [allMembers, getMemberPresence]);

  // Project-scoped proxy token (never the session token: the proxied site can read this URL)
  const token = encodeURIComponent(proxyToken || '');
  const proxyUrl = !isDocumentProject ? `${process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'}/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${project._id}&token=${token}` : null;

  const currentDoc = isDocumentProject ? (project.documents?.[currentDocIndex] || project.documents?.[0]) : null;
  const currentPageUrl = isDocumentProject
    ? `doc:${currentDoc?.filename}:page:${currentDocPage}`
    : normalizePageUrl(iframeState.currentPageUrl || project.websiteUrl);

  const loadPins = useCallback(async () => {
    try {
      const res = await getPinsApi(project._id, currentPageUrl, undefined, deviceMode);
      setPins(res.data.pins);
    } catch (err) {
      toastError(err, 'Could not load comments for this page.');
    }
  }, [project._id, currentPageUrl, deviceMode]);

  const loadAllPins = useCallback(async () => {
    try {
      const res = await getPinsApi(project._id, undefined, undefined, deviceMode);
      setAllPins(res.data.pins);
    } catch (err) {
      toastError(err, 'Could not load comments.');
    }
  }, [project._id, deviceMode]);

  // Viewing one review round (Versions tab): only that version's pins
  const inVersion = useCallback(
    (list) => (selectedVersion ? list.filter((p) => String(p.version?._id || p.version || '') === selectedVersion._id) : list),
    [selectedVersion]
  );
  const shownPins = useMemo(() => inVersion(pins), [inVersion, pins]);
  const shownAllPins = useMemo(() => inVersion(allPins), [inVersion, allPins]);

  // New pins have no version yet: commenting shows the current round again
  useEffect(() => {
    if (pinMode) setSelectedVersion(null);
  }, [pinMode]);

  // Auto-fetch pins with cancellation when deps change (and after a socket
  // reconnect, to pick up pins created while disconnected)
  useEffect(() => {
    const controller = new AbortController();
    getPinsApi(project._id, currentPageUrl, controller.signal, deviceMode)
      .then((res) => setPins(res.data.pins))
      .catch((err) => {
        toastError(err, 'Could not load comments for this page.');
      });
    return () => controller.abort();
  }, [project._id, currentPageUrl, deviceMode, resyncKey]);

  // Auto-fetch all pins with cancellation (filtered by device mode)
  useEffect(() => {
    const controller = new AbortController();
    getPinsApi(project._id, undefined, controller.signal, deviceMode)
      .then((res) => setAllPins(res.data.pins))
      .catch((err) => {
        toastError(err, 'Could not load comments.');
      });
    return () => controller.abort();
  }, [project._id, deviceMode, resyncKey]);

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
      const { clickId, xPercent, yPercent, viewportXPercent, viewportYPercent, selector, elementOffsetX, elementOffsetY, documentWidth, documentHeight, context: iframeContext } = iframeState.lastClick;
      const env = getClientEnvironment();
      const combinedContext = {
        ...env,
        ...(iframeContext || {}),
        screen: env.screen,
      };
      setPendingPinData({
        clickId,
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
        context: combinedContext,
      });
      iframeState.clearLastClick();
    }
  }, [iframeState.lastClick, iframeState.clearLastClick, pinMode, pendingPinData, currentPageUrl, deviceMode]);

  useEffect(() => { pendingPinRef.current = pendingPinData; }, [pendingPinData]);

  const uploadScreenshot = useCallback(async (pinId, dataUrl) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append('screenshot', blob, 'screenshot.jpg');
      const res = await uploadPinScreenshotApi(project._id, pinId, formData);
      if (res?.data?.pin?.screenshot) {
        setSelectedPin((prev) => (prev && prev._id === pinId ? { ...prev, screenshot: res.data.pin.screenshot } : prev));
      }
      loadAllPins();
      loadPins();
    } catch (err) {
      console.warn('Screenshot upload failed:', err);
    }
  }, [project._id, loadAllPins, loadPins]);
  const uploadScreenshotRef = useRef(uploadScreenshot);
  uploadScreenshotRef.current = uploadScreenshot;

  // Screenshots arrive after the click (capture is async) and are routed by
  // the click they belong to: to its saved pin (posting never waits for the
  // capture), else to the open popup for that click. Others are dropped, so a
  // late screenshot never lands on a different pin.
  useEffect(() => iframeState.onScreenshot(({ clickId, screenshot }) => {
    const awaiting = pinsAwaitingShotRef.current;
    if (clickId && awaiting.has(clickId)) {
      const pinId = awaiting.get(clickId);
      awaiting.delete(clickId);
      if (screenshot) uploadScreenshotRef.current(pinId, screenshot);
      return;
    }
    const pending = pendingPinRef.current;
    // Frames without click ids (older injected script) attach to the open popup
    if (pending && !pending.screenshot && (!clickId || !pending.clickId || pending.clickId === clickId)) {
      setPendingPinData((prev) => (prev && prev.clickId === pending.clickId
        ? { ...prev, screenshot, captureFailed: !screenshot }
        : prev));
    }
  }), [iframeState.onScreenshot]);

  // The popup saved the pin: upload its screenshot now, or when it arrives
  const handlePinSaved = useCallback((pinId, sentScreenshot) => {
    const pending = pendingPinRef.current;
    if (!pending || sentScreenshot) return;
    if (pending.screenshot) uploadScreenshot(pinId, pending.screenshot);
    else if (pending.clickId && !pending.captureFailed) pinsAwaitingShotRef.current.set(pending.clickId, pinId);
  }, [uploadScreenshot]);

  const DEVICE_WIDTHS = { desktop: 1440, tablet: 768, mobile: 375 };

  const handleDeviceChange = useCallback((mode) => {
    setDeviceMode(mode);
    setViewportWidth(DEVICE_WIDTHS[mode]);
  }, []);

  const handlePinNavigate = useCallback((pin) => {
    if (!pin) return;
    if (!pinMode) setPinMode(true);
    if (sidebarTab !== 'pins') setSidebarTab('pins');

    const pinId = pin._id || pin;
    const fullPin = (typeof pin === 'object' && pin.xPercent != null)
      ? pin
      : (allPins.find((p) => p._id === pinId) || pins.find((p) => p._id === pinId) || pin);

    setSelectedPin(fullPin);

    // Update URL with pin ID routing query parameter
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (next.get('pin') !== pinId) {
        next.set('pin', pinId);
        return next;
      }
      return prev;
    }, { replace: true });

    if (isDocumentProject) {
      const parsed = parseDocPageUrl(fullPin.pageUrl);
      if (parsed) {
        const docIdx = project.documents?.findIndex((d) => d.filename === parsed.filename);
        if (docIdx >= 0 && docIdx !== currentDocIndex) setCurrentDocIndex(docIdx);
        if (parsed.page !== currentDocPage) setCurrentDocPage(parsed.page);
      }
    } else {
      if (fullPin.deviceMode && fullPin.deviceMode !== deviceMode) {
        handleDeviceChange(fullPin.deviceMode);
      }
      if (fullPin.pageUrl && normalizePageUrl(fullPin.pageUrl) !== normalizePageUrl(targetUrl)) {
        setTargetUrl(fullPin.pageUrl);
      }
    }
  }, [pinMode, sidebarTab, isDocumentProject, project.documents, currentDocIndex, currentDocPage, deviceMode, targetUrl, setSearchParams, handleDeviceChange, allPins, pins]);

  const handleClosePin = useCallback(() => {
    setSelectedPin(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('pin');
      next.delete('comment');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Listen for pin clicks from iframe
  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (data?.type === "MARKUP_PIN_CLICK") {
        const pin = pins.find((p) => p._id === data.pinId) || allPins.find((p) => p._id === data.pinId);
        if (pin) {
          setPendingPinData(null);
          handlePinNavigate(pin);
          showCommentsOnPhone();
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [pins, allPins, handlePinNavigate]);

  const handleDeletePin = async (pinId) => {
    try {
      // Decrement count before deleting
      const pin = allPins.find((p) => p._id === pinId);
      if (pin && pin.status === 'pending') {
        const mode = pin.deviceMode || 'desktop';
        setDevicePinCounts((prev) => ({ ...prev, [mode]: Math.max(0, (prev[mode] || 0) - 1) }));
      }
      await deletePinApi(project._id, pinId);
      handleClosePin();
      await loadPins();
      await loadAllPins();
    } catch (err) {
      toastError(err, 'Could not delete the pin.');
    }
  };

  const handlePinUpdate = async (pinId, patchData) => {
    try {
      if (patchData && patchData.status) {
        const mode = deviceMode;
        if (patchData.status === 'resolved') {
          setDevicePinCounts((prev) => ({ ...prev, [mode]: Math.max(0, (prev[mode] || 0) - 1) }));
        } else if (patchData.status === 'pending' || patchData.status === 'open') {
          setDevicePinCounts((prev) => ({ ...prev, [mode]: (prev[mode] || 0) + 1 }));
        }
      }
      const res = await updatePinApi(project._id, pinId, patchData);
      const updated = res.data?.pin;
      await loadPins();
      await loadAllPins();
      if (selectedPin?._id === pinId) {
        setSelectedPin((prev) => ({ ...prev, ...(updated || patchData) }));
      }
      return updated;
    } catch (err) {
      toastError(err, 'Could not update pin.');
      throw err;
    }
  };

  const handleStatusChange = async (pinId, newStatus) => {
    return handlePinUpdate(pinId, { status: newStatus });
  };

  // Show loader when iframe starts navigating
  useEffect(() => {
    if (iframeState.navigating) {
      setIframeLoading(true);
    }
  }, [iframeState.navigating]);

  // Reset loading when iframe signals ready
  useEffect(() => {
    if (iframeState.ready) {
      setIframeLoading(false);
    }
  }, [iframeState.ready]);

  // The site could not be loaded (firewall / unreachable): no commenting on the error page
  const siteBlocked = !isDocumentProject && iframeState.blocked;
  useEffect(() => {
    if (siteBlocked) setPinMode(false);
  }, [siteBlocked]);

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

  // --- Deep-link from email or URL query param on initial load: navigate to pin ---
  useEffect(() => {
    const urlPinId = searchParams.get('pin') || searchParams.get('comment') || initialPinId;
    if (!urlPinId || initialPinHandled.current) return;

    const targetPin = allPins.find((p) => p._id === urlPinId) || pins.find((p) => p._id === urlPinId);
    if (targetPin) {
      initialPinHandled.current = true;
      handlePinNavigate(targetPin);
    } else {
      getPinsApi(project._id)
        .then((res) => {
          const found = res.data.pins?.find((p) => p._id === urlPinId);
          if (found) {
            initialPinHandled.current = true;
            handlePinNavigate(found);
          }
        })
        .catch(() => {});
    }
  }, [searchParams, initialPinId, allPins, pins, project._id, handlePinNavigate]);

  const handleDocumentClick = useCallback((clickData) => {
    if (pendingPinData) return;
    const env = getClientEnvironment();
    setPendingPinData({
      ...clickData,
      context: {
        ...env,
        ...(clickData.context || {}),
      },
    });
  }, [pendingPinData]);

  const handleDocScreenshot = useCallback((screenshot) => {
    setPendingPinData((prev) => prev ? { ...prev, screenshot } : prev);
  }, []);

  const deviceButtons = (
    <>
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
    </>
  );

  const modeToggle = canComment ? (
    <div className="relative flex bg-gray-100 rounded-lg p-1" role="group" aria-label="Mode">
      <div
        className={`absolute top-1 bottom-1 rounded-md shadow-sm transition-all duration-200 ease-in-out ${pinMode ? 'bg-blue-600' : 'bg-white'}`}
        style={{
          width: 'calc(50% - 4px)',
          left: pinMode ? 'calc(50%)' : '4px',
        }}
      />
      <button
        onClick={() => setPinMode(false)}
        className={`relative z-10 flex-1 text-center py-1 px-4 md:px-5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
          !pinMode ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        View
      </button>
      <button
        onClick={() => setPinMode(true)}
        className={`relative z-10 flex-1 text-center py-1 px-4 md:px-5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
          pinMode ? 'text-white' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Comment
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-screen h-dvh">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200/80 px-4 h-14 flex items-center justify-between relative">
        {/* Left: Brand + Project + URL */}
        <div className="flex items-center gap-3 min-w-0 z-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0 group"
          >
            <BrandMark className="w-8 h-8" />
            <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-200/80 shrink-0"></div>
          <h2 className="min-w-0 max-w-[160px] truncate font-semibold text-gray-900 text-[14px] tracking-tight sm:max-w-[220px] xl:max-w-none xl:shrink-0" title={project.name}>{project.name}</h2>
          {project.projectStatus === 'approved' && (
            <button
              onClick={() => setShowApprovals(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
              title="Click to view sign-off details"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Approved
            </button>
          )}
          {project.projectStatus === 'in_review' && (
            <button
              onClick={() => setShowApprovals(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
              title="Click to view review progress"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              In review
            </button>
          )}
          {project.projectStatus === 'changes_requested' && (
            <button
              onClick={() => setShowApprovals(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
              title="Click to view requested changes"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Changes requested
            </button>
          )}

          {/* Canvas vs Board View Switcher */}
          <div className="hidden sm:flex items-center bg-gray-100/90 rounded-lg p-0.5 border border-gray-200/70">
            <button
              onClick={() => setViewLayout('canvas')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewLayout === 'canvas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Canvas / Website view"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              <span>Canvas</span>
            </button>
            <button
              onClick={() => {
                if (!limits.hasTaskWorkflow) {
                  navigate('/pricing');
                  return;
                }
                setViewLayout('board');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewLayout === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title={limits.hasTaskWorkflow ? "Kanban Task Board" : "Kanban Task Board (Upgrade to Starter/Pro)"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.5-15h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5z" />
              </svg>
              <span>Board</span>
              {!limits.hasTaskWorkflow && (
                <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1 rounded">PRO</span>
              )}
            </button>
          </div>
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50/80 pl-2 pr-2.5 py-1.5 rounded-lg truncate max-w-md border border-gray-100/80 hover:bg-gray-100/60 transition-colors cursor-default" title={isDocumentProject ? currentDoc?.originalName : currentPageUrl}>
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

        {/* Center: Device switcher — absolutely centered so it doesn't shift with URL length */}
        {!isDocumentProject ? (
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center bg-gray-100/80 rounded-lg p-1 gap-0.5">
            {deviceButtons}
          </div>
        ) : (
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-100/80">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Document
          </div>
        )}

        {/* Right: Mode toggle + Avatars + Invite */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3 z-10">
          {/* View / Comment mode toggle */}
          <div className="hidden md:block">{modeToggle}</div>

          {/* Member avatars */}
          <MembersPresencePopover entries={memberPresence}>
          <div tabIndex={0} className="hidden lg:flex items-center -space-x-2 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {memberPresence.slice(0, 5).map((p) => (
              <div key={p.member._id} className="relative transition-transform hover:-translate-y-0.5 hover:z-10">
                <div className={`w-8 h-8 rounded-full ${p.color.bg} ${p.color.text} flex items-center justify-center text-[11px] font-bold border-[2.5px] border-white`}>
                  {p.initials}
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-[2px] border-white ${
                  p.isOnline ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              </div>
            ))}
            {memberPresence.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold border-[2.5px] border-white">
                +{memberPresence.length - 5}
              </div>
            )}
          </div>
          </MembersPresencePopover>

          {/* Bell Notifications */}
          <NotificationBell variant="detailed" projectId={project?._id} onSelectPin={handlePinNavigate} />

          <div className="hidden md:block w-px h-6 bg-gray-200/80"></div>

          <button
            onClick={() => setShowApprovals(true)}
            className="flex items-center gap-1.5 px-2.5 lg:px-3 py-2 text-gray-600 text-[13px] font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Review approvals & sign-off history"
            aria-label="Approvals"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden lg:inline">Approvals</span>
          </button>

          {canManageProject && (
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 px-2.5 lg:px-3 py-2 text-gray-600 text-[13px] font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Share with guests"
              aria-label="Share"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.874a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
              </svg>
              <span className="hidden lg:inline">Share</span>
            </button>
          )}

          {canManageProject && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-2.5 lg:px-3.5 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 transition-colors"
              title="Invite people"
              aria-label="Invite"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              <span className="hidden lg:inline">Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Phones: device size and mode under the toolbar */}
      {(!isDocumentProject || modeToggle) && (
        <div className="md:hidden flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
          {!isDocumentProject ? (
            <div className="flex items-center bg-gray-100/80 rounded-lg p-1 gap-0.5">{deviceButtons}</div>
          ) : <span />}
          {modeToggle}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className={`${mobilePane === 'comments' ? 'flex' : 'hidden'} md:flex w-full md:w-auto shrink-0`}>
        {sidebarTab === 'pins' ? (
          <PinListSidebar
            readOnly={!canComment}
            pins={shownAllPins}
            selectedPinId={selectedPin?._id}
            selectedPin={selectedPin}
            onPinClick={handlePinNavigate}
            onClosePin={handleClosePin}
            onDeletePin={handleDeletePin}
            onNavigatePin={handlePinNavigate}
            onStatusChange={handleStatusChange}
            onPinUpdate={handlePinUpdate}
            onCommentAdded={() => { loadAllPins(); loadPins(); }}
            onEvent={onEvent}
            resyncKey={resyncKey}
            members={allMembers}
            projectId={project._id}
            sidebarTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
        ) : (
          <div className="w-full md:w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
            <SidebarTabs active={sidebarTab} onChange={setSidebarTab} />
            {sidebarTab === 'activity' && (isTabLocked('activity', limits) ? (
              <LockedFeature
                title="Activity log"
                plan="Starter"
                description="See who added, resolved, and changed feedback in this project, and when."
              />
            ) : <ActivitySidebar projectId={project._id} />)}
            {sidebarTab === 'versions' && isTabLocked('versions', limits) && (
              <LockedFeature
                title="Version history"
                plan="Pro"
                description="Save a version at the end of each review round and look back at the feedback from any round."
              />
            )}
            {sidebarTab === 'versions' && !isTabLocked('versions', limits) && (
              <VersionSidebar
                projectId={project._id}
                selectedVersionId={selectedVersion?._id}
                onVersionSelect={setSelectedVersion}
              />
            )}
          </div>
        )}

        </div>

        {/* Content area */}
        <div className={`${mobilePane === 'page' ? 'block' : 'hidden'} md:block flex-1 min-w-0 relative`}>
          {viewLayout === 'board' ? (
            <TaskBoard
              pins={shownAllPins}
              members={allMembers}
              onPinClick={(pin) => {
                setPendingPinData(null);
                setSelectedPin(pin);
                showCommentsOnPhone();
              }}
              onPinUpdate={handlePinUpdate}
              canEdit={canComment}
              readOnly={!canComment}
              onSwitchToCanvas={() => setViewLayout('canvas')}
            />
          ) : isDocumentProject ? (
            <React.Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin"></div></div>}>
            <DocumentViewer
              documents={project.documents}
              currentDocIndex={currentDocIndex}
              currentPage={currentDocPage}
              onPageChange={setCurrentDocPage}
              onDocIndexChange={setCurrentDocIndex}
              hidePins={!pinMode}
              pinMode={pinMode}
              pins={shownPins}
              selectedPinId={selectedPin?._id}
              onDocumentClick={handleDocumentClick}
              onPinClick={(pin) => { setPendingPinData(null); setSelectedPin(pin); showCommentsOnPhone(); }}
              onScreenshot={handleDocScreenshot}
              viewportWidth={viewportWidth}
            />
            </React.Suspense>
          ) : (
            <IframeContainer
              key={(() => { try { return new URL(targetUrl).origin; } catch { return targetUrl; } })()}
              proxyUrl={proxyUrl}
              targetUrl={targetUrl}
              hidePins={!pinMode}
              pinMode={pinMode}
              pins={shownPins}
              selectedPinId={selectedPin?._id}
              loading={iframeLoading}
              onLoad={handleIframeLoad}
              viewportWidth={viewportWidth}
            />
          )}
          {selectedVersion && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200 bg-white py-1.5 pl-4 pr-1.5 text-sm shadow-md">
              <span className="text-gray-600">
                Showing <span className="font-medium text-gray-900">{selectedVersion.name}</span> ({shownAllPins.length} {shownAllPins.length === 1 ? 'pin' : 'pins'})
              </span>
              <button
                type="button"
                onClick={() => setSelectedVersion(null)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Show all
              </button>
            </div>
          )}
          {siteBlocked && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-50/95 p-6">
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
                  <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  {iframeState.blocked.kind === 'blocked' ? 'This site blocks review tools' : "This site couldn't be reached"}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {iframeState.blocked.kind === 'blocked'
                    ? `${iframeState.blocked.domain || 'The site'} uses firewall protection that stops it from loading here. You can still collect feedback on screenshots or a PDF of the pages.`
                    : `${iframeState.blocked.domain || 'The site'} didn't respond. Check the address, or try again in a moment.`}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Try again
                  </button>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Open the site
                  </a>
                  {canManageProject && (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard?create=document')}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Upload screenshots or a PDF
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phones: switch between the page and the comments */}
      <nav className="md:hidden grid grid-cols-2 border-t border-gray-200 bg-white shrink-0" aria-label="View">
        {[['page', 'Page'], ['comments', `Comments (${shownAllPins.filter((p) => p.status !== 'resolved').length})`]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            aria-pressed={mobilePane === id}
            className={`py-3 text-sm font-medium ${mobilePane === id ? 'text-blue-600' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* New pin comment popup — pin is created only when comment is submitted */}
      {pendingPinData && (
        <NewPinCommentPopup
          pinData={pendingPinData}
          projectId={project._id}
          members={allMembers}
          onClose={() => { setPendingPinData(null); if (!isDocumentProject) iframeState.clearScreenshot(); }}
          onPinSaved={handlePinSaved}
          onPinCreated={() => { loadPins(); loadAllPins(); setPendingPinData(null); }}
        />
      )}

      {/* Share modal */}
      <ShareProjectModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />

      {/* Invite modal */}
      <InviteMemberModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        projectId={project._id}
        project={project}
        onInvited={(updated) => {
          onProjectUpdate(updated);
          setShowInvite(false);
        }}
        onProjectUpdate={onProjectUpdate}
      />

      {/* Approvals modal */}
      <ApprovalsModal
        isOpen={showApprovals}
        onClose={() => setShowApprovals(false)}
        project={project}
        onProjectUpdate={onProjectUpdate}
        pins={allPins}
        canManage={canManageProject}
      />
    </div>
  );
}
