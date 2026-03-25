const ROLE_HIERARCHY = { owner: 0, admin: 1, member: 2, guest: 3 };

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    next();
  };
};

/**
 * Check if the actor's role is high enough to assign the target role.
 * Owner (0) can assign anything. Admin (1) can assign admin, member, guest.
 * Member/Guest cannot assign any role.
 */
const canAssignRole = (actorRole, targetRole) => {
  const actorLevel = ROLE_HIERARCHY[actorRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  if (actorLevel === undefined || targetLevel === undefined) return false;
  return actorLevel <= targetLevel;
};

module.exports = { authorize, canAssignRole, ROLE_HIERARCHY };
