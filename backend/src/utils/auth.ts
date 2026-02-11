import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authCookieMaxAgeMs, authCookieName, config, isProduction } from "../config.js";

const jwtIssuer = "pulseboard";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (
  candidate: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(candidate, hashedPassword);
};

export const signUserToken = (userId: string): string => {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: "7d",
    issuer: jwtIssuer
  });
};

export const verifyUserToken = (token: string): string => {
  const payload = jwt.verify(token, config.jwtSecret, {
    issuer: jwtIssuer
  }) as jwt.JwtPayload;

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token subject");
  }

  return payload.sub;
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
