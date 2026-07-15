# RecruitFlow AI 3分钟答辩演示脚本

## 0:00 - 0:30 项目定位

打开 Dashboard，说明 RecruitFlow AI 是基于 Reqcore ATS 的二次开发：保留职位、候选人、申请、Pipeline、权限和 AI Provider 底座，在上层补一条更贴近 HR 日常协作的招聘运营链路。

一句话主线：

```text
简历进入 -> AI 解析与 JD 匹配 -> HR 确认 -> 推送面试官 -> 反馈解析 -> 状态更新 -> 看板复盘
```

## 0:30 - 1:05 导航精简

展示顶部导航：AI Intake、Feedback Inbox、Candidates、Jobs、Pipeline、Dashboard、Settings。

强调本次 Demo 隐藏了 Pricing/Billing/Public Job Board/Chatbot/Source Tracking/Career Page/SSO 等 Reqcore 原有入口，避免答辩时偏离招聘主链路。旧入口没有删除，默认由 `reqcore-legacy-navigation` feature flag 控制，便于后续合并和回滚。

## 1:05 - 1:45 AI 候选人录入

进入 AI Intake 页面，说明这是简历进入 RecruitFlow 的第一站。

演示讲法：

- 左侧是简历投递/粘贴区域，本模块只做路由和工作台占位，不调用未合并的 parse API。
- 右侧展示未来确认后的数据落点：Candidate、Document、Application、RecruitFlow event。
- 手动候选人入口仍可回到 Reqcore 原生 Candidate 创建流程，保证 Demo 可走通。

## 1:45 - 2:20 反馈收件箱与 Pipeline

进入 Feedback Inbox 页面，说明面试官反馈会进入队列，由后续 feedback parse/confirm 模块解析意图。

再切到 Pipeline/Applications，说明确认后的动作会更新 Application 状态，例如进入面试、Offer、淘汰或 Hold。本模块不实现核心 confirm，只保留低冲突接入点。

## 2:20 - 2:55 RecruitFlow 看板指标

回到 Dashboard，展示 RecruitFlow command center：

- Recruiting funnel：按 new/screening/interview/offer/hired/rejected 展示漏斗。
- Jobs activity：展示岗位维度候选人活跃人数。
- Overdue follow-up：列出超过 3 天未推进的申请。
- Last 7 days：展示近 7 天候选人、申请、职位新增。

说明 `/api/recruitflow/metrics` 当前从 Reqcore 核心表读取数据；当 `recruitment_event` 表合并后，只需要替换 recent activity 查询，前端响应结构不变。

## 2:55 - 3:00 收束

总结：本模块完成的是 Demo 主线打磨和低冲突接入层，不抢先实现 AI parse/confirm 与反馈 confirm 核心逻辑，为后续模块并行开发和总控合并留出空间。
