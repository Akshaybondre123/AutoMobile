// Helper to derive org/showroom ids from request context
export function getShowroomIdFromReq(req) {
  // Priority: body -> query -> authenticated user -> null
  if (!req) return null;
  if (req.body && req.body.showroom_id) return req.body.showroom_id;
  if (req.query && req.query.showroom_id) return req.query.showroom_id;
  if (req.user && req.user.showroom_id) return req.user.showroom_id;
  return null;
}

export function getOrgIdFromReq(req) {
  if (!req) return null;
  if (req.body && req.body.org_id) return req.body.org_id;
  if (req.query && req.query.org_id) return req.query.org_id;
  if (req.user && req.user.org_id) return req.user.org_id;
  return null;
}

export default {
  getShowroomIdFromReq,
  getOrgIdFromReq,
};
