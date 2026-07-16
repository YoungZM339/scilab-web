# 配置参考

## 配置文件

- 本地开发使用 `.env.local`；可从 `.env.example` 复制。
- Docker Compose 和 `ops/*.sh` 使用项目根目录的 `.env`。
- `.env`、数据库、上传文件和备份都已加入 `.gitignore`，不得提交到仓库。
- 修改域名、端口或密钥后，运行 `./ops/start.sh` 让容器读取新配置。
- 本机 `pnpm start` 会按生产优先级读取根目录环境文件，并把相对持久化路径解析到项目根；已导出的 shell 变量优先。

## 核心运行变量

| 变量                    | 必填     | 默认值/容器值                                   | 说明                                                                                                           |
| ----------------------- | -------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`    | 生产必填 | 无                                              | 至少 32 字符的随机认证密钥；首次运行 `ops/start.sh` 会安全生成。                                               |
| `BETTER_AUTH_URL`       | 生产必填 | `http://localhost:3000`                         | Better Auth 的完整外部 URL，包含协议，不带路径。                                                               |
| `SITE_URL`              | 推荐必填 | `http://localhost:3000`                         | canonical、Open Graph、robots 和 sitemap 使用的公开站点 Origin。它在容器启动时读取，不需要为更换域名重建镜像。 |
| `AUTH_TRUSTED_ORIGINS`  | 否       | 空                                              | 额外允许的精确 Origin，逗号分隔；不支持通配符。只在确有额外可信入口时设置。                                    |
| `DATABASE_PATH`         | 否       | 本地 `./data/scilab.db`；容器 `/data/scilab.db` | SQLite 文件。生产必须位于本机持久卷，不能放在 NFS/SMB。                                                        |
| `UPLOAD_DIR`            | 否       | 本地 `./data/uploads`；容器 `/data/uploads`     | 图片和 PDF 的持久化目录。                                                                                      |
| `BACKUP_DIR`            | 否       | 本地 `./backups`；容器 `/backups`               | 应用内一致性备份的输出目录。                                                                                   |
| `BACKUP_RETENTION_DAYS` | 否       | `30`                                            | `pnpm db:backup` 清理超过该天数的应用内备份；小于 1 时不自动清理。                                             |
| `APP_PORT`              | 否       | `3000`                                          | Compose 在宿主机 `127.0.0.1` 暴露的端口，由同机反向代理访问。                                                  |

公网部署时，`BETTER_AUTH_URL` 与 `SITE_URL` 通常应相同，例如：

```dotenv
BETTER_AUTH_SECRET=使用密码管理器生成的高熵随机值
BETTER_AUTH_URL=https://lab.example.edu
SITE_URL=https://lab.example.edu
APP_PORT=3000
```

反向代理必须把原始 `Host`、`Origin` 和转发协议传给应用。不要通过关闭 Origin/CSRF 检查来规避代理配置问题。

Compose 默认只监听宿主机回环地址，公网请求必须经过 Caddy/Nginx 和 HTTPS。若反向代理运行在另一个容器中，应改用共享 Docker 网络并移除宿主端口映射，不要把原始 HTTP 管理端口暴露到公网。

## 运维脚本变量

| 变量                                  | 默认值         | 说明                                                         |
| ------------------------------------- | -------------- | ------------------------------------------------------------ |
| `SCILAB_BACKUP_DIR`                   | `ops/backups/` | 备份复制到宿主机后的目录；建议生产设置为专用绝对路径。       |
| `SCILAB_HEALTH_TIMEOUT`               | `180`          | 启动、重启或恢复时等待健康检查的秒数，允许 10–1800。         |
| `SCILAB_DATA_UID` / `SCILAB_DATA_GID` | `1001`         | 恢复时写回数据卷的 UID/GID。只有自定义镜像运行用户时才修改。 |

这些值既可临时导出，也可写进 `.env`。备份目录不能是 `/`、项目根目录或包含 `..` 的路径。

## 开发、seed 与管理员 CLI

| 变量                         | 用途                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `SEED_DEMO=true`             | 仅在开发环境写入带 `[示例]` 标记的演示内容。                                          |
| `SITE_NAME`                  | 覆盖 seed 初始化的站点名称。                                                          |
| `ADMIN_EMAIL` / `ADMIN_NAME` | 管理员 CLI 的非敏感参数替代方式。                                                     |
| `ADMIN_PASSWORD`             | 管理员 CLI 的密码替代方式；更推荐 `--password-stdin`，避免进入 shell 历史或进程列表。 |

应用不会创建默认管理员，也不会在源码、镜像或 seed 中保存默认密码。

## 密钥与域名变更

- 轮换 `BETTER_AUTH_SECRET` 会使旧认证 Cookie 失效，应安排维护窗口并通知管理员重新登录。
- 修改管理员密码会由 CLI 或后台主动撤销现有数据库会话。
- 域名变化时同时修改 `BETTER_AUTH_URL`、`SITE_URL` 和反向代理配置，再验证登录、canonical、`/robots.txt` 与 `/sitemap.xml`。
- 任何生产配置变化都应先备份，再运行健康检查和一次管理员登录回归。
