# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的结构；正式版本采用语义化版本号。

## [Unreleased]

暂无未发布变更。

## [1.0.0] - 2026-07-16

### Added

- 中文科研实验室公开门户：首页、介绍、团队、研究方向、项目、成果、动态、招生与联系。
- 单管理员 CMS，支持草稿/发布、排序、精选、关联、富文本、媒体库和审计日志。
- Better Auth 数据库会话、SQLite/Drizzle migration、Docker Compose 与小白运维脚本。
- Vitest、Playwright、CI、备份恢复和完整开源文档。

### Security

- 后台页面在每个数据入口执行服务端鉴权，防止 RSC 并行渲染泄漏。
- 草稿或未引用媒体仅管理员可访问；公开媒体按当前发布引用判定。
- 登录走受限流保护的 Better Auth HTTP 入口；自定义媒体写接口校验 Origin。
