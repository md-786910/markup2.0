import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getIntegrationsApi,
  createIntegrationApi,
  updateIntegrationApi,
  deleteIntegrationApi,
  testIntegrationApi,
} from "../services/integrationService";

const EVENT_OPTIONS = [
  { key: "pin.created", label: "New pin created" },
  { key: "comment.created", label: "New comment added" },
  { key: "pin.resolved", label: "Pin resolved" },
  { key: "pin.reopened", label: "Pin reopened" },
];

const INTEGRATION_TYPES = [
  {
    type: "slack",
    name: "Slack",
    description:
      "Get real-time notifications in your Slack channel when feedback is added or updated.",
    color: "from-[#4A154B] to-[#611f69]",
    fields: "webhook",
    placeholder: "https://hooks.slack.com/services/T00.../B00.../xxxx",
  },
  {
    type: "discord",
    name: "Discord",
    description:
      "Send rich embed notifications to your Discord server for every feedback event.",
    color: "from-[#5865F2] to-[#4752c4]",
    fields: "webhook",
    placeholder: "https://discord.com/api/webhooks/...",
  },
  {
    type: "jira",
    name: "Jira",
    description:
      "Automatically create Jira issues from feedback pins and keep your backlog in sync.",
    color: "from-[#0052CC] to-[#0747a6]",
    fields: "jira",
  },
];

function SlackIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm6.313 6.312a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 12.584a2.528 2.528 0 0 1-2.522 2.521h-2.52v-2.521zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V6.271a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521v6.313zM15.165 18.958a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function JiraIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z" />
    </svg>
  );
}

const ICONS = {
  slack: <SlackIcon />,
  discord: <DiscordIcon />,
  jira: <JiraIcon />,
};

function IntegrationCard({ typeConfig, existing, onSave, onDelete, onTest }) {
  const [expanded, setExpanded] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(
    existing?.config?.webhookUrl || "",
  );
  const [notifyOn, setNotifyOn] = useState(
    existing?.config?.notifyOn || EVENT_OPTIONS.map((e) => e.key),
  );
  const [jiraDomain, setJiraDomain] = useState(existing?.config?.domain || "");
  const [jiraEmail, setJiraEmail] = useState(existing?.config?.email || "");
  const [jiraToken, setJiraToken] = useState(existing?.config?.apiToken || "");
  const [jiraProjectKey, setJiraProjectKey] = useState(
    existing?.config?.projectKey || "",
  );
  const [jiraIssueType, setJiraIssueType] = useState(
    existing?.config?.issueType || "Bug",
  );
  const [jiraSyncPins, setJiraSyncPins] = useState(
    existing?.config?.syncPins !== false,
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [error, setError] = useState("");

  const isWebhook = typeConfig.fields === "webhook";

  const toggleEvent = (key) => {
    setNotifyOn((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      let config;
      if (isWebhook) {
        config = { webhookUrl, notifyOn };
      } else {
        config = {
          domain: jiraDomain,
          email: jiraEmail,
          apiToken: jiraToken,
          projectKey: jiraProjectKey,
          issueType: jiraIssueType,
          syncPins: jiraSyncPins,
        };
      }
      await onSave(typeConfig.type, config, existing?._id);
      if (!existing) setExpanded(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!existing) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await onTest(existing._id);
      setTestResult(res.data.message);
      setTimeout(() => setTestResult(""), 4000);
    } catch (err) {
      setTestResult(err.response?.data?.message || "Test failed");
      setTimeout(() => setTestResult(""), 5000);
    } finally {
      setTesting(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow placeholder:text-gray-400";

  return (
    <div
      className={`border rounded-xl transition-all duration-200 ${expanded ? "border-gray-300 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
    >
      {/* Header */}
      <button
        className="flex flex-col w-full p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between w-full mb-3">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center shadow-sm`}
          >
            {ICONS[typeConfig.type]}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2.5 mb-1">
          <h3 className="text-sm font-semibold text-gray-900">
            {typeConfig.name}
          </h3>
          {existing && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                existing.enabled
                  ? "bg-green-50 text-green-600 ring-1 ring-green-200"
                  : "bg-gray-50 text-gray-500 ring-1 ring-gray-200"
              }`}
            >
              {existing.enabled ? "Connected" : "Disabled"}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {typeConfig.description}
        </p>
      </button>

      {/* Expanded config */}
      <div
        className={`overflow-hidden transition-all duration-200 ${expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-5">
          {/* Webhook fields (Slack / Discord) */}
          {isWebhook && (
            <>
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={typeConfig.placeholder}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-3 block">
                  Events to notify
                </label>
                <div className="space-y-2">
                  {EVENT_OPTIONS.map((evt) => (
                    <label
                      key={evt.key}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        notifyOn.includes(evt.key)
                          ? "bg-blue-50/60 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={notifyOn.includes(evt.key)}
                        onChange={() => toggleEvent(evt.key)}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-[13px] font-medium">
                        {evt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Jira fields */}
          {typeConfig.fields === "jira" && (
            <>
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  Jira Domain
                </label>
                <input
                  type="text"
                  value={jiraDomain}
                  onChange={(e) => setJiraDomain(e.target.value)}
                  placeholder="yourteam.atlassian.net"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  Project Key
                </label>
                <input
                  type="text"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value)}
                  placeholder="PROJ"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  API Token
                </label>
                <input
                  type="password"
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  placeholder="Your Jira API token"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Generate at id.atlassian.com under Security &gt; API tokens
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1.5 block">
                  Issue Type
                </label>
                <select
                  value={jiraIssueType}
                  onChange={(e) => setJiraIssueType(e.target.value)}
                  className={inputClass}
                >
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Story">Story</option>
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer px-3.5 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <input
                  type="checkbox"
                  checked={jiraSyncPins}
                  onChange={(e) => setJiraSyncPins(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-[13px] font-medium text-gray-700">
                  Auto-create issues from new pins
                </span>
              </label>
            </>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <svg
                className="w-4 h-4 text-red-500 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                testResult.includes("success")
                  ? "bg-green-50 border-green-100"
                  : "bg-red-50 border-red-100"
              }`}
            >
              <svg
                className={`w-4 h-4 shrink-0 ${testResult.includes("success") ? "text-green-500" : "text-red-500"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                {testResult.includes("success") ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                )}
              </svg>
              <p
                className={`text-sm ${testResult.includes("success") ? "text-green-600" : "text-red-600"}`}
              >
                {testResult}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving..." : existing ? "Save Changes" : "Connect"}
            </button>
            {existing && (
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {testing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Testing...
                  </span>
                ) : (
                  "Send Test"
                )}
              </button>
            )}
            {existing && (
              <button
                onClick={() => onDelete(existing._id)}
                className="px-5 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-auto"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { canManage } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntegrationsApi()
      .then((res) => setIntegrations(res.data.integrations))
      .catch((err) => console.error("Failed to load integrations:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (type, config, existingId) => {
    if (existingId) {
      const res = await updateIntegrationApi(existingId, { config });
      setIntegrations((prev) =>
        prev.map((i) => (i._id === existingId ? res.data.integration : i)),
      );
    } else {
      const res = await createIntegrationApi({ type, config });
      setIntegrations((prev) => [...prev, res.data.integration]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this integration?")) return;
    await deleteIntegrationApi(id);
    setIntegrations((prev) => prev.filter((i) => i._id !== id));
  };

  const handleTest = (id) => testIntegrationApi(id);

  if (!canManage) {
    return (
      <div className="px-6 lg:px-8 py-6 lg:py-8 max-w-3xl animate-page-enter">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Access Restricted
          </h3>
          <p className="text-sm text-gray-500">
            Only workspace owners and admins can manage integrations.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-6 lg:py-8 max-w-3xl animate-page-enter">
        <div className="mb-8">
          <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[76px] bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6 lg:py-8 animate-page-enter">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your favorite tools to get notified about feedback in
          real-time.
        </p>
      </div>

      {/* Integration cards */}
      <div className="gap-4 grid ">
        {INTEGRATION_TYPES.map((typeConfig) => {
          const existing = integrations.find((i) => i.type === typeConfig.type);
          return (
            <IntegrationCard
              key={typeConfig.type}
              typeConfig={typeConfig}
              existing={existing}
              onSave={handleSave}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-8 flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <svg
          className="w-5 h-5 text-gray-400 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <div>
          <p className="text-sm text-gray-600 font-medium">
            How integrations work
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            When feedback events happen (new pin, comment, or resolution),
            notifications are automatically sent to your connected services.
            Each integration can be configured to listen for specific events.
          </p>
        </div>
      </div>
    </div>
  );
}
