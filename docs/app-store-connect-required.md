# App Store Connect 上架信息整理（SubRadar Max）

> 复制到 [App Store Connect](https://appstoreconnect.apple.com) → 你的 App → **App Store** → 版本信息。  
> **带 `【请替换】` 的链接/署名必须改成你自己的**，否则审核可能被拒或用户无法联系你。

---

## 一、与工程一致的硬信息（核对用）

| 项 | 值 |
|----|-----|
| App 名称（显示名） | SubRadar Max |
| Bundle ID | `com.jokeyon.subradar` |
| SKU | 与创建 App 时一致即可（仅内部用） |
| 当前营销版本 | 1.0.0（与 `app.config.js` 中 `version` 一致） |
| 自动续期订阅 ID | `subradarpro`（仅当 `EXPO_PUBLIC_IAP_ENABLED=1` 打包时启用；与 `lib/constants.ts` 一致） |
| 功能档位 | **默认构建（未启用 IAP）**：不限条数 + 导出全开放。启用 IAP 后可恢复「免费 3 条 / Pro」逻辑（见 `README`）。 |

---

## 二、必填 URL（【请替换】）

苹果常要求 **有效可打开** 的页面（不能只写 `example.com`）。

| 字段 | 建议 | 说明 |
|------|------|------|
| **技术支持网址** | 【请替换】如 `https://你的域名/subradar/support` | 可放常见问题、联系邮箱 |
| **隐私政策网址** | 【请替换】如 `https://你的域名/subradar/privacy` | 即使数据主要在本地，也建议有一页说明收集/存储方式 |
| **营销网址**（可选） | 【请替换】或留空 | 有官网再填 |

可先用 **GitHub Pages / Notion 公开页** 挂极简版「支持 + 隐私」过渡。

---

## 三、简体中文（若上架中国区或提供中文元数据）

### 副标题（≤30 字，含标点）

```
订阅与续费提醒，数据在本地
```

### 推广文本（≤170 字，可随时改，无需发新版）

```
在一处管理订阅与周期扣款，本地提醒、按币种汇总、导出列表。数据默认仅存本机；可选自建 API 云同步。支持简体中文与 English。
```

### 描述（可删减，≤4000 字）

```
SubRadar Max 帮你把「下次什么时候扣款」记清楚。

• 订阅与续费记录：名称、金额、币种、扣款周期、下次付款日
• 付款提醒：在扣款前通过本地通知提醒（可选当天 / 提前 1、3、7 天），减少忘记取消试用或疏忽扣款
• 支出概览：按币种查看估算的月支出与年支出
• 本地通知：提醒仅在本机调度，注重隐私
• 可选云同步：使用你自建的 SubRadar API 在设备间备份/同步（可选）
• 导出：将续费列表导出为纯文本分享
• 语言：简体中文与 English，可在设置中切换

当前版本包含不限条数记录与导出，无需应用内购买。

数据默认保存在本机，无需注册账号。云同步为可选功能，仅连接你自行配置的服务器。

使用问题请通过 App 内设置中的反馈入口或支持页面联系我们。
```

### 关键词（≤100 字符，**英文逗号分隔、一般不加空格**）

```
订阅,续费,提醒,记账,周期扣款,流媒体,本地,通知
```

---

## 四、英文（美区 / 全球常用）

### Subtitle (≤30 characters)

```
Track renewals & bill reminders
```

### Promotional text (≤170 characters)

```
Manage subscriptions & renewals in one place. Local reminders, spending overview, export. Optional self-hosted sync. Privacy-first. English & 简体中文.
```

### Description

```
SubRadar Max helps you manage all your subscriptions and recurring payments in one place.

Key Features:
• Subscription tracking: Add subscriptions with name, amount, currency, billing cycle, and next payment date
• Payment reminders: Get notified before upcoming payments (same day, or 1, 3, or 7 days in advance) so you can cancel free trials or review charges in time
• Spending overview: See your estimated monthly and yearly subscription expenses by currency
• Local notifications: All reminders are scheduled on your device for privacy
• Optional cloud sync: Sync across devices with your own self-hosted SubRadar API
• Export data: Export your subscription list as plain text
• Multi-language: Chinese and English

This release includes unlimited subscriptions and export with no in-app purchase required.

SubRadar Max keeps your recurring payment information in one place, helping you budget better and avoid unexpected charges.

Privacy first: Your data is stored locally on your device. Cloud sync is optional and only uses a server you configure.

For help, use the in-app feedback option in Settings or your support page.
```

### Keywords (≤100 characters, comma-separated)

```
subscription,renewal,billing,reminder,tracker,local,notify,finance
```

---

## 五、审核备注（App Review Information → Notes）

**复制下面整段（可按需改邮箱/网址）：**

```
Thank you for reviewing SubRadar Max.

Test account: not required — no login; data is stored locally.

This build does not include In-App Purchases. All features (unlimited renewal entries and export) are available without purchase.

If you later receive a build with IAP enabled (EXPO_PUBLIC_IAP_ENABLED), there will be an auto-renewable subscription with product ID: subradarpro — use Sandbox to test purchase/restore.

Notifications: optional — local renewal reminders only, if the user allows notifications in iOS Settings.

Export: shares a plain-text list via the system share sheet.

Support: 【请替换为你的支持页或邮箱】
```

---

## 六、此版本更新说明（What’s New / 1.0.0）

**中文：**

```
首个正式版本：本地记录续费与订阅、扣款前提醒、按币种支出概览、导出与可选云同步；中英文界面。当前版本全功能开放，无需内购。
```

**English:**

```
Initial release: track renewals and recurring charges locally, reminders before payments, spending overview by currency, export, and optional self-hosted sync. English & 简体中文. All features included in this release; no in-app purchase required.
```

---

## 七、App 隐私（数据收集问卷）— 须你本人对照勾选

以下按 **当前代码理解** 整理，**最终以你实际行为与苹果定义为准**；不确定时点开 ASC 每项说明再选。

| 数据类型 | 常见选法（本 App） | 说明 |
|----------|-------------------|------|
| 联系信息 | 通常 **不收集** | 无账号体系 |
| 财务信息 | **不通过 App 上传到贵司服务器** 时，多选 **不收集**；若苹果将「用户自填金额」算作用户内容，按向导勾选 **不与用户身份关联** / **仅设备本地**（以页面选项为准） |
| 用户内容 | 续费名称、备注等 **仅存本机** | 一般选 **不收集** 或按「设备端、不用于追踪」类选项 |
| 使用数据 / 诊断 | **无自有分析 SDK** 时多为 **不收集** | 若未来接入统计需重填 |
| 购买历史 | **通过 StoreKit / Apple** 处理 | 按问卷「购买」类说明勾选 |

**定位数据：** 不使用地图则一般 **不收集**。

完成后与 **隐私政策网址** 内容保持一致。

---

## 八、出口合规（加密）

- 工程已设 `ITSAppUsesNonExemptEncryption: false`（标准 HTTPS 等豁免情形）。  
- ASC 若再问 **出口合规**，选 **否** 或 **仅使用豁免加密**（与苹果当时选项文字一致即可）。

---

## 九、分级（年龄）

- 无社交、无赌博、无成人内容 → 一般 **4+**；以问卷答案为准。

---

## 十、截图（需你本机截取）

ASC 会列出 **必填设备尺寸**（如 6.7"）。请用 **对应机型模拟器或真机** 截 **竖屏** 图，建议画面：

1. 概览（续费列表）  
2. 汇总  
3. 设置（可体现语言 / Pro）  
4. 新增续费表单（一页即可）  

**Windows 无法截 iOS 真机 UI**，需 Mac 模拟器或已装 TestFlight 的 iPhone。

---

## 十一、定价与可用范围

- **价格**：在 ASC **价格与销售范围** 中选档位。  
- **订阅**：在「订阅」中为 `monthly` / `yearly` 配好 **价格、本地化名称、审核信息**，并与本版本 **一同送审**（若苹果要求）。

---

## 十二、提交前自检清单

- [ ] 技术支持 URL、隐私政策 URL 已替换且 **浏览器能打开**  
- [ ] 已选 **本次要上架的构建**（含正确图标）  
- [ ] 截图已上传 **必填尺寸**  
- [ ] App 隐私问卷已保存且与隐私页一致  
- [ ] 订阅商品状态为 **准备提交**（如适用）  
- [ ] 版权行：如 `© 2026 【你的姓名或公司】`  
- [ ] 点击 **提交以供审核**

---

*文档随工程维护；`version` / `buildNumber` 以 `app.config.js` 为准。*
