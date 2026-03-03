import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authCookieMaxAgeMs, authCookieName, config, isProduction, sessionSalt } from "../config.js";
import type { UserRole } from "../domain/types.js";

const jwtIssuer = "pulseboard";
const jwtSigningSecret = `${config.jwtSecret}:${sessionSalt}`;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (
  candidate: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(candidate, hashedPassword);
};

export interface AuthTokenPayload {
  userId: string;
  sessionVersion: number;
}

export interface AuthenticatedIdentity extends AuthTokenPayload {
  role: UserRole;
}

export const signUserToken = ({ userId, sessionVersion }: AuthTokenPayload): string => {
  return jwt.sign({ sub: userId, sv: sessionVersion }, jwtSigningSecret, {
    expiresIn: "7d",
    issuer: jwtIssuer
  });
};

export const verifyUserToken = (token: string): AuthTokenPayload => {
  const payload = jwt.verify(token, jwtSigningSecret, {
    issuer: jwtIssuer
  }) as jwt.JwtPayload;

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token subject");
  }

  const sessionVersion = payload.sv;
  if (typeof sessionVersion !== "number" || !Number.isInteger(sessionVersion) || sessionVersion < 1) {
    throw new Error("Invalid token session version");
  }

  return {
    userId: payload.sub,
    sessionVersion
  };
};

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge: authCookieMaxAgeMs
};

export const clearAuthCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/"
};

export { authCookieName };
