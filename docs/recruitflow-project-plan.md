# RecruitFlow AI 项目搭建计划

## 项目定位

RecruitFlow AI 基于 Reqcore 开源 ATS 二次开发，目标是在现有职位、候选人、申请记录、简历解析、Pipeline 和 Dashboard 能力之上，增加一层面向 HR 日常招聘协作的 AI 招聘运营模块。

核心链路：

```text
简历进入 -> AI解析与JD匹配 -> 生成推荐语 -> HR确认
  -> 推送面试官群 -> 反馈解析 -> 状态更新 -> 文档同步 -> 数据看板
```

## 当前阶段

当前仓库已导入 Reqcore 上游代码，开发分支为 `recruitflow-mvp`。

第一阶段只做项目骨架和接口契约：

- 确认 Reqcore 可运行；
- 增加 RecruitFlow 环境变量占位；
- 增加 AI 输出 Schema；
- 增加 Prompt 模板；
- 增加招聘状态机映射；
- 增加第一阶段初始化脚本；
- 暂不宣称已完成业务源码改造。

## MVP 保留范围

- Reqcore Jobs：岗位和 JD；
- Reqcore Candidates：候选人主数据；
- Reqcore Applications：候选人与岗位关系及阶段；
- Reqcore Documents：简历上传、存储与解析；
- Reqcore Pipeline：状态流转展示；
- Reqcore Dashboard：招聘数据看板入口；
- Reqcore AI Provider：模型配置和结构化输出底座；
- Reqcore Organization / Permission：多租户和权限控制。

## MVP 新增模块

```text
app/pages/dashboard/ai-intake.vue
app/pages/dashboard/feedback-inbox.vue
server/api/recruitflow/intake/parse.post.ts
server/api/recruitflow/intake/confirm.post.ts
server/api/recruitflow/feedback/parse.post.ts
server/api/recruitflow/feedback/confirm.post.ts
server/api/recruitflow/events/index.get.ts
server/api/recruitflow/metrics.get.ts
server/utils/recruitflow/*
```

## 暂缓或隐藏功能

- Public job board；
- Pricing / Billing；
- Source tracking；
- Chatbot；
- Career page；
- SSO；
- 多语言运营入口；
- Stripe 支付配置。

第一阶段以“隐藏入口、保留代码”为主，不做大规模删除，避免引入迁移和构建风险。

## 下一步实施顺序

1. 跑通依赖安装和本地服务；
2. 新增数据库表 `recruitment_event` 和 `integration_log`；
3. 新增 AI 候选人录入页面；
4. 新增简历解析 + 推荐语 parse API；
5. 新增 HR confirm API，创建 Candidate/Application/Event；
6. 新增企业微信 Mock 推送；
7. 新增腾讯文档 Mock CSV 同步；
8. 新增反馈收件箱和反馈解析；
9. 新增 RecruitFlow metrics。

## 模块 05：Dashboard Polish

- 顶部导航默认收敛为 RecruitFlow MVP 主线：AI Intake、Feedback Inbox、Candidates、Jobs、Pipeline、Dashboard、Settings。
- Billing、Career Page、Source Tracking、Chatbot、SSO、多语言运营等 Reqcore 原入口不删除，默认通过 `reqcore-legacy-navigation` feature flag 隐藏，减少后续合并冲突。
- 新增 `server/api/recruitflow/metrics.get.ts`，当前从 Reqcore 核心表 `job`、`candidate`、`application`、`activity_log` 读取漏斗、岗位人数、超时待办和近 7 天动态。
- `recruitment_event` 表合并后，优先替换 metrics API 中 recent activity 查询，保持前端响应结构稳定。
- 3 分钟答辩脚本见 `docs/demo-script.md`。

