# 快速开始：发布你的实验室主页

本指南面向第一次使用 SciLab Web 的管理员。完成后，你会得到一个可登录、可编辑并能备份的实验室网站。公网正式上线前仍需阅读[部署指南](deployment.md)。

## 1. 启动网站

准备一台安装了 Docker Engine 与 Docker Compose v2 的 Linux 主机，在项目根目录运行：

```bash
./ops/start.sh
./ops/status.sh
```

首次执行会生成 `.env` 和随机认证密钥。此时可通过 `http://localhost:3000` 查看网站；后台地址是 `http://localhost:3000/admin/login`。

## 2. 创建管理员

系统不提供默认账号。使用自己的邮箱和强密码创建唯一管理员：

```bash
read -rsp "请输入管理员密码：" ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | docker compose exec -T app pnpm admin:create -- \
  --email admin@example.com --name 管理员 --password-stdin
unset ADMIN_PASSWORD
```

密码至少 14 个字符。不要把密码写入命令、脚本、Issue 或聊天记录。

## 3. 完成基础信息

登录后台后，建议按以下顺序操作：

1. **网站信息**：填写实验室名称、简介、联系方式和页脚。
2. **主页管理**：设置主标题、副标题和主视觉图片。
3. **介绍页面**：补充实验室介绍、加入我们和联系信息。
4. **图片与文件**：先上传常用图片和公开 PDF，再在内容中选择。

保存后打开公开网站检查。基础信息不会自动替你补全，请不要保留示例文案。

## 4. 发布第一批内容

优先添加 1–3 条研究方向、团队成员、成果和实验室动态。编辑时注意：

- 只有选择“已发布”的内容对访客可见；
- 需要出现在主页的研究方向和成果还要选择“重点展示”；
- 摘要适合列表和主页，正文适合详情页；
- 图片应填写准确的替代文字；
- 发布后使用未登录窗口检查链接与附件。

完整规则见[内容管理指南](content-management.md)。

## 5. 配置域名并上线

编辑 `.env`，把两个地址替换为相同的最终 HTTPS 域名：

```dotenv
BETTER_AUTH_URL=https://lab.example.edu
SITE_URL=https://lab.example.edu
```

配置 Caddy 或 Nginx 后再次运行 `./ops/start.sh`。应用默认只在主机的 `127.0.0.1:3000` 监听，请保留这一安全设置，让公网请求统一经过 HTTPS 反向代理。

## 6. 立即验证备份

网站正式投入使用前执行：

```bash
./ops/backup.sh
./ops/list-backups.sh
```

本机备份不能替代异地备份。将备份目录加密同步到另一台设备或对象存储，并按[运维与恢复](operations.md)完成一次恢复演练。

## 接下来

- 日常编辑：[内容管理指南](content-management.md)
- 域名、HTTPS 与升级：[部署指南](deployment.md)
- 环境变量：[配置参考](configuration.md)
- 启停、备份与恢复：[小白运维脚本](../ops/README.md)
- 出现异常：[故障排查](troubleshooting.md)
