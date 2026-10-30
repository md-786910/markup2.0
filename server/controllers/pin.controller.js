const Pin = require('../models/Pin');
const { deletePinCascade } = require('../utils/cascade');
const Comment = require('../models/Comment');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { emitToProject, emailProjectMembers, notifyIntegrations } = require('../utils/notifier');
const { logActivity } = require('../utils/activityLogger');
const { metric } = require('../instrument');
const { extractMentionedUserIds } = require('../utils/mentionHelper');
const { createProjectNotifications, createSingleNotification } = require('../utils/notificationHelper');
const { visibleProjectsQuery, projectLevelFor } = require('../utils/workspaces');
const { atLeast } = require('../utils/access');
const mongoose = require('mongoose');
const { normalizePageUrl, pageUrlFilter } = require('../utils/pageUrl');
const { sanitizePinContext } = require('../utils/pinContext');
const { releaseUploads } = require('../utils/storage');

exports.createPin = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // When using multer (multipart/form-data), all body fields are strings
  const pageUrl = normalizePageUrl(req.body.pageUrl);
  const xPercent = req.body.xPercent != null ? parseFloat(req.body.xPercent) : null;
  const yPercent = req.body.yPercent != null ? parseFloat(req.body.yPercent) : null;
  const selector = req.body.selector || null;
  const elementOffsetX = req.body.elementOffsetX != null ? parseFloat(req.body.elementOffsetX) : null;
  const elementOffsetY = req.body.elementOffsetY != null ? parseFloat(req.body.elementOffsetY) : null;
  const documentWidth = req.body.documentWidth != null ? parseFloat(req.body.documentWidth) : null;
  const documentHeight = req.body.documentHeight != null ? parseFloat(req.body.documentHeight) : null;
  const deviceMode = req.body.deviceMode || 'desktop';
  const viewportXPercent = req.body.viewportXPercent != null ? parseFloat(req.body.viewportXPercent) : null;
  const viewportYPercent = req.body.viewportYPercent != null ? parseFloat(req.body.viewportYPercent) : null;

  if (xPercent == null || isNaN(xPercent) || yPercent == null || isNaN(yPercent) || !pageUrl) {
    return res.status(400).json({ message: 'xPercent, yPercent, and pageUrl are required' });
  }

  // Screenshot file uploaded via multer
  const screenshot = req.file ? {
    filename: req.file.filename,
    path: `uploads/${req.file.filename}`,
    size: req.file.size,
  } : null;

  const projectDoc = await Project.findById(projectId).select('name organization settings review');
  if (projectDoc?.review?.deadlineAt && new Date() > new Date(projectDoc.review.deadlineAt)) {
    await releaseUploads(req.organization?._id, req);
    return res.status(423).json({
      code: 'FEEDBACK_CLOSED',
      message: projectDoc.review.deadlineMessage || 'Feedback has closed for this review round.',
      deadlineAt: projectDoc.review.deadlineAt,
    });
  }

  // Get next incremental pin number for this project
  const lastPin = await Pin.findOne({ project: projectId })
    .sort({ pinNumber: -1 })
    .select('pinNumber')
    .lean();
  const pinNumber = (lastPin?.pinNumber || 0) + 1;

  const context = sanitizePinContext(req.body.context, {
    projectSettings: projectDoc?.settings,
    isGuest: false,
    userAgent: req.headers['user-agent'],
  });

  const pin = await Pin.create({
    project: projectId,
    pageUrl,
    createdBy: req.user._id,
    xPercent,
    yPercent,
    selector,
    elementOffsetX,
    elementOffsetY,
    documentWidth,
    documentHeight,
    deviceMode,
    viewportXPercent,
    viewportYPercent,
    screenshot,
    pinNumber,
    context,
  });

  const populated = await Pin.findById(pin._id).populate('createdBy', 'name email');

  // Real-time notification (email is sent when the first comment is created)
  const io = req.app.get('io');
  emitToProject(io, projectId, 'pin:created', { pin: populated });

  // Activity log
  logActivity(projectId, req.user._id, 'pin.created', { pinNumber, pageUrl });

  // Notify integrations (fire-and-forget)
  // Skip if client signals a comment will follow — the comment endpoint sends a combined notification
  const hasInitialComment = req.body.initialComment === 'true' || req.body.initialComment === true;
  if (!hasInitialComment) {
    createProjectNotifications({
      io,
      projectId,
      actor: req.user,
      type: 'pin_created',
      pin: populated,
      metadata: { pinNumber, pageUrl },
    }).catch(() => {});

    if (projectDoc) {
      notifyIntegrations(projectId, projectDoc.organization, {
        action: 'pin.created',
        actorName: req.user.name,
        projectName: projectDoc.name,
        pinNumber,
        pinId: pin._id.toString(),
        projectId,
        pageUrl,
        context: populated.context,
      });
    }
  }

  metric('pin.created', { screenshot: req.file ? 'yes' : 'later' });
  res.status(201).json({ pin: populated });
});

exports.getPins = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { pageUrl, deviceMode, status, assignee, priority, label } = req.query;

  const filter = { project: projectId };
  if (pageUrl) {
    filter.pageUrl = pageUrlFilter(pageUrl);
  }
  if (deviceMode) {
    filter.deviceMode = String(deviceMode);
  }
  if (status) {
    if (status === 'open' || status === 'pending') {
      filter.status = { $in: ['open', 'pending'] };
    } else {
      filter.status = String(status);
    }
  }
  if (assignee) {
    if (assignee !== 'unassigned' && !mongoose.isValidObjectId(assignee)) {
      return res.status(400).json({ message: 'Invalid assignee' });
    }
    filter.assignee = assignee === 'unassigned' ? null : assignee;
  }
  if (priority) {
    filter.priority = String(priority);
  }
  if (label) {
    filter.labels = String(label);
  }

  const pins = await Pin.find(filter)
    .populate('createdBy', 'name email')
    .populate('assignee', 'name email')
    .sort({ position: 1, createdAt: -1 });

  // Get comment counts, first comment, and latest comment for each pin
  const pinIds = pins.map((p) => p._id);
  const commentAgg = await Comment.aggregate([
    { $match: { pin: { $in: pinIds } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$pin',
        count: { $sum: 1 },
        firstBody: { $first: '$body' },
        firstAuthor: { $first: '$author' },
        firstCreatedAt: { $first: '$createdAt' },
        latestBody: { $last: '$body' },
        latestAuthor: { $last: '$author' },
        latestCreatedAt: { $last: '$createdAt' },
        allMentions: { $push: '$mentions' },
        allBodies: { $push: '$body' },
        allAuthors: { $push: '$author' },
      },
    },
  ]);

  // Populate comment authors (both first and latest)
  const authorIds = [
    ...commentAgg.map((c) => c.firstAuthor),
    ...commentAgg.map((c) => c.latestAuthor),
  ].filter(Boolean);
  const authors = await require('../models/User').find(
    { _id: { $in: [...new Set(authorIds.map((id) => id.toString()))] } },
    'name email'
  );
  const authorMap = {};
  authors.forEach((a) => { authorMap[a._id.toString()] = a; });

  const commentMap = {};
  commentAgg.forEach((c) => {
    const directMentions = (c.allMentions || []).flat().filter(Boolean).map((id) => id.toString());
    const bodyMentions = (c.allBodies || []).flatMap((b) => extractMentionedUserIds(b));
    const mentionedUserIds = [...new Set([...directMentions, ...bodyMentions])];
    const commentAuthorIds = (c.allAuthors || []).filter(Boolean).map((id) => id.toString());

    commentMap[c._id.toString()] = {
      count: c.count,
      mentionedUserIds,
      commentAuthorIds,
      firstComment: c.firstBody ? {
        body: c.firstBody,
        author: authorMap[c.firstAuthor?.toString()] || null,
        createdAt: c.firstCreatedAt,
      } : null,
      latestComment: c.latestBody ? {
        body: c.latestBody,
        author: authorMap[c.latestAuthor?.toString()] || null,
        createdAt: c.latestCreatedAt,
      } : null,
    };
  });

  const pinsWithCounts = pins.map((pin) => {
    const info = commentMap[pin._id.toString()] || {};
    const createdById = pin.createdBy?._id?.toString() || pin.createdBy?.toString();
    const authorUserIds = [...new Set([createdById, ...(info.commentAuthorIds || [])].filter(Boolean))];

    return {
      ...pin.toObject(),
      commentsCount: info.count || 0,
      mentionedUserIds: info.mentionedUserIds || [],
      authorUserIds,
      firstComment: info.firstComment || null,
      latestComment: info.latestComment || null,
    };
  });

  res.json({ pins: pinsWithCounts });
});

exports.updatePin = asyncHandler(async (req, res) => {
  const { pinId } = req.params;
  const { status, assignee, priority, dueAt, labels, position } = req.body;

  // Scoped to the project already authorized by projectAccess
  const pin = await Pin.findOne({ _id: pinId, project: req.project._id });
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  // Pins created before the task statuses still say 'pending' (= open)
  const prevStatus = pin.status === 'pending' ? 'open' : pin.status;
  const prevAssignee = pin.assignee ? String(pin.assignee) : null;

  if (status) {
    const norm = status === 'pending' ? 'open' : status;
    if (!['open', 'in_progress', 'in_review', 'resolved'].includes(norm)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    pin.status = norm;
  }

  if (assignee !== undefined) {
    if (!assignee) {
      pin.assignee = null;
    } else {
      if (!mongoose.isValidObjectId(assignee)) {
        return res.status(400).json({ message: 'Invalid assignee' });
      }
      // The assignee must be able to work on the pin: same org, comment access or more
      const User = require('../models/User');
      const targetUser = await User.findById(assignee).select('organization role');
      if (!targetUser || String(targetUser.organization) !== String(req.organization._id)) {
        return res.status(400).json({ message: 'Assignee must belong to your organization.' });
      }
      const level = await projectLevelFor(targetUser, req.project);
      if (!level || !atLeast(level, 'comment')) {
        return res.status(400).json({ message: 'Assignee needs comment access to this project.' });
      }
      pin.assignee = assignee;
    }
  }

  if (priority !== undefined && priority !== null && priority !== '') {
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }
    pin.priority = priority;
  }

  if (dueAt !== undefined) {
    const due = dueAt ? new Date(dueAt) : null;
    if (due && Number.isNaN(due.getTime())) {
      return res.status(400).json({ message: 'Invalid due date' });
    }
    pin.dueAt = due;
  }

  if (Array.isArray(labels)) {
    pin.labels = labels.map((l) => String(l).trim().slice(0, 40)).filter(Boolean).slice(0, 10);
  }

  if (position != null && Number.isFinite(Number(position))) {
    pin.position = Number(position);
  }

  await pin.save();

  const populated = await Pin.findById(pin._id)
    .populate('createdBy', 'name email')
    .populate('assignee', 'name email');

  // Real-time notification
  const io = req.app.get('io');
  emitToProject(io, pin.project.toString(), 'pin:updated', { pin: populated });

  const projectIdStr = pin.project.toString();
  const pinMeta = { pinNumber: pin.pinNumber, pageUrl: pin.pageUrl, projectName: req.project.name };

  // The new assignee hears about it (createSingleNotification skips self-assignment)
  if (pin.assignee && String(pin.assignee._id || pin.assignee) !== prevAssignee) {
    createSingleNotification({
      io,
      recipientId: String(pin.assignee._id || pin.assignee),
      actor: req.user,
      projectId: projectIdStr,
      pin: populated,
      type: 'pin_assigned',
      title: `${req.user.name} assigned pin #${pin.pinNumber} to you`,
      metadata: pinMeta,
    }).catch(() => {});
  }

  const statusChanged = !!status && pin.status !== prevStatus;
  const STATUS_LABELS = { open: 'Open', in_progress: 'In progress', in_review: 'In review', resolved: 'Resolved' };

  if (statusChanged) {
    const action = pin.status === 'resolved' ? 'pin.resolved' : (prevStatus === 'resolved' ? 'pin.reopened' : 'pin.status_changed');
    logActivity(projectIdStr, req.user._id, action, { pinNumber: pin.pinNumber, status: pin.status });

    if (pin.status === 'in_review') {
      // Ready for review: tell the person who reported it
      if (pin.createdBy) {
        createSingleNotification({
          io,
          recipientId: String(pin.createdBy._id || pin.createdBy),
          actor: req.user,
          projectId: projectIdStr,
          pin: populated,
          type: 'pin_in_review',
          title: `${req.user.name} moved pin #${pin.pinNumber} to review`,
          metadata: { ...pinMeta, status: pin.status },
        }).catch(() => {});
      }
    } else {
      createProjectNotifications({
        io,
        projectId: projectIdStr,
        actor: req.user,
        type: pin.status === 'resolved' ? 'pin_resolved' : (prevStatus === 'resolved' ? 'pin_reopened' : 'pin_status_changed'),
        pin: populated,
        metadata: { pinNumber: pin.pinNumber, pageUrl: pin.pageUrl, status: pin.status, statusLabel: STATUS_LABELS[pin.status] },
      }).catch(() => {});
    }
  }

  // Email + integrations keep their resolve / reopen meaning; moves between the
  // working statuses (open, in progress, in review) stay in the app
  const resolvedChanged = statusChanged && (pin.status === 'resolved' || prevStatus === 'resolved');
  if (resolvedChanged) {
    const project = await Project.findById(pin.project).select('name organization');
    if (project) {
      notifyIntegrations(pin.project.toString(), project.organization, {
        action: pin.status === 'resolved' ? 'pin.resolved' : 'pin.reopened',
        actorName: req.user.name,
        projectName: project.name,
        pinNumber: pin.pinNumber,
        pinId: pin._id.toString(),
        projectId: pin.project.toString(),
      });
    }
    if (project) {
      emailProjectMembers('status', {
        projectId: pin.project.toString(),
        actorUserId: req.user._id,
        actorName: req.user.name,
        projectName: project.name,
        pin: populated,
      });
    }
  }

  res.json({ pin: populated });
});

exports.attachScreenshot = asyncHandler(async (req, res) => {
  const { pinId } = req.params;
  if (!req.file) {
    return res.status(400).json({ message: 'No screenshot file' });
  }

  // Scoped to the project already authorized by projectAccess
  const pin = await Pin.findOne({ _id: pinId, project: req.project._id });
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  pin.screenshot = {
    filename: req.file.filename,
    path: `uploads/${req.file.filename}`,
    size: req.file.size,
  };
  await pin.save();

  const populated = await Pin.findById(pin._id).populate('createdBy', 'name email');

  // Real-time notification for late screenshot attachment
  const io = req.app.get('io');
  if (io) emitToProject(io, req.project._id.toString(), 'pin:updated', { pin: populated });

  res.json({ pin: populated });
});

exports.deletePin = asyncHandler(async (req, res) => {
  const { pinId } = req.params;

  // Scoped to the project already authorized by projectAccess
  const pin = await Pin.findOne({ _id: pinId, project: req.project._id });
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  const projectId = pin.project.toString();

  // Activity log
  logActivity(projectId, req.user._id, 'pin.deleted', { pinNumber: pin.pinNumber });

  // Comments, screenshot and attachment files go with the pin
  await deletePinCascade(pin, req.project.organization);

  // Real-time notification
  const io = req.app.get('io');
  emitToProject(io, projectId, 'pin:deleted', { pinId });

  res.json({ message: 'Pin deleted' });
});

/**
 * PATCH /api/projects/:projectId/pins/reorder
 * Batch update positions when cards are moved on the Kanban board.
 */
exports.reorderPins = asyncHandler(async (req, res) => {
  const { moves } = req.body; // array of { pinId, status, position }
  if (!Array.isArray(moves) || moves.length > 500) {
    return res.status(400).json({ message: 'moves must be an array of at most 500 entries' });
  }

  // Skip entries without a valid pin id or anything to change (an empty $set is refused by MongoDB)
  const validMoves = [];
  const bulkOps = [];
  for (const m of moves) {
    if (!m || !mongoose.isValidObjectId(m.pinId)) continue;
    const update = {};
    if (m.position != null && Number.isFinite(Number(m.position))) update.position = Number(m.position);
    if (m.status && ['open', 'in_progress', 'in_review', 'resolved'].includes(m.status)) {
      update.status = m.status;
    }
    if (!Object.keys(update).length) continue;
    validMoves.push({ pinId: String(m.pinId), ...update });
    bulkOps.push({
      updateOne: {
        filter: { _id: m.pinId, project: req.project._id },
        update: { $set: update },
      },
    });
  }

  if (bulkOps.length > 0) {
    await Pin.bulkWrite(bulkOps);
  }

  const io = req.app.get('io');
  if (io) {
    emitToProject(io, req.project._id.toString(), 'pins:reordered', { moves: validMoves });
  }

  res.json({ success: true, count: bulkOps.length });
});

/**
 * GET /api/my-tasks
 * Aggregates all open pins assigned to the current user across all accessible projects.
 */
exports.getMyTasks = asyncHandler(async (req, res) => {
  // Only active projects the user can still open (same rule as the project list)
  const isOrgAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  const visible = isOrgAdmin ? { organization: req.user.organization } : await visibleProjectsQuery(req.user);
  const projects = await Project.find({ ...visible, status: 'active' })
    .select('_id name websiteUrl projectType').lean();

  const projectIds = projects.map((p) => p._id);
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));

  const now = new Date();
  const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };
  const pins = (await Pin.find({
    project: { $in: projectIds },
    assignee: req.user._id,
    status: { $ne: 'resolved' },
  })
    .populate('createdBy', 'name')
    .lean())
    // Earliest due date first (no due date last), then priority, then newest
    .sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity)
      || (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2)
      || new Date(b.createdAt) - new Date(a.createdAt));

  const overdue = [];
  const dueSoon = [];
  const other = [];

  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);

  for (const p of pins) {
    p.projectInfo = projectMap.get(String(p.project)) || null;
    // The dashboard widget links and labels tasks with project._id / project.name
    p.project = p.projectInfo || p.project;
    // dueAt is the due calendar day at UTC midnight: overdue once that whole day is over
    if (p.dueAt && new Date(p.dueAt).getTime() + 86400000 <= now.getTime()) {
      overdue.push(p);
    } else if (p.dueAt && new Date(p.dueAt) <= sevenDaysFromNow) {
      dueSoon.push(p);
    } else {
      other.push(p);
    }
  }

  res.json({
    total: pins.length,
    overdue,
    dueSoon,
    other,
  });
});
