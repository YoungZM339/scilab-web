# SciLab Web

科研实验室门户与内容管理系统。项目提供公开的实验室介绍、新闻、成员、项目、论文和研究页面，以及供管理员维护内容、媒体和站点设置的后台。

## 功能范围

- 公开站点：关于、联系、加入、新闻、成员、项目、论文和研究内容。
- 内容管理：页面、新闻、成员、项目、论文、研究和媒体。
- 管理员认证与账号管理。
- 富文本编辑、图片处理和 HTML 清理。
- SQLite 数据库迁移、备份与恢复辅助脚本。
- Docker、运维和测试文档。

## 技术栈

- Next.js 16、React 19、TypeScript。
- Better Auth。
- Drizzle ORM + SQLite。
- TipTap、Sharp、sanitize-html。
- pnpm 11.13，Node.js 24.x。

## 快速开始

在 Linux、macOS 或 WSL 环境中，按以下顺序准备本地开发环境：

    cp .env.example .env.local
    pnpm install --frozen-lockfile
    pnpm db:migrate
    pnpm db:seed
    pnpm dev

默认 seed 只初始化站点所需设置，不创建管理员账号或虚构内容。管理员创建、重置密码、内容维护、Docker 部署和备份恢复请查阅 docs/ 和 ops/ 中的对应文档。

## 常用命令

    pnpm build
    pnpm start
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm test:e2e
    pnpm verify
    pnpm db:backup

## 部署与运维

部署前请完成：

- 生成强随机认证密钥并保存在环境配置中；
- 保护 SQLite 数据库、上传媒体和备份文件；
- 创建管理员时使用安全的非交互式密码输入方式；
- 按 docs/operations.md 进行备份与恢复演练；
- 在发布前运行 pnpm verify。

## 许可证

本仓库以 MIT License 发布。上传内容、图片和第三方素材可能拥有独立版权。