const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Organization = require('../models/Organization');
const asyncHandler = require('../utils/asyncHandler');
const { logGuestActivity } = require('../utils/activityLogger');
const { metric } = require('../instrument');
const { createProjectNotifications } = require('../utils/notificationHelper');
const { sanitizeCommentBody } = require('../utils/sanitizeComment');
const { reserveStorage, discardUploads } = require('../utils/storage');
const { normalizePageUrl, pageUrlFilter } = require('../utils/pageUrl');
const { sanitizePinContext } = require('../utils/pinContext');
const { findShared, findSharedWorkspace, workspaceProjectsQuery, composeWorkspaceToken, isExpired } = require('../utils/sharing');

// Verify a guest-supplied password against either the bcrypt hash (preferred,
// new projects + migrated ones) or the legacy plaintext field (pre-migration
// projects). Plaintext path will be removed once all projects are migrated.
async function verifySharePassword(supplied, shareSettings) {
  if (!supplied) return false;
  if (shareSettings.passwordHash) {
    return bcrypt.compare(String(supplied), shareSettings.passwordHash);
  }
  if (shareSettings.password) {
    return supplied === shareSettings.password;
  }
  return false;
}

// --- Guest access token ---------------------------------------------------
// Issued by getGuestProject after a successful password check and sent back by
// the guest client in the X-Guest-Access header, so password-protected shares
// stay protected on every endpoint (not just the first load). Bound to the
// project (or, for a workspace link, to the workspace) and to the current
// password, so changing the password revokes it.
const GUEST_TOKEN_PURPOSE = 'guest';

function passwordFingerprint(shareSettings) {
  const secret = shareSettings.passwordHash || shareSettings.password || '';
  return crypto.createHash('sha256').update(String(secret)).digest('hex').slice(0, 16);
}

function signGuestAccessToken(scope, share) {
  return jwt.sign(
    { purpose: GUEST_TOKEN_PURPOSE, ...scope, pwf: passwordFingerprint(share) },
    process.env.JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' },
  );
}

function hasValidGuestAccessToken(req, scope, share) {
  const token = req.get('X-Guest-Access');
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const sameScope = scope.workspaceId ? decoded.workspaceId === scope.workspaceId : decoded.projectId === scope.projectId;
    return decoded.purpose === GUEST_TOKEN_PURPOSE && sameScope && decoded.pwf === passwordFingerprint(share);
  } catch {
    return false;
  }
}

const hasPassword = (share) => !!(share.passwordHash || share.password);

// Loads the shared project and enforces enabled + expiry + password on every
// guest endpoint (and, for writes, that the owning org isn't locked). Sends the
// error response and returns null when access is denied.
// The governing share settings (project's or workspace's) are set on req.share.
async function loadSharedProject(req, res, { write = false } = {}) {
  const found = await findShared(req.params.shareToken);
  if (!found.project) {
    res.status(found.status).json({ message: found.message });
    return null;
  }
  const { project, share, scope } = found;
  req.share = share;

  if (hasPassword(share) && !hasValidGuestAccessToken(req, scope, share)) {
    res.status(401).json({ message: 'This review requires a password.', requiresPassword: true });
    return null;
  }

  if (write) {
    const org = await Organization.findById(project.organization).select('isLocked');
    if (org && org.isLocked) {
      res.status(403).json({ message: 'This review is read-only right now. Please contact the team that shared it.', code: 'ORG_LOCKED' });
      return null;
    }
  }

  return project;
}

/**
 * GET /api/guest/:shareToken
 * Public endpoint — returns project data for guest review.
 */
exports.getGuestProject = asyncHandler(async (req, res) => {
  const { shareToken } = req.params;
  const { password } = req.query;

  const found = await findShared(shareToken, 'name projectType websiteUrl documents shareSettings projectStatus workspace');
  if (!found.project) {
    return res.status(found.status).json({
      message: found.status === 404 ? 'Review link not found or has been disabled.' : found.message,
    });
  }
  const { project, share, scope } = found;

  // Check password. Distinguish "no password supplied" (first load — show prompt
  // without an error) from "wrong password" (user submitted a guess — show error).
  // A valid access token (e.g. from the workspace page) also counts.
  const hasSharePassword = hasPassword(share);
  if (hasSharePassword && !hasValidGuestAccessToken(req, scope, share)) {
    if (!password) {
      return res.status(401).json({
        message: 'This review requires a password.',
        requiresPassword: true,
      });
    }
    const ok = await verifySharePassword(password, share);
    if (!ok) {
      return res.status(401).json({
        message: 'Incorrect password. Please try again.',
        requiresPassword: true,
        invalidPassword: true,
      });
    }
  }

  // Return limited project data
  res.json({
    guestAccessToken: hasSharePassword ? signGuestAccessToken(scope, share) : undefined,
    workspaceToken: scope.workspaceId ? shareToken.split('.')[0] : undefined,
    project: {
      _id: project._id,
      name: project.name,
      projectType: project.projectType,
      websiteUrl: project.websiteUrl,
      documents: project.documents,
      projectStatus: project.projectStatus,
      allowComments: share.allowComments,
    },
  });
});

/**
 * GET /api/guest/workspace/:workspaceToken[?password=]
 * Public: the projects behind a workspace review link. Each project opens on
 * the normal review page with the token "<workspaceToken>.<projectId>".
 */
exports.getGuestWorkspace = asyncHandler(async (req, res) => {
  const { workspaceToken } = req.params;
  const workspace = await findSharedWorkspace(workspaceToken);
  if (!workspace) return res.status(404).json({ message: 'Review link not found or has been disabled.' });
  const share = workspace.shareSettings;
  if (isExpired(share)) return res.status(410).json({ message: 'This review link has expired.' });

  const scope = { workspaceId: workspace._id.toString() };
  if (hasPassword(share) && !hasValidGuestAccessToken(req, scope, share)) {
    const { password } = req.query;
    if (!password) return res.status(401).json({ message: 'This review requires a password.', requiresPassword: true });
    if (!(await verifySharePassword(password, share))) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.', requiresPassword: true, invalidPassword: true });
    }
  }

  const [org, projects] = await Promise.all([
    Organization.findById(workspace.organization).select('name logo'),
    Project.find(workspaceProjectsQuery(workspace))
      .select('name projectType websiteUrl documents updatedAt')
      .sort({ updatedAt: -1 })
      .lean(),
  ]);
  const counts = await Pin.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) }, status: 'pending' } },
    { $group: { _id: '$project', open: { $sum: 1 } } },
  ]);
  const openBy = new Map(counts.map((c) => [c._id.toString(), c.open]));

  res.json({
    guestAccessToken: hasPassword(share) ? signGuestAccessToken(scope, share) : undefined,
    workspace: { name: workspace.name, allowComments: share.allowComments },
    organization: { name: org?.name || '', logo: org?.logo || null },
    projects: projects.map((p) => ({
      _id: p._id,
      name: p.name,
      projectType: p.projectType,
      websiteUrl: p.websiteUrl,
      documentCount: (p.documents || []).length,
      cover: p.documents?.[0] ? { path: p.documents[0].path, mimetype: p.documents[0].mimetype, name: p.documents[0].originalName, pages: p.documents[0].pageCount || 1 } : null,
      updatedAt: p.updatedAt,
      openPinCount: openBy.get(p._id.toString()) || 0,
      shareToken: composeWorkspaceToken(workspaceToken, p._id),
    })),
  });
});

/**
 * GET /api/guest/:shareToken/pins
 * Public endpoint — returns pins for guest review.
 */
exports.getGuestPins = asyncHandler(async (req, res) => {
  const { pageUrl, deviceMode } = req.query;

  const project = await loadSharedProject(req, res);
  if (!project) return;

  const filter = { project: project._id };
  if (pageUrl) filter.pageUrl = pageUrlFilter(pageUrl);
  if (deviceMode) filter.deviceMode = deviceMode;

  const pins = await Pin.find(filter)
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  // Get comment counts
  const pinIds = pins.map((p) => p._id);
  const commentAgg = await Comment.aggregate([
    { $match: { pin: { $in: pinIds } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$pin', count: { $sum: 1 }, firstBody: { $first: '$body' }, firstCreatedAt: { $first: '$createdAt' } } },
  ]);
  const countMap = {};
  commentAgg.forEach((c) => { countMap[c._id.toString()] = c; });

  // Count plus the first comment (list preview), as in the member pin list
  const allowConsole = !!project.settings?.guestConsoleCapture;
  const pinsWithCounts = pins.map((pin) => {
    const info = countMap[pin._id.toString()];
    const pinObj = pin.toObject();
    if (!allowConsole && pinObj.context) {
      pinObj.context.consoleErrors = [];
    }
    return {
      ...pinObj,
      commentsCount: info ? info.count : 0,
      firstComment: info ? { body: info.firstBody, createdAt: info.firstCreatedAt } : null,
    };
  });

  res.json({ pins: pinsWithCounts });
});

/**
 * GET /api/guest/:shareToken/pins/:pinId/comments
 * Public endpoint — returns comments for a pin.
 */
exports.getGuestComments = asyncHandler(async (req, res) => {
  const { pinId } = req.params;

  const project = await loadSharedProject(req, res);
  if (!project) return;

  const pin = await Pin.findOne({ _id: pinId, project: project._id }).select('_id');
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found.' });
  }

  // Team members' emails are not exposed to guests
  const comments = await Comment.find({ pin: pin._id })
    .populate('author', 'name')
    .sort({ createdAt: 1 });

  res.json({ comments });
});

/**
 * POST /api/guest/:shareToken/pins
 * Public endpoint — create pin as guest.
 */
exports.createGuestPin = asyncHandler(async (req, res) => {
  const project = await loadSharedProject(req, res, { write: true });
  if (!project) return;

  if (!req.share.allowComments) {
    return res.status(403).json({ message: 'Guest commenting is disabled for this project.' });
  }

  const {
    guestName, guestEmail, pageUrl, xPercent, yPercent,
    selector, elementOffsetX, elementOffsetY,
    documentWidth, documentHeight, deviceMode,
    viewportXPercent, viewportYPercent,
  } = req.body;

  if (!guestName || !guestEmail) {
    return res.status(400).json({ message: 'Guest name and email are required.' });
  }

  if (xPercent == null || yPercent == null || !pageUrl) {
    return res.status(400).json({ message: 'xPercent, yPercent, and pageUrl are required.' });
  }

  // Get next pin number
  const lastPin = await Pin.findOne({ project: project._id })
    .sort({ pinNumber: -1 })
    .select('pinNumber')
    .lean();
  const pinNumber = (lastPin?.pinNumber || 0) + 1;

  const context = sanitizePinContext(req.body.context, {
    projectSettings: project.settings,
    isGuest: true,
    userAgent: req.headers['user-agent'],
  });

  const pin = await Pin.create({
    project: project._id,
    pageUrl: normalizePageUrl(pageUrl),
    createdBy: null,
    createdByGuest: { name: guestName, email: guestEmail },
    xPercent: parseFloat(xPercent),
    yPercent: parseFloat(yPercent),
    selector: selector || null,
    elementOffsetX: elementOffsetX != null ? parseFloat(elementOffsetX) : null,
    elementOffsetY: elementOffsetY != null ? parseFloat(elementOffsetY) : null,
    documentWidth: documentWidth != null ? parseFloat(documentWidth) : null,
    documentHeight: documentHeight != null ? parseFloat(documentHeight) : null,
    deviceMode: deviceMode || 'desktop',
    viewportXPercent: viewportXPercent != null ? parseFloat(viewportXPercent) : null,
    viewportYPercent: viewportYPercent != null ? parseFloat(viewportYPercent) : null,
    pinNumber,
    context,
  });

  // Activity log
  logGuestActivity(project._id, guestName, guestEmail, 'guest.pin_created', { pinNumber });

  // In-app notifications to project members
  createProjectNotifications({
    io: req.app.get('io'),
    projectId: project._id,
    actorGuest: { name: guestName, email: guestEmail },
    type: 'pin_created',
    pin,
    metadata: { pinNumber, pageUrl },
  }).catch(() => {});

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${project._id}`).emit('pin:created', { pin });
  }

  metric('pin.created', { source: 'guest' });
  res.status(201).json({ pin });
});

/**
 * POST /api/guest/:shareToken/pins/:pinId/comments
 * Public endpoint — create comment as guest.
 */
exports.createGuestComment = asyncHandler(async (req, res) => {
  const { pinId } = req.params;

  const project = await loadSharedProject(req, res, { write: true });
  if (!project) return discardUploads(req);

  const storageError = await reserveStorage(project.organization, req);
  if (storageError) return res.status(403).json(storageError);

  if (!req.share.allowComments) {
    return res.status(403).json({ message: 'Guest commenting is disabled for this project.' });
  }

  const { guestName, guestEmail } = req.body;
  const body = sanitizeCommentBody(req.body.body);

  if (!guestName || !guestEmail) {
    return res.status(400).json({ message: 'Guest name and email are required.' });
  }

  if (!body) {
    return res.status(400).json({ message: 'Comment body is required.' });
  }

  const pin = await Pin.findById(pinId);
  if (!pin || pin.project.toString() !== project._id.toString()) {
    return res.status(404).json({ message: 'Pin not found.' });
  }

  const attachments = (req.files || []).map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: `uploads/documents/${file.filename}`,
  }));

  const comment = await Comment.create({
    pin: pinId,
    author: null,
    authorGuest: { name: guestName, email: guestEmail },
    body,
    attachments,
  });

  // Activity log
  logGuestActivity(project._id, guestName, guestEmail, 'guest.commented', { pinNumber: pin.pinNumber });

  // In-app notifications to project members
  createProjectNotifications({
    io: req.app.get('io'),
    projectId: project._id,
    actorGuest: { name: guestName, email: guestEmail },
    type: 'comment',
    pin,
    comment,
    message: body,
    metadata: { pinNumber: pin.pinNumber, pageUrl: pin.pageUrl },
  }).catch(() => {});

  // Real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${project._id}`).emit('comment:created', { comment, pinId });
  }

  metric('comment.created', { source: 'guest' });
  res.status(201).json({ comment });
});
