import pkg from "../package.json"

/**
 * Versão da aplicação — fonte única: package.json (bumpar a cada release,
 * junto com a tag git: npm version X.Y.Z --no-git-tag-version).
 */
export const APP_VERSION = pkg.version

/** SHA curto do commit do build (injetado pelo Vercel) ou "local" em dev. */
export const BUILD_SHA = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)

/** Ambiente do build: "production" (staging do ShareO), "preview" ou "local". */
export const BUILD_ENV = process.env.VERCEL_ENV || "local"
