# SciLab Web：科研实验室主页与管理系统

一个开源、中文优先的科研实验室公开门户与单管理员 CMS。它把官网、内容后台、认证、SQLite、媒体管理和备份恢复放在一个可独立部署的 Node.js 应用中，适合课题组、研究中心和小型实验室长期维护。

- 许可证：MIT
- 运行时：Node.js 24 / Next.js 16 / React 19 / TypeScript
- 数据库：SQLite + Drizzle ORM
- 部署：单机 Docker/VPS，单应用实例
- 文档：[文档中心](docs/index.md) · [小白运维](ops/README.md) · [贡献指南](CONTRIBUTING.md) · [安全策略](SECURITY.md)

## 功能

### 公开站

- 首页 Hero、实验室简介、精选研究方向/项目/成员、最新成果和动态；空模块自动隐藏。
- 实验室介绍、团队成员、研究方向、科研项目、论文成果、新闻动态、加入我们与联系页面。
- 论文按年份、成果类型和研究方向筛选，支持 DOI、外链和 PDF。
- 中文 Unicode slug、动态 metadata、canonical、Open Graph、robots 和 sitemap。
- 暖白/墨蓝/青绿现代学术视觉，桌面与移动端响应式，键盘和焦点状态可用。

### 管理后台

- 唯一管理员账号，无公开注册、访客账号或邮箱找回。
- 站点设置、固定页面、成员、研究方向、项目、成果、新闻和媒体库。
- 草稿/发布、精选、排序、搜索、关联管理和审计记录。
- Tiptap 白名单富文本；禁止原始 HTML、iframe、脚本、Base64 图片和危险链接。
- 图片校验后重编码为 WebP；PDF 强制下载；已引用媒体禁止删除。

### 运维与安全

- Better Auth 数据库会话、登录限流、Origin/CSRF 防护和服务端逐入口鉴权。
- 草稿和未引用媒体不对匿名访客开放；媒体使用 ETag、流式读取和发布引用判定。
- SQLite migration、WAL、外键、在线一致性备份和媒体 SHA-256 校验。
- Docker Compose、健康检查、Caddy 示例，以及一键启动/停止/重启/备份/恢复脚本。
- Vitest、Playwright、crafted RSC 防泄漏回归、GitHub Actions CI。

## 最简单的 Docker 启动方式

安装 Docker Engine + Compose v2 后：

```bash
./ops/start.sh
./ops/status.sh
```

首次启动会自动生成权限为 `600` 的 `.env` 和随机认证密钥，不会创建默认管理员。公网部署前，把 `.env` 中两个 URL 改成真实 HTTPS 域名，再运行一次 `./ops/start.sh`。

创建唯一管理员：

```bash
read -rsp "请输入管理员密码：" ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | docker compose exec -T app pnpm admin:create -- --email admin@example.com --name 管理员 --password-stdin
unset ADMIN_PASSWORD
```

访问公开站 `http://localhost:3000`，后台入口为 `http://localhost:3000/admin/login`。启动、停止、备份和恢复的完整中文说明见 [ops/README.md](ops/README.md)。

## 本地开发

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

开发数据库默认位于 `./data/scilab.db`，上传目录为 `./data/uploads`。`db:seed` 只初始化站点设置，不创建账号或公开内容；显式设置 `SEED_DEMO=true` 才会写入带 `[示例]` 标记的开发数据。

本地创建管理员：

```bash
read -rsp "请输入管理员密码：" ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | pnpm admin:create -- --email admin@example.com --name 管理员 --password-stdin
unset ADMIN_PASSWORD
```

密码至少 14 个字符。重置密码使用相同的 `--password-stdin` 方式运行 `pnpm admin:reset-password`，并会撤销已有会话。

## 常用命令

| 命令                           | 作用                             |
| ------------------------------ | -------------------------------- |
| `pnpm dev`                     | 启动开发服务器                   |
| `pnpm build && pnpm start`     | standalone 生产构建与本机启动    |
| `pnpm db:generate`             | 根据 schema 生成 SQL migration   |
| `pnpm db:migrate`              | 执行已提交 migration             |
| `pnpm db:seed`                 | 初始化单例站点设置               |
| `pnpm db:backup`               | 一致性备份数据库和上传目录       |
| `pnpm lint` / `pnpm typecheck` | 静态检查                         |
| `pnpm test`                    | 单元与 SQLite 集成测试           |
| `pnpm test:e2e`                | 桌面/移动端 Playwright 测试      |
| `pnpm test:docker`             | Compose migration 与持久卷 smoke |
| `pnpm verify`                  | 格式、Lint、类型、测试与生产构建 |

`pnpm start` 会按生产优先级读取项目根目录的 `.env.production.local`、`.env.local`、`.env.production` 和 `.env`，并把相对数据库、上传与备份路径解析到项目根目录；shell 中已经导出的变量优先。

## 架构与部署边界

公开站、管理后台、认证和数据库访问运行在同一个 Next.js Node 进程中。生产数据位于 `scilab_data` 卷，备份位于独立 `scilab_backups` 卷。

SQLite 必须放在 VPS 本地持久盘，并且同一数据库只能由一个应用实例写入。不要使用 NFS/SMB，不要水平扩容 app，也不要部署到普通 Serverless/Edge 平台。需要多实例时，应先迁移到 PostgreSQL 和独立对象存储。

详细设计见 [架构说明](docs/architecture.md)，生产步骤见 [部署指南](docs/deployment.md)。

## 文档

- [内容管理指南](docs/content-management.md)：后台发布、关联、富文本和媒体操作。
- [配置参考](docs/configuration.md)：环境变量、密钥、域名和运维参数。
- [小白运维脚本](ops/README.md)：一键启动、停止、重启、备份和恢复。
- [Docker/VPS 部署](docs/deployment.md)：域名、TLS、升级和回滚。
- [运维与恢复](docs/operations.md)：备份策略、restic 和恢复演练。
- [开发指南](docs/development.md)：目录、脚本、迁移、规范和测试。
- [测试与发布检查](docs/testing.md)：质量门槛、分层测试和发布验收。
- [架构说明](docs/architecture.md)：数据模型、认证、缓存和安全边界。
- [贡献指南](CONTRIBUTING.md) 与 [安全策略](SECURITY.md)。

## 验证

```bash
pnpm verify
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
docker compose config --quiet
docker compose build
docker compose up -d --wait
curl -fsS http://localhost:3000/api/health
pnpm test:docker
```

CI 运行同样的质量、浏览器和镜像构建检查。真实部署还应每月完成一次备份恢复演练。

## 参与开源

欢迎提交 Issue 和 Pull Request。安全问题请勿公开复现，按照 [SECURITY.md](SECURITY.md) 使用私密报告渠道。项目采用 [MIT License](LICENSE)。
