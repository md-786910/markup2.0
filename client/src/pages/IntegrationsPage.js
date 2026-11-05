import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmDialog } from "../utils/confirm";
import { useAuth } from "../hooks/useAuth";
import {
  getIntegrationsApi,
  createIntegrationApi,
  updateIntegrationApi,
  deleteIntegrationApi,
  testIntegrationApi,
} from "../services/integrationService";
import { toast, toastError } from "../utils/toast";
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  EmptyState,
  Field,
  Icon,
  Input,
  PageHeader,
  Section,
  Select,
  Tile,
} from "../components/kc";

// Integrations area: one provider per page, chosen by ?provider= (the shell's
// context panel links to slack, jira, discord and teams). The form edits the
// organization-wide connection; connections tied to a single project are
// listed below it so they can be removed.

const EVENT_OPTIONS = [
  { key: "pin.created", label: "New pin created" },
  { key: "comment.created", label: "New comment added" },
  { key: "pin.resolved", label: "Pin resolved" },
  { key: "pin.reopened", label: "Pin reopened" },
];

const PROVIDERS = {
  slack: {
    type: "slack",
    name: "Slack",
    letter: "S",
    tone: "rose",
    subtitle: "Send new pins and replies to a Slack channel.",
    fields: "webhook",
    placeholder: "https://hooks.slack.com/services/T00.../B00.../xxxx",
    hint: "Create an incoming webhook for the channel in Slack and paste its URL.",
  },
  jira: {
    type: "jira",
    name: "Jira",
    letter: "J",
    tone: "blue",
    subtitle: "Create a Jira issue for each new pin.",
    fields: "jira",
  },
  discord: {
    type: "discord",
    name: "Discord",
    letter: "D",
    tone: "amber",
    subtitle: "Send new pins and replies to a Discord channel.",
    fields: "webhook",
    placeholder: "https://discord.com/api/webhooks/...",
    hint: "In Discord, open the channel settings, then Integrations, then Webhooks.",
  },
  teams: {
    type: "teams",
    name: "Microsoft Teams",
    letter: "T",
    tone: "green",
    subtitle: "Send new pins and replies to a Microsoft Teams channel.",
    fields: "webhook",
    placeholder: "https://outlook.office.com/webhook/... or a Workflows webhook URL",
    hint: "Use an incoming webhook or a Workflows webhook URL for the channel.",
  },
};

const ISSUE_TYPES = ["Bug", "Task", "Story"];

function initialForm(existing) {
  const c = existing?.config || {};
  return {
    webhookUrl: c.webhookUrl || "",
    notifyOn: c.notifyOn || EVENT_OPTIONS.map((e) => e.key),
    domain: c.domain || "",
    email: c.email || "",
    // The server returns the token masked (last 4 characters); sending the
    // masked value back keeps the stored token.
    apiToken: c.apiToken || "",
    projectKey: c.projectKey || "",
    issueType: c.issueType || "Bug",
    syncPins: c.syncPins !== false,
  };
}

function ProviderForm({ provider, existing, disabled, onSave, onDelete }) {
  const [form, setForm] = useState(() => initialForm(existing));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const isWebhook = provider.fields === "webhook";
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const onInput = (key) => (e) => set(key)(e.target.value);

  const toggleEvent = (key, on) => {
    setForm((f) => ({
      ...f,
      notifyOn: on ? [...f.notifyOn.filter((k) => k !== key), key] : f.notifyOn.filter((k) => k !== key),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const config = isWebhook
        ? { webhookUrl: form.webhookUrl, notifyOn: form.notifyOn }
        : {
            domain: form.domain,
            email: form.email,
            apiToken: form.apiToken,
            projectKey: form.projectKey,
            issueType: form.issueType,
            syncPins: form.syncPins,
          };
      await onSave(provider.type, config, existing?._id);
      toast.success(existing ? "Changes saved." : `${provider.name} connected.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the integration.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!existing) return;
    setTesting(true);
    setTestResult("");
    clearTimeout(timer.current);
    try {
      const res = await testIntegrationApi(existing._id);
      setTestResult(res.data.message);
      timer.current = setTimeout(() => setTestResult(""), 4000);
    } catch (err) {
      setTestResult(err.response?.data?.message || "Test failed");
      timer.current = setTimeout(() => setTestResult(""), 5000);
    } finally {
      setTesting(false);
    }
  };

  const handleCancel = () => {
    setForm(initialForm(existing));
    setError("");
  };

  const testOk = testResult.toLowerCase().includes("success");

  const footer = [
    existing ? (
      <Button
        key="disconnect"
        variant="danger-quiet"
        style={{ marginRight: "auto" }}
        disabled={disabled}
        onClick={() => onDelete(existing._id)}
      >
        Disconnect
      </Button>
    ) : null,
    existing ? (
      <Button key="test" loading={testing} disabled={disabled} onClick={handleTest}>
        Send test message
      </Button>
    ) : null,
    <Button key="cancel" disabled={disabled || saving} onClick={handleCancel}>
      Cancel
    </Button>,
    <Button key="save" variant="primary" loading={saving} disabled={disabled} onClick={handleSave}>
      {existing ? "Save changes" : `Connect ${provider.name}`}
    </Button>,
  ];

  return (
    <>
      <Section
        title="Destination"
        description={isWebhook ? "Where Kommently posts." : "The Jira site and project that receive the issues."}
      >
        {isWebhook ? (
          <Field id="webhookUrl" label="Webhook URL" hint={provider.hint}>
            <Input
              id="webhookUrl"
              type="url"
              value={form.webhookUrl}
              onChange={onInput("webhookUrl")}
              placeholder={provider.placeholder}
              disabled={disabled}
            />
          </Field>
        ) : (
          <>
            <Field id="jiraDomain" label="Jira site" hint="Your Atlassian site address, without https://.">
              <Input
                id="jiraDomain"
                value={form.domain}
                onChange={onInput("domain")}
                placeholder="yourteam.atlassian.net"
                disabled={disabled}
              />
            </Field>
            <Field id="jiraProjectKey" label="Project key" hint="The short key shown in your Jira issue numbers.">
              <Input
                id="jiraProjectKey"
                value={form.projectKey}
                onChange={onInput("projectKey")}
                placeholder="PROJ"
                disabled={disabled}
              />
            </Field>
            <Field id="jiraEmail" label="Email address" hint="The Atlassian account that creates the issues.">
              <Input
                id="jiraEmail"
                type="email"
                value={form.email}
                onChange={onInput("email")}
                placeholder="your@email.com"
                disabled={disabled}
              />
            </Field>
            <Field
              id="jiraToken"
              label="API token"
              hint={
                existing
                  ? "Only the last 4 characters are shown. Leave it as is to keep the saved token."
                  : "Create one at id.atlassian.com under Security, then API tokens."
              }
            >
              <div style={{ display: "flex", gap: 8 }}>
                <Input
                  id="jiraToken"
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  value={form.apiToken}
                  onChange={onInput("apiToken")}
                  placeholder="Your Jira API token"
                  disabled={disabled}
                  style={{ flex: 1 }}
                />
                <Button
                  icon="eye"
                  aria-pressed={showToken}
                  disabled={disabled}
                  onClick={() => setShowToken((v) => !v)}
                >
                  {showToken ? "Hide" : "Show"}
                </Button>
              </div>
            </Field>
            <Field id="jiraIssueType" label="Issue type">
              <Select
                id="jiraIssueType"
                value={form.issueType}
                onChange={onInput("issueType")}
                options={ISSUE_TYPES}
                disabled={disabled}
              />
            </Field>
          </>
        )}
      </Section>

      <Section
        title="Events"
        description={isWebhook ? "Choose what is sent." : "Choose when issues are created."}
        footer={footer}
      >
        {isWebhook ? (
          EVENT_OPTIONS.map((evt) => (
            <Checkbox
              key={evt.key}
              label={evt.label}
              checked={form.notifyOn.includes(evt.key)}
              onChange={(on) => toggleEvent(evt.key, on)}
              disabled={disabled}
            />
          ))
        ) : (
          <Checkbox
            label="Create an issue for each new pin"
            description="The issue links back to the pin in Kommently."
            checked={form.syncPins}
            onChange={set("syncPins")}
            disabled={disabled}
          />
        )}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {testResult ? <Banner tone={testOk ? "success" : "danger"}>{testResult}</Banner> : null}
      </Section>
    </>
  );
}

export default function IntegrationsPage() {
  const { canManage, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const provider = PROVIDERS[params.get("provider")] || PROVIDERS.slack;
  const included = !!user?.orgLimits?.hasIntegrations;
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(included);

  useEffect(() => {
    if (!included || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getIntegrationsApi()
      .then((res) => setIntegrations(res.data.integrations))
      .catch((err) => toastError(err, "Could not load integrations."))
      .finally(() => setLoading(false));
  }, [included, canManage]);

  const ofType = useMemo(
    () => integrations.filter((i) => i.type === provider.type),
    [integrations, provider.type],
  );
  // Same as before the redesign: the page edits the first connection of this type
  const existing = ofType[0];

  const handleSave = async (type, config, existingId) => {
    if (existingId) {
      const res = await updateIntegrationApi(existingId, { config });
      setIntegrations((prev) => prev.map((i) => (i._id === existingId ? res.data.integration : i)));
    } else {
      const res = await createIntegrationApi({ type, config });
      setIntegrations((prev) => [...prev, res.data.integration]);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title: "Remove this integration?",
      message: "Kommently stops sending notifications to it. You can connect it again at any time.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteIntegrationApi(id);
      setIntegrations((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      toastError(err, "Could not remove the integration.");
    }
  };

  const title = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          flexShrink: 0,
        }}
      >
        <Icon name={provider.type} size={22} />
      </span>
      {provider.name}
    </span>
  );

  if (!canManage) {
    return (
      <>
        <PageHeader title={title} subtitle={provider.subtitle} />
        <div className="kc-page-narrow">
          <EmptyState icon="lock" title="Only owners and admins can manage integrations">
            Ask an owner or admin of your organization to connect {provider.name}.
          </EmptyState>
        </div>
      </>
    );
  }

  let badge = null;
  if (included && !loading) {
    if (!existing) badge = <Badge tone="neutral">Not connected</Badge>;
    else if (existing.enabled === false) badge = <Badge tone="neutral">Paused</Badge>;
    else badge = <Badge tone="approved">Connected</Badge>;
  } else if (!included) {
    badge = <Badge tone="neutral">Not connected</Badge>;
  }

  return (
    <>
      <PageHeader title={title} subtitle={provider.subtitle} actions={badge} />
      <div className="kc-stack kc-page-narrow">
        {!included ? (
          <Banner
            tone="info"
            title="Integrations are part of the Starter and Pro plans"
            action={
              <Button size="sm" variant="primary" onClick={() => navigate("/settings?tab=billing")}>
                Choose a plan
              </Button>
            }
          >
            Your current plan does not include them. Upgrade to send new pins and comments to your
            team's channels and create Jira issues.
          </Banner>
        ) : null}

        {loading ? (
          <p className="text-ui" style={{ color: "var(--slate-500)", margin: 0 }}>
            Loading integrations…
          </p>
        ) : (
          <ProviderForm
            key={`${provider.type}-${existing?._id || "new"}`}
            provider={provider}
            existing={existing}
            disabled={!included}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}

      </div>
    </>
  );
}
