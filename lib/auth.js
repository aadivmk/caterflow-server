import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const secret = () => {
  const value = process.env.JWT_SECRET ?? "";
  if (value.length < 16) throw new Error("JWT_SECRET must be at least 16 characters.");
  return new TextEncoder().encode(value);
};

export const hashPassword = (password) => bcrypt.hash(password, 10);
export const checkPassword = (password, hash) => bcrypt.compare(password, hash);

export async function signToken(user) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

/** Returns { id, email, role } for a valid Bearer token, otherwise null. */
export async function getUserFromRequest(req) {
  const header = req.headers["authorization"] ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
