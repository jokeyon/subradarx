# 📋 subradax - Cursor 待办清单

> 生成时间：2026-05-02
> 当前状态：代码已大幅修改但未 Commit，zh.json 缺失翻译，部分配置待确认

---

## 🔴 P0 - 阻塞性修复（必须立即处理）

### 1. 补齐 zh.json 缺失的翻译 Key
**问题：** `en.json` 新增了以下 key，但 `zh.json` 没有对应翻译，运行时会出现 `undefined`
- `nav.emailImport` → `"从邮件导入"`
- `emailImport.*` → 整个 section 需要中文翻译（约 25 个 key）
- `settings.sectionEmailImport` → `"从邮件导入"`
- `settings.emailImportOpen` → `"扫描 Gmail 或粘贴文本…"`
- `form.currencyPickTitle` → `"选择货币"`
- `renewals.addChooseTitle` → `"添加续费"`
- `renewals.addManual` → `"手动输入"`
- `renewals.addSmartImport` → `"粘贴或导入（邮件/短信）"`

**要求：** 对照 `en.json` 逐行补齐，保持 key 顺序一致

### 2. Git Commit 所有改动
**问题：** 目前所有代码都在 untracked 状态，没有任何保护
```bash
git add -A
git commit -m "v7: smart import, share extension, swipe delete, currency picker, dashboard UI"
```
**注意：** 排除 `fix_en_json.py`, `safe_replace.py`, `safe_replace_zh.py` 等临时脚本

---

## 🟡 P1 - 功能验证与修复

### 3. 检查 Gmail OAuth Client ID 配置
**文件：** `lib/constants.ts`, `.env`
**确认项：**
- `GMAIL_IMPORT_ENABLED` 是否为 `true`
- `GMAIL_IOS_CLIENT_ID` 是否已填写（从 Google Cloud Console 获取）
- 如果为空，Gmail 扫描功能应优雅降级（显示提示但不崩溃）

### 4. 验证 Share Extension 的 URL Scheme
**文件：** `ShareExtension.tsx`, `app.config.js`
**风险：** Share Extension 打开宿主 App 的 URL Scheme 可能在 Development Build 中不匹配
**检查：**
- `exp+subradar://` 是否在 Development Build 中注册
- `subradax://` 是否在 `app.config.js` 的 `scheme` 中
- 测试路径：在 Safari 分享文本 → 选择 subradax → 是否能跳转到 `email-import` 页面

### 5. 检查 App Group / Share Extension 原生配置
**文件：** `plugins/withShareExtensionQueriesSchemes.ts`
**确认：**
- Share Extension 需要 App Group 才能与主 App 共享数据
- EAS Build 是否正确打包了 Share Extension target
- 验证 `NSExtensionActivationRule` 是否支持 text 和 url 类型

---

## 🟢 P2 - 优化与体验

### 6. 货币选择器体验优化
**文件：** `components/CurrencyPickerField.tsx`
**建议：**
- 添加常用货币置顶（USD, CNY, EUR, GBP, JPY, HKD, TWD）
- 支持搜索过滤（输入 "CNY" 或 "人民币" 快速定位）
- 当前货币应显示勾选标记

### 7. 智能导入解析器增强
**文件：** `lib/subscriptionEmailParser.ts`
**建议：**
- 添加更多中文关键词（如 "自动扣费", "连续包月", "首月优惠"）
- 支持识别日期格式：`2024年5月1日`, `May 1, 2024`, `01/05/2024`
- 添加置信度显示（high/medium/low），让用户知道解析是否可靠

### 8. 首页仪表盘细节
**文件：** `app/(tabs)/hub/index.tsx`
**建议：**
- 月度总花费卡片添加小图标（如 💰 或 `wallet-outline`）
- 空状态时显示引导文案 + 插画（目前只有文字）
- 列表项左滑删除后添加撤销 Toast（可选）

---

## 🔵 P3 - 构建与发布

### 9. 确认 Build 7 是否包含新功能
**当前：** TestFlight 可能还是旧版（如果 Cursor 只改了本地代码）
**动作：**
- 检查 EAS Build 记录：`https://expo.dev/accounts/jokeyon/projects/subradar/builds`
- 如果 Build 7 未包含新功能，需要重新触发构建：
```bash
cd "C:\Users\ASUS\Documents\1\subradar-expo"
npx eas build --platform ios --profile production --non-interactive --auto-submit
```

### 10. 清理临时文件
**删除：**
- `fix_en_json.py`
- `safe_replace.py`
- `safe_replace_zh.py`
- 任何 `qr_*.png` 二维码文件

### 11. 更新版本号策略
**当前：** `version: "1.0.0"`, `buildNumber: "7"`
**建议：** 如果功能重大变更，考虑升级到 `1.1.0`

---

## 📝 执行顺序建议

1. **先做 P0**（翻译补齐 + Git Commit）→ 防止数据丢失
2. **再做 P1**（Gmail/Share Extension 验证）→ 确保核心功能可用
3. **最后 P2/P3**（优化 + 构建）→ 体验打磨 + 发布

---

**备注：** 
- Share Extension 和 Gmail 扫描是本次最大亮点，务必优先保证稳定性
- 所有原生功能（Share Extension、IAP、推送）在 Expo Go 中无法测试，必须用 Development Build
- 如果时间紧张，可先禁用 Gmail 扫描（`GMAIL_IMPORT_ENABLED=false`），保留粘贴解析和 Share Extension
