# 运维与恢复

## 部署约束

应用按单容器、单 Node.js 进程运行。SQLite 数据库和媒体目录必须挂载到同一个 VPS 的本地持久卷。若未来需要多实例或多机部署，应先把数据库迁移到 PostgreSQL，不能让多个容器通过网络文件系统共享 SQLite。

每次连接会启用 `foreign_keys=ON`、WAL、5 秒 busy timeout。生产环境只执行 `drizzle/` 中已经评审并提交的 SQL migration，不执行 `drizzle-kit push`。

## 发布流程

1. 运行 `./ops/backup.sh` 创建部署前快照，并确认已复制到宿主机备份目录。
2. 构建新镜像并检查 `docker compose config --quiet`。
3. 启动新容器；入口脚本先执行 migration，失败时不会启动 Web 服务。
4. 请求 `/api/health`，再检查首页、登录和一次内容读取。
5. 若 migration 或启动失败，停止新容器并恢复部署前快照。

破坏性 schema 变化应拆成“新增字段/回填数据/删除旧字段”多个版本发布，避免直接依赖 SQLite 不完整的 ALTER TABLE 能力。

## 备份

推荐直接使用经过路径、权限和结构校验的一键脚本：

```bash
./ops/backup.sh
./ops/list-backups.sh
```

确需手工复制容器内备份时，先创建仅当前宿主用户可访问的目录，并在复制后再次收紧权限：

```bash
docker compose exec -T app pnpm db:backup
install -d -m 700 /srv/scilab-backups
docker compose cp app:/backups/. /srv/scilab-backups/
chmod -R u=rwX,go= /srv/scilab-backups
```

`/backups` 使用独立的 `scilab_backups` 命名卷，不能直接从宿主目录读取，因此异地同步前先复制到仅 root 可读的宿主目录。可将以上命令写入 cron 或 systemd timer 每日执行。备份完成后使用 restic：

```bash
restic -r s3:https://object.example.com/scilab backup /srv/scilab-backups
restic -r s3:https://object.example.com/scilab forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
```

密钥应由宿主机 secret 管理，不能写入仓库或 Compose 文件。

## 恢复演练

1. 在隔离目录解压备份，不覆盖生产卷。
2. 使用 `sqlite3 restored.db 'PRAGMA integrity_check;'`，结果必须为 `ok`。
3. 用临时 Compose 项目挂载恢复目录并启动应用。
4. 检查站点设置、成员、论文、新闻以及随机媒体文件。
5. 记录恢复耗时和问题；确认成功后删除临时环境。

## 管理员恢复

无法登录时，通过 SSH 进入应用容器运行：

```bash
read -rsp "请输入新的管理员密码：" ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | docker compose exec -T app pnpm admin:reset-password -- --password-stdin
unset ADMIN_PASSWORD
```

重置密码会撤销已有会话。系统不提供公开找回密码入口。
