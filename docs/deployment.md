# Docker/VPS 部署指南

## 推荐拓扑

一台 Linux VPS 运行一个应用容器，Caddy/Nginx 在宿主机终止 TLS。`scilab_data` 保存数据库和上传文件，`scilab_backups` 保存容器内一致性备份。不要启动多个 app 副本。

Compose 默认把应用端口绑定到宿主机 `127.0.0.1`，因此公网流量只能经过同机反向代理，不能绕过 TLS 直接访问管理后台。

## 小白部署

安装 Docker 与 Compose v2 后，在项目根目录运行：

```bash
./ops/start.sh
./ops/status.sh
```

首次启动会生成权限为 `600` 的 `.env` 和随机认证密钥。公网发布前编辑：

```dotenv
BETTER_AUTH_URL=https://lab.example.edu
SITE_URL=https://lab.example.edu
```

重新执行 `./ops/start.sh`。完整启动、停止、备份与恢复说明见 [ops/README.md](../ops/README.md)。

## 手工部署

```bash
cp .env.example .env
chmod 600 .env
# 修改随机密钥、域名和端口
docker compose up -d --build --wait
```

创建管理员：

```bash
read -rsp "请输入管理员密码：" ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | docker compose exec -T app pnpm admin:create -- --email admin@example.com --name 管理员 --password-stdin
unset ADMIN_PASSWORD
```

## 域名与 TLS

`docker/Caddyfile.example` 展示反向代理和请求体限制。生产必须使用 HTTPS；可进一步对 `/admin*` 增加 VPN、身份代理或 IP 白名单。代理需保留 Host、Origin 和转发协议头，不能关闭应用的 Origin/CSRF 检查。

## 升级

```bash
./ops/backup.sh
git pull --ff-only
./ops/start.sh
```

容器入口先执行已提交 migration，失败时 Web 服务不会启动。升级后检查首页、`/api/health`、管理员登录和一条媒体内容。不要在未备份时执行破坏性迁移。

## 回滚与恢复

数据问题使用 `./ops/restore.sh`，脚本会在恢复前再备份并保留卷内回滚点。代码问题可切回旧 tag 并重新运行 `start.sh`；如果旧代码不能读取新 schema，应同时恢复升级前备份。

## 备份与监控

- 每日 `./ops/backup.sh`，并用 restic 加密同步到异地对象存储。
- 每月恢复演练并检查 SQLite `integrity_check` 与随机媒体。
- 监控容器健康状态、磁盘空间、备份失败、认证失败和 5xx 日志。
- `/api/health` 只返回存活、数据库连接和时间，不应暴露配置。

## 不支持的部署

- Vercel/普通 Serverless、Edge runtime；
- 多个容器共享同一 SQLite 文件；
- NFS/SMB 上的 SQLite；
- 未持久化 `/data` 的临时容器。

需要这些能力时，请先迁移数据库和媒体存储，再进行架构评审。
