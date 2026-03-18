import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import IframeContainer from "./IframeContainer";
import CommentSidebar from "./CommentSidebar";
import PinListSidebar from "./PinListSidebar";
import InviteMemberModal from "./InviteMemberModal";
import { useAuth } from "../../hooks/useAuth";
import { useIframeMessages } from "../../hooks/useIframeMessages";
import {
  getPinsApi,
  createPinApi,
  updatePinApi,
  deletePinApi,
} from "../../services/pinService";
import { TOKEN_KEY } from "../../utils/constants";
import { useSocket } from "../../hooks/useSocket";

export default function ProjectView({ project, onProjectUpdate, initialPinId }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [pins, setPins] = useState([]);
  const [allPins, setAllPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [targetUrl, setTargetUrl] = useState(project.websiteUrl);
  const [iframeLoading, setIframeLoading] = useState(true);
  const iframeState = useIframeMessages();
  const { onEvent } = useSocket(project._id);
  const deepLinkHandled = useRef(false);

  const token = localStorage.getItem(TOKEN_KEY);
  const proxyUrl = `http://localhost:5000/api/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${project._id}&token=${token}`;

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

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  useEffect(() => {
    loadAllPins();
  }, [loadAllPins]);

  // Handle clicks from iframe (new pin creation)
  useEffect(() => {
    if (iframeState.lastClick && pinMode) {
      const { xPercent, yPercent, selector, elementOffsetX, elementOffsetY } = iframeState.lastClick;
      createPinApi(project._id, {
        xPercent,
        yPercent,
        pageUrl: currentPageUrl,
        selector,
        elementOffsetX,
        elementOffsetY,
      })
        .then((res) => {
          setSelectedPin(res.data.pin);
          setPinMode(false);
          loadPins();
          loadAllPins();
          iframeState.clearLastClick();
        })
        .catch((err) => {
          console.error("Failed to create pin:", err);
          iframeState.clearLastClick();
        });
    }
  }, [
    iframeState.lastClick,
    iframeState.clearLastClick,
    pinMode,
    project._id,
    currentPageUrl,
    loadPins,
    loadAllPins,
  ]);

  // Listen for pin clicks from iframe
  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (data?.type === "MARKUP_PIN_CLICK") {
        const pin = pins.find((p) => p._id === data.pinId);
        if (pin) setSelectedPin(pin);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [pins]);

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
    setSelectedPin(pin);
    if (pin.pageUrl !== targetUrl) {
      iframeState.resetReady();
      setIframeLoading(true);
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
          <button
            onClick={() => setPinMode(!pinMode)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pinMode
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {pinMode ? "📌 Pin Mode ON" : "📌 Pin Mode"}
          </button>
          <span className="text-sm text-gray-500">
            {pins.length} pin{pins.length !== 1 ? "s" : ""}
          </span>
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
        />

        {/* Iframe area */}
        <div className="flex-1 relative">
          <IframeContainer
            key={targetUrl}
            proxyUrl={proxyUrl}
            pinMode={pinMode}
            pins={pins}
            selectedPinId={selectedPin?._id}
            loading={iframeLoading}
            onLoad={handleIframeLoad}
          />
        </div>

        {/* Right comment sidebar */}
        {selectedPin && (
          <CommentSidebar
            pin={selectedPin}
            onClose={() => setSelectedPin(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDeletePin}
            onEvent={onEvent}
          />
        )}
      </div>

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
