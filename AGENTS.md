# AI / 协作者提示

在修改 **续费条目（`Renewal`）、本地通知、`nextChargeDate` / `reminderDays`、存储或日期运算** 相关代码前，请先打开并对照：

**[`docs/RENEWAL-REMINDER-LIFECYCLE.md`](docs/RENEWAL-REMINDER-LIFECYCLE.md)**

避免只改单文件而破坏「保存 → 持久化 →（日历滚进）→ 排程通知」的完整链路。发版前真机项见 [`docs/QA-RELEASE-CHECKLIST.md`](docs/QA-RELEASE-CHECKLIST.md)。
