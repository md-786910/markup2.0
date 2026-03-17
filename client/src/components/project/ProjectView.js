import React, { useState, useEffect, useCallback } from "react";
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
export default function ProjectView({ project, onProjectUpdate }) {
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
      const { xPercent, yPercent } = iframeState.lastClick;
      createPinApi(project._id, {
        xPercent,
        yPercent,
        pageUrl: currentPageUrl,
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
