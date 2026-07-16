# 开发指南

## 环境

- Node.js 24.x
- pnpm 11.13.x（由 `packageManager` 固定）
- Linux、macOS 或 WSL；Windows 推荐使用 WSL

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

开发 seed 默认只创建空站点设置，不创建账号或虚构内容。需要界面示例时显式运行：

```bash
SEED_DEMO=true pnpm db:seed
```

示例内容都带 `[示例]` 标记；不要在生产环境使用 `SEED_DEMO`。

## 管理员

```bash
read -rsp "请输入管理员密码：" ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | pnpm admin:create -- --email admin@example.com --name 管理员 --password-stdin
unset ADMIN_PASSWORD
```

数据库已存在管理员时，创建命令会拒绝执行。重置密码使用 `pnpm admin:reset-password`，成功后撤销现有会话。

## 常用脚本

| 命令                           | 作用                                               |
| ------------------------------ | -------------------------------------------------- |
| `pnpm dev`                     | 启动开发服务器                                     |
| `pnpm build` / `pnpm start`    | 本机生产构建/启动（Docker 使用 standalone server） |
| `pnpm db:generate`             | 根据 schema 生成 migration                         |
| `pnpm db:migrate`              | 执行已提交 migration                               |
| `pnpm db:seed`                 | 初始化单例设置，不创建账号                         |
| `pnpm db:backup`               | SQLite 在线备份并校验媒体                          |
| `pnpm lint` / `pnpm typecheck` | 静态检查                                           |
| `pnpm test`                    | Vitest 单元与 SQLite 集成测试                      |
| `pnpm test:e2e`                | Playwright 桌面/移动端测试                         |
| `pnpm test:docker`             | Compose migration、健康检查和持久卷 smoke          |
| `pnpm verify`                  | 格式、Lint、类型、测试和生产构建                   |

首次运行浏览器测试需要：

```bash
pnpm exec playwright install --with-deps chromium
```

## 数据库变更

1. 修改 `src/server/db/schema.ts`。
2. 运行 `pnpm db:generate`。
3. 人工审阅 `drizzle/*.sql`，确认外键、索引、默认值和数据回填。
4. 用全新数据库和现有数据库副本分别执行 `pnpm db:migrate`。
5. 添加集成测试并更新架构/部署文档。

生产环境禁止 `drizzle-kit push`。破坏性变更拆成“新增—回填—切换—删除”多个版本，并在迁移前备份。

## 编码约定

- TypeScript strict；Server Component 为默认，只有交互组件使用 `"use client"`。
- 数据库和文件系统代码固定 Node runtime，不能放到 Edge。
- 每个后台页面在查询前调用 `requireAdmin()`；layout 重定向不是授权边界。
- 所有写入口验证输入；多表写入使用同步 SQLite 事务，事务回调中不使用 `async`。
- 公开查询必须显式限制发布状态，未知 slug 不能制造无限缓存键。
- 文件路径只使用服务端随机 storage key，禁止拼接用户文件名。

## 测试策略

- 单元测试：slug、富文本、Zod、Origin 与纯函数。
- 集成测试：每例独立临时 SQLite，覆盖 migration、约束、关联、媒体可见性和事务。
- E2E：公开路由、筛选、404、移动菜单、后台重定向和 crafted RSC 防泄漏。
- 发布前：构建 standalone，运行健康检查，并验证重启后数据与上传仍存在。

测试数据和截图不能包含真实个人信息。`data/`、`backups/`、`ops/backups/`、Playwright 输出都已从版本控制排除。
