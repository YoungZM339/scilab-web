# 小白运维脚本

这一目录提供日常启动、停止、备份和恢复命令。脚本只管理当前项目的 Compose 服务以及 `/data`、`/backups` 持久卷，不会删除 Docker 命名卷，也不会生成默认管理员密码。

## 使用前准备

1. 安装 Docker Engine + Docker Compose v2，或安装 Docker Desktop。
2. 在项目根目录执行一次：

   ```bash
   chmod +x ops/*.sh
   ```

3. 后续命令可以从任意目录运行，例如：

   ```bash
   ./ops/start.sh
   ```

脚本会检查 Docker 是否运行、Compose 配置是否有效，以及 `.env` 中是否有足够长的 `BETTER_AUTH_SECRET`。第一次运行 `start.sh` 且项目根目录没有 `.env` 时，会自动生成权限为 `600` 的 `.env` 和 96 位随机十六进制密钥；密钥不会打印到终端。

启动、停止、重启、备份和恢复之间使用同一把进程锁，避免两个破坏性操作同时修改容器或数据。脚本异常退出后会识别并安全清理只含自身 PID 文件的旧锁；无法识别的锁不会被自动删除。

> 公网部署前，务必把 `.env` 中的 `BETTER_AUTH_URL` 和 `SITE_URL` 改成真实的 `https://` 域名，然后重新运行 `start.sh`。旧配置中的 `NEXT_PUBLIC_SITE_URL` 暂时兼容，但建议迁移到运行时生效的 `SITE_URL`。

## 常用命令

### 启动或首次部署

```bash
./ops/start.sh
```

脚本会构建镜像、启动应用，并等待 Docker 健康检查。已有运行中的 healthy 服务时，它先完成镜像构建，再短暂停止旧应用并创建不会执行入口脚本或迁移的离线备份，从而避免“备份完成后仍有新写入”的数据丢失窗口。停止的服务也使用离线备份。即使容器曾被删除，脚本仍会先检查持久卷；发现历史数据时，必须备份成功才会继续部署。

如果现有服务 unhealthy、数据库无法通过一致性检查，`start.sh` 会拒绝部署，避免新版本继续修改未知状态的数据。此时请先按下方灾难恢复流程处理。

### 查看状态

```bash
./ops/status.sh
```

### 停止

```bash
./ops/stop.sh
```

这里只停止容器，不删除数据库、上传文件或 Docker 卷。

### 重启

```bash
./ops/restart.sh
```

重启不会重新构建镜像。代码或依赖有变化时请运行 `start.sh`。

## 备份

```bash
./ops/backup.sh
./ops/list-backups.sh
```

备份分两步完成：

1. 在运行中的容器内调用项目的 SQLite 在线备份程序，同时校验数据库与媒体文件；
2. 把通过校验的数据库、`uploads/` 和 `manifest.json` 复制到宿主机。

默认宿主目录是 `ops/backups/`。可在执行命令前设置绝对路径，或把同名配置写入 `.env`：

```bash
export SCILAB_BACKUP_DIR=/srv/scilab-backups
./ops/backup.sh
```

配置路径不能包含 `..`，也不能指向 `/` 或项目根目录。备份目录保存管理员密码哈希和会话信息，脚本会把文件权限收紧；仍应定期用 restic 等工具加密复制到另一台机器或对象存储。

建议通过宿主机 cron 每日执行一次，例如：

```cron
15 3 * * * cd /srv/scilab-web && ./ops/backup.sh >> /var/log/scilab-backup.log 2>&1
```

请先手工运行一次，确认 cron 用户有 Docker 权限且备份目录可写。

## 恢复

先查看备份，再在交互终端运行：

```bash
./ops/list-backups.sh
./ops/restore.sh
```

也可以指定列表中的完整名称：

```bash
./ops/restore.sh 2026-07-15T18-07-54-406Z
```

即使指定名称，恢复仍要求两次人工确认，不能静默跳过。应用 healthy 时，常规恢复流程会：

1. 验证备份必须是备份根目录的直接子目录，拒绝 `..`、符号链接、额外顶层文件和不完整结构；
2. 在修改前再创建一份一致性安全备份；
3. 停止应用，把备份放到 `/data` 下随机命名的隔离目录；
4. 将旧数据库和上传目录移动到独立回滚点，再替换为选定备份；
5. 修正 UID/GID 1001 的权限，重新启动并等待健康检查；
6. 只有健康检查成功后才删除卷内回滚点。

应用已停止、unhealthy，或只剩持久卷时，脚本会自动进入灾难恢复模式。它不会要求损坏的应用先恢复健康，而会：

1. 双重确认后停止并严格核对全部相关容器确实不再运行；
2. 尝试创建一份不执行迁移的离线一致性备份，失败也不会覆盖原始文件；
3. 将原始 DB/WAL/SHM/uploads 移入 `/data/.ops-rollback-<任务编号>`；
4. 校验并恢复选定备份，启动后等待健康检查；
5. 即使恢复成功，也保留原始卷内回滚点，供取证或人工导出。

灾难恢复成功后，先把终端打印的回滚点复制到受限目录并完成异地留存，再考虑清理。以下命令中的 `TASK_ID` 必须替换成终端显示的完整任务编号：

```bash
install -d -m 700 ./ops/recovered-original
docker compose cp app:/data/.ops-rollback-TASK_ID/. ./ops/recovered-original/TASK_ID/
chmod -R u=rwX,go= ./ops/recovered-original
```

确认导出可读且已备份后，可清理卷内副本：

```bash
docker compose run --rm --no-deps --user 0:0 --entrypoint /bin/sh app \
  -c 'rm -rf -- /data/.ops-rollback-TASK_ID'
```

若新版本迁移后无法启动，需要同时回退代码：先切回已知良好版本并运行 `docker compose build app`（构建不会执行迁移），再运行 `./ops/restore.sh <部署前备份名>`。恢复脚本会使用刚构建的镜像验证备份，随后以旧版本启动。

恢复期间 `/data` 需要临时容纳“当前数据 + 待恢复数据”，请先确认磁盘剩余空间至少大于所选备份的大小。

如果复制、迁移或健康检查失败，脚本会尽可能放回原数据并重新启动。若自动回滚本身失败，脚本会保持应用停止，打印需要保留的 `.ops-restore-*` / `.ops-rollback-*` 目录和操作前安全备份位置；此时不要手工删除这些目录。

## 管理员账号

脚本不会创建或硬编码管理员密码。应用健康启动后，可按项目主文档使用 `docker compose exec` 创建或重置唯一管理员。

## 常见问题

- `无法连接 Docker`：启动 Docker Desktop，或把当前用户加入有权限访问 Docker 的用户组。
- `BETTER_AUTH_SECRET` 格式错误：运行 `openssl rand -hex 48`，把输出的随机十六进制值写入 `.env`。
- `unhealthy`：运行 `./ops/status.sh` 查看最近日志。
- 备份目录无权限：先创建目录，并让运行脚本的宿主用户可写；容器内 `/data` 权限由脚本单独处理。
