import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import { Banner, Button, Field, Icon, IconButton, Tile } from '../kc';
import { createProjectApi, createDocumentProjectApi } from '../../services/projectService';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { workspaceTone } from '../layout/WorkspaceSwitcher';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateProjectModal({ isOpen, defaultType = 'website', onClose, onCreated }) {
  const [projectType, setProjectType] = useState(defaultType);
  const { current: workspace } = useWorkspaces();

  // Sync with defaultType when modal opens
  useEffect(() => {
    if (isOpen) setProjectType(defaultType);
  }, [isOpen, defaultType]);

  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (newFiles) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const valid = Array.from(newFiles).filter((f) => allowed.includes(f.type));
    if (valid.length < newFiles.length) {
      setError('Some files were skipped. Only PDF and image files are allowed.');
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (projectType === 'website') {
        res = await createProjectApi(name, websiteUrl, workspace?._id);
      } else {
        if (files.length === 0) {
          setError('Please upload at least one document');
          setLoading(false);
          return;
        }
        res = await createDocumentProjectApi(name, files, workspace?._id);
      }
      onCreated(res.data.project);
      setName('');
      setWebsiteUrl('');
      setFiles([]);
      setProjectType('website');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create project" size="md">
      {workspace && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>
          <span>In workspace:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, color: 'var(--text)' }}>
            <Tile letter={workspace.name} tone={workspaceTone(workspace)} size={18} />
            {workspace.name}
          </span>
        </div>
      )}

      {error && (
        <Banner tone="danger" style={{ marginBottom: 16 }}>
          {error}
        </Banner>
      )}

      {/* Project type cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => { setProjectType('website'); setError(''); }}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: projectType === 'website' ? '1.5px solid var(--brand-600)' : '1px solid var(--border)',
            background: projectType === 'website' ? 'var(--brand-50)' : 'var(--surface)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all .15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: projectType === 'website' ? 'var(--brand-600)' : 'var(--slate-100)',
                color: projectType === 'website' ? 'var(--white)' : 'var(--slate-600)',
                display: 'grid',
                placeItems: 'center',
                transition: 'all .15s ease',
              }}
            >
              <Icon name="globe" size={18} />
            </div>
            {projectType === 'website' && (
              <span style={{ color: 'var(--brand-600)', display: 'flex' }}>
                <Icon name="okc" size={18} />
              </span>
            )}
          </div>
          <div style={{ font: '600 13px/18px var(--font-sans)', color: 'var(--text)' }}>Website</div>
          <div style={{ font: '400 11.5px/16px var(--font-sans)', color: 'var(--slate-500)', marginTop: 2 }}>
            Live URL to review and annotate
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setProjectType('document'); setError(''); }}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: projectType === 'document' ? '1.5px solid var(--brand-600)' : '1px solid var(--border)',
            background: projectType === 'document' ? 'var(--brand-50)' : 'var(--surface)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all .15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: projectType === 'document' ? 'var(--brand-600)' : 'var(--slate-100)',
                color: projectType === 'document' ? 'var(--white)' : 'var(--slate-600)',
                display: 'grid',
                placeItems: 'center',
                transition: 'all .15s ease',
              }}
            >
              <Icon name="doc" size={18} />
            </div>
            {projectType === 'document' && (
              <span style={{ color: 'var(--brand-600)', display: 'flex' }}>
                <Icon name="okc" size={18} />
              </span>
            )}
          </div>
          <div style={{ font: '600 13px/18px var(--font-sans)', color: 'var(--text)' }}>Document</div>
          <div style={{ font: '400 11.5px/16px var(--font-sans)', color: 'var(--slate-500)', marginTop: 2 }}>
            PDF or images to review
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field id="projectName" label="Project name">
          <input
            id="projectName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="kc-input"
            placeholder={projectType === 'website' ? 'My Website Review' : 'My Document Review'}
          />
        </Field>

        {projectType === 'website' ? (
          <Field id="websiteUrl" label="Website URL" hint="Live website address with https://">
            <input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              className="kc-input"
              placeholder="https://example.com"
            />
          </Field>
        ) : (
          <Field label="Upload documents" hint="PDF, PNG, JPG, GIF, WebP (max 20 MB each)">
            <div
              style={{
                border: '1.5px dashed var(--border-control)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--surface)',
                transition: 'background .15s, border-color .15s',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <div style={{ color: 'var(--slate-400)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                <Icon name="upload" size={26} />
              </div>
              <div style={{ font: '500 13px/18px var(--font-sans)', color: 'var(--text)' }}>
                Drop files here or click to browse
              </div>
              <div style={{ font: '400 11.5px/16px var(--font-sans)', color: 'var(--slate-500)', marginTop: 2 }}>
                Upload designs, screenshots, or PDF guidelines
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                style={{ display: 'none' }}
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
              />
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {files.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--slate-50)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Icon name="doc" size={16} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--slate-500)', flexShrink: 0 }}>
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <IconButton icon="x" size="sm" label="Remove file" onClick={() => removeFile(i)} />
                  </div>
                ))}
              </div>
            )}
          </Field>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={loading}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
