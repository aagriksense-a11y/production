import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(request, reply) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.code(401).send({ success: false, message: "Authentication required" });
  }
  const token = header.slice("Bearer ".length);
  try {
    request.user = verifyAccessToken(request.server, token);
  } catch {
    return reply.code(401).send({ success: false, message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return async function roleGuard(request, reply) {
    if (!request.user) {
      return reply.code(401).send({ success: false, message: "Authentication required" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ success: false, message: "You do not have access to this resource" });
    }
  };
}