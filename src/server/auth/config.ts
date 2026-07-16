import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getTrustedOrigins } from "@/server/config/site-url";

import { db } from "../db/client";
import { account, session, user, verification } from "../db/schema";

export interface CreateAuthOptions {
  /** Only the trusted local administrator CLI may enable sign-up. */
  allowSignUp?: boolean;
}

export function createAuth(options: CreateAuthOptions = {}) {
  const isProduction = process.env.NODE_ENV === "production";
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    (!isProduction || isProductionBuild ? "http://localhost:3000" : undefined);
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    (!isProduction || isProductionBuild
      ? "scilab-local-build-secret-change-before-production"
      : undefined);

  return betterAuth({
    appName: "科研实验室管理系统",
    baseURL,
    basePath: "/api/auth",
    secret,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification },
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      autoSignIn: false,
      minPasswordLength: 14,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
    },
    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    trustedOrigins: getTrustedOrigins(),
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
      storage: "memory",
    },
    advanced: {
      useSecureCookies: isProduction,
      cookiePrefix: "scilab",
      disableCSRFCheck: false,
      disableOriginCheck: false,
    },
    // Must remain last so Server Actions can propagate Better Auth cookies.
    plugins: [nextCookies()],
  });
}

export const auth = createAuth();
