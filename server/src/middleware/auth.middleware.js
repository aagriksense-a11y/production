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