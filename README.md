# SciLab Web

> A production-oriented research-lab website and content platform built with Next.js, React, TypeScript, SQLite, and a complete administration workflow.

SciLab Web provides a public-facing laboratory website and an integrated content-management system for maintaining news, members, projects, papers, research directions, media, and site configuration. It is designed for research groups that need a modern website without separating the editorial interface from the application codebase.

## What it includes

### Public website

- Laboratory introduction, contact, and recruitment pages.
- News and announcements.
- Member profiles and research teams.
- Projects, papers, and research-direction pages.
- Responsive media and structured content presentation.

### Administration

- Secure administrator authentication and account management.
- CRUD workflows for pages, news, members, projects, papers, and research content.
- Rich-text editing with HTML sanitization.
- Image upload and processing.
- Site settings and content ordering.
- Database migrations, backup helpers, and recovery documentation.

## Technology stack

| Layer | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Authentication | Better Auth |
| Database | SQLite with Drizzle ORM |
| Editor | TipTap |
| Media | Sharp |
| Content safety | `sanitize-html` |
| Tooling | pnpm 11.13, Node.js 24.x |

## Quick start

Use Linux, macOS, or WSL for the documented development workflow.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The seed command initializes only the site settings required to start the application. It does **not** create an administrator account or populate fictional laboratory content.

Follow the documentation under `docs/` and `ops/` to create the first administrator securely.

## Common commands

```bash
pnpm dev         # Start local development
pnpm build       # Create a production build
pnpm start       # Run the production server
pnpm lint        # Run lint checks
pnpm typecheck   # Run TypeScript checks
pnpm test        # Run automated tests
pnpm test:e2e    # Run end-to-end tests
pnpm verify      # Run the release verification suite
pnpm db:backup   # Create a database backup
```

## Content model

The application organizes a laboratory's public presence around a small number of maintainable content domains:

```text
Site settings
├── Pages
├── News
├── Members
├── Projects
├── Papers
├── Research
└── Media
```

This structure keeps public navigation and administrative workflows aligned. Extend the schema only after considering migration, ordering, permissions, search, and backward compatibility.

## Deployment checklist

Before deploying:

- generate a strong authentication secret and keep it outside version control;
- create administrator credentials through a secure, non-interactive process;
- protect the SQLite database, uploaded media, and backup files;
- configure HTTPS and a reverse proxy appropriate for the environment;
- restrict filesystem permissions for application and backup data;
- verify image-processing limits and accepted content types;
- run `pnpm verify`;
- perform a backup-and-restore drill using `docs/operations.md`.

SQLite is appropriate for a single-instance site with controlled write concurrency. Reassess the database architecture before multi-instance deployment or sustained high editorial traffic.

## Security model

Administrative authorization must be enforced server-side. Rich text and uploaded media are untrusted input even when submitted by authenticated users. Keep sanitization, file validation, access control, auditability, and backup retention in scope whenever the content model changes.

Do not commit `.env.local`, database files, administrator credentials, uploaded private material, or production backups.

## Documentation

Operational and editorial documentation is maintained inside the repository. Consult `docs/` and `ops/` for administrator setup, password recovery, content-management procedures, Docker deployment, and backup/recovery instructions.

## License

SciLab Web is released under the MIT License. Uploaded content, images, publication files, and other third-party material may have separate copyright or licensing terms.