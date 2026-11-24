// Real-time helpers shared by controllers (rooms are set up in server.js:
// `project:<id>` for everyone with access, plus `project:<id>:team` or
// `project:<id>:guests` by org role, and `user:<id>` per user).

// Pin events: the team gets the whole pin; org guests get it without the
// technical details (console errors, failed requests, environment), as on
// the REST API (pin.controller getPins) and on share links.
function emitPin(io, projectId, event, pin) {
  if (!io || !pin) return;
  const full = typeof pin.toJSON === 'function' ? pin.toJSON() : pin;
  const { context, ...forGuests } = full;
  io.to(`project:${projectId}:team`).emit(event, { pin: full });
  io.to(`project:${projectId}:guests`).emit(event, { pin: forGuests });
}

// Access is checked when a socket joins a project room. After someone's access
// changes (removed from a project or workspace, role changed, account deleted),
// close their sockets: the apps reconnect and re-join only the projects they
// can still open.
function reconnectUsers(io, userIds) {
  if (!io) return;
  for (const id of new Set((userIds || []).map((u) => String(u?._id || u)).filter(Boolean))) {
    try { io.in(`user:${id}`).disconnectSockets(true); } catch { /* best effort */ }
  }
}

// Someone was taken off one project: if they can no longer open it (no org,
// workspace or project grant left), take their sockets out of its rooms.
async function leaveProjectIfNoAccess(io, user, project) {
  if (!io || !user || !project) return;
  try {
    const { resolveAccessAsync } = require('../middleware/projectAccess');
    if ((await resolveAccessAsync(user, project)).allowed) return;
  } catch { /* fall through: removing is the safe side */ }
  const pid = String(project._id);
  try {
    io.in(`user:${String(user._id)}`).socketsLeave([`project:${pid}`, `project:${pid}:team`, `project:${pid}:guests`]);
  } catch { /* best effort */ }
}

module.exports = { emitPin, reconnectUsers, leaveProjectIfNoAccess };
