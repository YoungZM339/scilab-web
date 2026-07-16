# 贡献指南

感谢你帮助改进 SciLab Web。项目欢迎缺陷修复、文档、测试、无障碍改进和经过讨论的新功能。

## 开始之前

- 安全漏洞不要提交公开 Issue，请按 [SECURITY.md](SECURITY.md) 私密报告。
- 较大的功能或数据模型变更，请先开 Discussion/Issue 说明使用场景、边界和迁移方案。
- 不要提交真实实验室数据库、上传文件、备份、密钥或管理员账号。

## 本地开发

1. Fork 并克隆仓库。
2. 安装 Node.js 24 与 pnpm 11。
3. 复制 `.env.example` 为 `.env.local`，设置本地随机密钥。
4. 运行：

   ```bash
   pnpm install --frozen-lockfile
   pnpm db:migrate
   pnpm db:seed
   pnpm dev
   ```

完整说明见 [开发指南](docs/development.md)。

## 提交要求

- 从最新主分支创建短生命周期分支，例如 `fix/media-access`。
- 保持变更聚焦；schema 变化必须同时提交 `drizzle/` SQL migration 和测试。
- 新功能应覆盖正常路径、权限失败、非法输入和空状态。
- 用户可见文案、操作步骤或环境变量变化必须同步文档。
- 提交前运行：

  ```bash
  pnpm verify
  pnpm test:e2e
  ```

## Pull Request

PR 描述应说明问题、方案、测试证据、数据迁移和兼容性影响。界面变更建议附桌面与移动端截图。合并前必须通过 CI，且不能降低认证、草稿隔离、媒体访问或 SQLite 单实例约束。

参与项目即表示同意遵守 [社区行为准则](CODE_OF_CONDUCT.md)。
