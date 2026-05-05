# 续费项与本地提醒 — 端到端链路

本文档给 **开发 / 验收 / AI 改代码时对照**：改动 `Renewal`、存储、`expo-notifications`、日期运算任一处时，应能在下面找到 **依赖关系与边界条件**，避免只修单点而破坏整条链路。

---

## 1. 核心数据与含义

| 字段 | 含义 | 注意 |
|------|------|------|
| `nextChargeDate` | **下一次**预计扣款日（`yyyy-MM-dd`，**本机日历日**） | 与「提醒响了没」无自动联动；需 **日历滚进** 或用户点 **「已续费」** |
| `reminderDays` | 提前几天提醒（`0`=扣款日当天 9:00 起算的那套逻辑） | **新建默认 `3`**（见 `app/subscription/new.tsx`），若用户不改且扣款日是「今天」，名义提醒日会落在 **三天前** → 可能被整条跳过 |
| `billingCycle` | 周 / 月 / 年 | 决定 `advanceNextCharge` 与滚进步长 |
| `createdAt`（可选） | 首次创建时间 ISO 字符串 | 老数据可能没有；仅展示用 |

---

## 2. 时间线：从保存到响铃

1. **`addRenewal` / `updateRenewal` / `deleteRenewal`**（`SubRadarContext`）→ `persist` → `saveRenewals` → **`rescheduleRenewalNotifications(items)`**。
2. **`rescheduleRenewalNotifications`**（`lib/notifications.ts`）：先取消所有 `renewal:*` 再按条重排。
3. **触发时刻**（`nextSchedulableReminderFire` + `reminderFireDate`，`lib/renewalMath.ts`）：
   - 默认：**提醒日 09:00 本地时间**（提醒日 = 扣款日往前 `reminderDays` 天）。
   - **同日扣款 + `reminderDays===0`**：名义仍可为当天 9:00；若已错过 9:00 仍处「提醒日」内，有 **catch-up**（约 10 秒内 / 不晚于当日结束）。
   - **同日扣款 + 同日提醒 + 保存时刻**：另见 **`notificationSameDayAnchor`**：首次排程为 **保存后约 1 小时**，锚点记入 AsyncStorage，避免每次冷启动都把「一小时」往后推。
4. **冷启动 / 前台**：`SubRadarContext` 在 `refresh` 载入列表后执行 **`rollRenewalIfChargeDayPassed`**：若 `nextChargeDate` **早于今天**（按日比较），按周期 **滚进到 `>=` 今天**，有变化则 **写回存储** 并依赖现有 `useEffect` 重排通知。App **回到前台** 时再跑一遍相同滚进逻辑（防跨午夜仍停在后台）。

---

## 3. 用户可操作路径（与自动逻辑的关系）

| 动作 | 行为 |
|------|------|
| 编辑保存 | 覆盖字段；`createdAt` 应保留（若存在） |
| **「已续费」**（详情页） | 仅把 `nextChargeDate` **前进一个周期**；不切 `createdAt` |
| 收到提醒 / 未打开 App | **不会**自动改 `nextChargeDate`（本地通知无默认「已读回写」） |
| 扣款日已过、次日打开 App | **滚进** 可能把 `nextChargeDate` 推进到当前或未来（见 §2） |

---

## 4. 代码地图（改哪里要连带想哪里）

| 区域 | 文件 |
|------|------|
| 列表 / 概览展示日期 | `app/(tabs)/hub/*`, `components/hub/RenewalsTab.tsx` |
| 新建 / 编辑默认提醒 | `app/subscription/new.tsx`, `app/subscription/[id].tsx` |
| 持久化 | `lib/storage.ts`，`Renewal` 类型 `lib/types.ts` |
| 滚进与 9:00 / catch-up | `lib/renewalMath.ts` |
| 排程与同日 1h 锚点 | `lib/notifications.ts`, `lib/notificationSameDayAnchor.ts` |
| 载入后滚进 + 前台 | `contexts/SubRadarContext.tsx`（`applyLoadedRenewalsWithRoll`, `AppState`） |
| 语言变更后通知文案 | `contexts/I18nContext.tsx` → `rescheduleRenewalNotifications` |

---

## 5. 常见思维盲区（改功能前自查）

- [ ] **默认 `reminderDays=3`** + **扣款日=今天** → 名义提醒在三天前 → 旧逻辑会直接 **不排程**；是否应用「当天 / 1h」等特殊规则要看 `notifications.ts` 与锚点。
- [ ] **仅 `fire <= now` 就 `continue`** 会丢掉 **当天稍后仍有效的提醒**；需区分「提醒日已过」与「同一天内错过 9:00」。
- [ ] **提醒与存储分离**：用户看到「弹了通知」≠ `nextChargeDate` 已变；若要「提醒后列表就是下一期」必须定义是 **按日历日滚进** 还是 **点通知 / 点已续费**，并在一条链路里实现。
- [ ] **EAS Update 的 JS** 与 **已装包的原生/SDK 版本** 不一致时，OTA 可能 **不生效或行为异常**；大版本升级后要以 **新原生包** 为真理。
- [ ] **Share Extension** 与主 App 配置可能不同；改 `expo-notifications` 插件时要注意扩展是否排除依赖。

---

## 6. 后续可增强（未做或部分未做）

- 点击通知 → 打开详情并可 **一键「已续费」**（需在 `expo-notifications` 的 response 回调里接 `renewal:id`）。
- 新建/编辑时若 **扣款日太近** 导致 `reminderDays` 名义日已过 → UI **降级提示** 或自动建议改成「当天」。
- 将 §5 固化为自动化测试（纯函数测 `rollRenewalIfChargeDayPassed` / `nextSchedulableReminderFire`）。

---

维护建议：任何 PR 若触及 §4 中文件，在描述里 **勾一条 §5** 说明你核对过哪几条，或贴「无行为变更」理由。
