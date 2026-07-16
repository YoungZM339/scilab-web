# 测试与发布检查

## 本地质量门槛

合并前至少运行：

```bash
pnpm verify
pnpm exec drizzle-kit check
pnpm test:e2e
pnpm test:docker
```

`pnpm verify` 依次执行 Prettier、ESLint、TypeScript、Vitest 和生产构建。任何警告都会使检查失败。

## 测试分层

- 单元测试：slug、输入校验、富文本白名单、文件限制和 Origin 防护。
- SQLite 集成测试：migration、PRAGMA、唯一约束、关联级联、草稿媒体隔离和引用删除保护。
- Playwright：公开页面、成果筛选、404、移动导航、管理员认证、后台数据泄漏回归及媒体权限。
- Docker smoke：构建镜像、执行 migration、等待健康检查，并确认容器重启后数据库和上传卷仍存在。

首次运行 Playwright 需要安装 Chromium：

```bash
pnpm exec playwright install --with-deps chromium
```

测试必须使用专用数据库与上传目录，不能指向真实生产 `/data`。失败产物位于 `playwright-report/` 和 `test-results/`，两者都不会提交到版本库。

## 发布前检查

1. 从空数据库执行所有已提交 migration，并运行 `pnpm exec drizzle-kit check`。
2. 完成 `pnpm verify` 和完整 Playwright 测试。
3. 通过 Docker/Compose smoke，确认 `/api/health`、首页和管理员登录。
4. 用运行时 `SITE_URL` 检查 canonical、`robots.txt` 与 sitemap 没有构建机域名。
5. 上传一张图片和一个 PDF，重启容器后重新读取。
6. 创建一致性备份，并在隔离环境完成一次恢复演练。
7. 检查镜像、日志、测试夹具与 Git 历史中没有 `.env`、数据库、备份或真实个人数据。

GitHub Actions 会执行静态检查、测试、构建和容器检查。真实生产发布仍需在目标架构和实际反向代理下完成 TLS、持久卷、备份与恢复验收。
