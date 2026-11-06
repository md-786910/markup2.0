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
import { Logo, Icon, Badge, Button } from "../kc";

// PDF viewer (react-pdf + pdf.js) is only downloaded for document projects
const DocumentViewer = React.lazy(() => import("./DocumentViewer"));

import { getAvatarColor, AVATAR_COLORS } from "../../utils/avatarColors";

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
  const getMemberPresence = useCallback((member, idx) => {
    const ownerId = project.owner?._id || project.owner;
    return {
      member,
      isOnline: onlineUsers.has(member._id),
      lastSeen: lastSeenMap[member._id] || member.lastSeen,
      role: member._id === ownerId ? 'owner' : member.role,
      isYou: member._id === (user?.id || user?._id),
      color: getAvatarColor(member._id, idx),
      initials: getInitials(member.name || member.email),
    };
  }, [onlineUsers, lastSeenMap, project.owner, user?.id, user?._id]);

  const memberPresence = useMemo(() => allMembers.map((m, idx) => getMemberPresence(m, idx)), [allMembers, getMemberPresence]);

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
          if (pin.status !== 'resolved' && counts[pin.deviceMode || 'desktop'] !== undefined) {
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
      if (pin && pin.status !== 'resolved') {
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
      if (data.pin.status !== 'resolved') {
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
      } else if (data.pin.status !== 'resolved') {
        setDevicePinCounts((prev) => ({ ...prev, [mode]: (prev[mode] || 0) + 1 }));
      }
    });
  }, [onEvent]);

  // Pin deleted
  useEffect(() => {
    return onEvent('pin:deleted', (data) => {
      // Decrement device count if the deleted pin was active
      setAllPins((prev) => {
        const deleted = prev.find((p) => p._id === data.pinId);
        if (deleted && deleted.status !== 'resolved') {
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
      className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-150 relative ${deviceMode === 'desktop' ? 'text-slate-800 bg-white shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
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
      className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-150 relative ${deviceMode === 'tablet' ? 'text-slate-800 bg-white shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
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
      className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-150 relative ${deviceMode === 'mobile' ? 'text-slate-800 bg-white shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
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
    <div className="flex h-8 items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200" role="group" aria-label="Mode">
      <button
        type="button"
        onClick={() => setPinMode(false)}
        aria-pressed={!pinMode}
        className={`flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium rounded-md whitespace-nowrap transition-all ${
          !pinMode ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Icon name="eye" size={14} />
        <span>View</span>
      </button>
      <button
        type="button"
        onClick={() => setPinMode(true)}
        aria-pressed={pinMode}
        className={`flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium rounded-md whitespace-nowrap transition-all ${
          pinMode ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Icon name="chat" size={14} />
        <span>Comment</span>
      </button>
    </div>
  ) : null;

  return (
    <div className="kc flex flex-col h-screen h-dvh bg-slate-50">
      {/* Toolbar */}
      <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between relative shrink-0">
        {/* Left: Brand + Project + URL */}
        {/* Stops before the centered device switcher; the URL pill truncates instead of running under it */}
        <div className="flex items-center gap-3 min-w-0 z-10 md:max-w-[calc(50%-5rem)]">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors shrink-0 group"
            title="Back to dashboard"
          >
            <Logo size={28} />
            <Icon name="arrow" size={15} className="rotate-180 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </button>
          <div className="w-px h-5 bg-slate-200 shrink-0"></div>
          <h2 className="min-w-0 max-w-[160px] truncate font-semibold text-slate-900 text-[14px] sm:max-w-[220px] xl:max-w-none xl:shrink-0" title={project.name}>{project.name}</h2>
          {project.projectStatus === 'approved' && <Badge status="approved" />}
          {project.projectStatus === 'in_review' && <Badge status="review" />}
          {project.projectStatus === 'changes_requested' && <Badge status="changes" />}

          {/* Canvas vs Board View Switcher */}
          <div className="hidden sm:flex h-8 items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setViewLayout('canvas')}
              className={`flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium rounded-md transition-all ${
                viewLayout === 'canvas' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Canvas / Website view"
            >
              <Icon name="layers" size={14} />
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
              className={`flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium rounded-md transition-all ${
                viewLayout === 'board' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={limits.hasTaskWorkflow ? "Kanban Task Board" : "Kanban Task Board (Upgrade to Starter/Pro)"}
            >
              <Icon name="grid" size={14} />
              <span>Board</span>
              {!limits.hasTaskWorkflow && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1 rounded">PRO</span>
              )}
            </button>
          </div>
          <div className="hidden xl:flex h-8 items-center gap-1.5 text-[12px] text-slate-500 bg-slate-100/70 pl-2.5 pr-3 rounded-lg truncate max-w-md border border-slate-200 hover:bg-slate-100 transition-colors cursor-default" title={isDocumentProject ? currentDoc?.originalName : currentPageUrl}>
            <Icon name={isDocumentProject ? "doc" : "globe"} size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{isDocumentProject ? `${currentDoc?.originalName} — Page ${currentDocPage}` : currentPageUrl}</span>
          </div>
        </div>

        {/* Center: Device switcher — absolutely centered so it doesn't shift with URL length */}
        {!isDocumentProject ? (
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 gap-0.5">
            {deviceButtons}
          </div>
        ) : (
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 text-[12px] text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            <Icon name="doc" size={14} className="text-slate-500" />
            Document
          </div>
        )}

        {/* Right: Mode toggle + Avatars + Invite */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3 z-10">
          {/* View / Comment mode toggle */}
          <div className="hidden md:block">{modeToggle}</div>

          {/* Member avatars */}
          <MembersPresencePopover entries={memberPresence}>
          <div tabIndex={0} className="hidden lg:flex items-center -space-x-1.5 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {memberPresence.slice(0, 5).map((p) => (
              <div key={p.member._id} className="relative transition-transform hover:-translate-y-0.5 hover:z-10">
                <div className={`w-7 h-7 rounded-full ${p.color.bg} ${p.color.text} flex items-center justify-center text-[11px] font-semibold border-2 border-white shadow-xs`}>
                  {p.initials}
                </div>
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
                  p.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
              </div>
            ))}
            {memberPresence.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold border-2 border-white">
                +{memberPresence.length - 5}
              </div>
            )}
          </div>
          </MembersPresencePopover>

          {/* Bell Notifications */}
          <NotificationBell variant="detailed" projectId={project?._id} onSelectPin={handlePinNavigate} />

          <div className="hidden md:block w-px h-5 bg-slate-200"></div>

          {canManageProject && (
            <Button
              variant="secondary"
              icon="external"
              onClick={() => setShowShare(true)}
              title="Share with guests"
            >
              <span className="hidden lg:inline">Share</span>
            </Button>
          )}

          {canManageProject && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setShowInvite(true)}
              title="Invite people"
            >
              <span className="hidden lg:inline">Invite</span>
            </Button>
          )}
        </div>
      </header>

      {/* Phones: device size and mode under the toolbar */}
      {(!isDocumentProject || modeToggle) && (
        <div className="md:hidden flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
          {!isDocumentProject ? (
            <div className="flex h-8 items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 gap-0.5">{deviceButtons}</div>
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
          <div className="w-full md:w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
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
              projectId={project?._id}
              project={project}
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
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200 bg-white py-1.5 pl-4 pr-1.5 text-body-sm shadow-md">
              <span className="text-gray-600">
                Showing <span className="font-medium text-gray-900">{selectedVersion.name}</span> ({shownAllPins.length} {shownAllPins.length === 1 ? 'pin' : 'pins'})
              </span>
              <button
                type="button"
                onClick={() => setSelectedVersion(null)}
                className="rounded-full bg-gray-100 px-3 py-1 text-caption font-medium text-gray-700 hover:bg-gray-200"
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
                <h3 className="text-body font-semibold text-gray-900">
                  {iframeState.blocked.kind === 'blocked' ? 'This site blocks review tools' : "This site couldn't be reached"}
                </h3>
                <p className="mt-2 text-body-sm text-gray-600">
                  {iframeState.blocked.kind === 'blocked'
                    ? `${iframeState.blocked.domain || 'The site'} uses firewall protection that stops it from loading here. You can still collect feedback on screenshots or a PDF of the pages.`
                    : `${iframeState.blocked.domain || 'The site'} didn't respond. Check the address, or try again in a moment.`}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-label text-gray-700 hover:bg-gray-50"
                  >
                    Try again
                  </button>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-label text-gray-700 hover:bg-gray-50"
                  >
                    Open the site
                  </a>
                  {canManageProject && (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard?create=document')}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-label text-white hover:bg-blue-700"
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
            className={`py-3 text-label ${mobilePane === id ? 'text-blue-600' : 'text-gray-500'}`}
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

    </div>
  );
}
