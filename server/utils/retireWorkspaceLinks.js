// Workspace review links (one link for every project of a workspace) were
// retired: the app no longer offers them and the server no longer serves them.
// Turns off the links that were still on, so the stored settings match.
// Idempotent: once no workspace has an enabled link, the update matches nothing.
const Workspace = require('../models/Workspace');

async function retireWorkspaceLinks() {
  const res = await Workspace.collection.updateMany(
    { 'shareSettings.enabled': true },
    { $set: { 'shareSettings.enabled': false } },
  );
  if (res.modifiedCount) console.log(`[migrate] turned off ${res.modifiedCount} workspace review link(s)`);
  return res.modifiedCount;
}

module.exports = { retireWorkspaceLinks };
