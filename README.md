# SciLab Web

A research-lab portal and content-management system. It provides public laboratory introduction, news, member, project, paper, and research pages, along with an administrator area for managing content, media, and site settings.

## Feature Scope

- Public site: about, contact, join, news, members, projects, papers, and research content.
- Content management for pages, news, members, projects, papers, research, and media.
- Administrator authentication and account management.
- Rich-text editing, image processing, and HTML sanitization.
- SQLite migrations, backup, and recovery helper scripts.
- Docker, operations, and testing documentation.

## Technology Stack

- Next.js 16, React 19, and TypeScript.
- Better Auth.
- Drizzle ORM + SQLite.
- TipTap, Sharp, and sanitize-html.
- pnpm 11.13, Node.js 24.x.

## Quick Start

In a Linux, macOS, or WSL environment, prepare local development in this order:

    cp .env.example .env.local
    pnpm install --frozen-lockfile
    pnpm db:migrate
    pnpm db:seed
    pnpm dev

The default seed initializes only the settings needed by the site; it does not create an administrator account or fictional content. See the corresponding documentation under `docs/` and `ops/` for administrator creation, password resets, content management, Docker deployment, and backup/recovery.

## Common Commands

    pnpm build
    pnpm start
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm test:e2e
    pnpm verify
    pnpm db:backup

## Deployment and Operations

Before deployment:

- Generate a strong random authentication secret and keep it in environment configuration;
- Protect the SQLite database, uploaded media, and backup files;
- Use a secure non-interactive method when creating administrator credentials;
- Perform backup and recovery drills following `docs/operations.md`;
- Run `pnpm verify` before release.

## License

This repository is released under the MIT License. Uploaded content, images, and third-party material may have separate copyrights.