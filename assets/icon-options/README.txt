第二轮（功能锚定 + 更宽色谱 / 形态，与 App 文案对齐 — AI）：
  subradarx-v2-01-parse-highlight.png — 短信/邮件正文 → 高亮解析（智能导入、关键字命中）
  subradarx-v2-02-rhythm-dots.png — 周/月/年节奏与「下一期」递进（周期扣款、账单节奏）
  subradarx-v2-03-receipt-countdown.png — 票据/扣款日与倒计时楔（扣款提醒、续费截止感）
  subradarx-v2-04-share-into-app.png — 系统分享进 App → 解析清单（邮件/Safari 分享、确认后入库）

2026-02 batch (subradarx re-design — AI, pick by eye, 上架前对照下方清单):
  subradarx-icon-01-orbit-indigo.png   — 靛蓝底 + 粗轨道白环与小点，续费/雷达
  subradarx-icon-02-stack-warm.png   — 桃米底 + 三色厚圆角横条叠放，订阅堆叠
  subradarx-icon-03-monogram-s.png     — 炭灰底 + 粗体 S 形双丝带，品牌首字母
  subradarx-icon-04-bell-calendar.png  — 淡紫白渐变 + 粗铃铛 + 一角日历页，提醒

--------------------------------------------------------------------------------

New set — four distinct design directions (2026 batch, AI — review against checklist below):
  new-2026-A-renewal-loop.png      — A 周期/循环：粗环形箭头，续费隐喻，青绿 + 暖白底
  new-2026-B-subscription-stack.png — B 层级：三条厚圆角横条叠放，订阅/方案堆叠，赭石 + 桃底
  new-2026-C-ledger-mark.png       — C 账本：竖条 + 三道短横线，票据/记账感，炭灰 + 淡芽绿底
  new-2026-D-pulse-beacon.png      — D 信标：实心圆 + 三道粗弧向外，提醒/信号感，紫 + 奶油黄底

--------------------------------------------------------------------------------

SubRadar icon candidates (1024×1024 PNG). Pick one, then copy it to replace ALL of:
  ../icon.png
  ../adaptive-icon.png
  ../splash-icon.png

Files:
  v1-radar-rings.png      — concentric radar + sweep
  v2-bell-calendar.png    — bell + calendar hint
  v3-subscription-layers.png — stacked “cards” / recurring feel
  v4-orbit-minimal.png   — single orbit, very minimal
  v4b-single-orbit-fresh.png — same idea: one core circle + thin orbit + dot on dark #0F172A (new render)
  v4-orbit-apricot-bg.png — v4 layout (single circle + orbit + dot) on soft 杏色 / apricot background (AI)
  v4-orbit-bg-recolored.png — same as v4-orbit-minimal.png but background recolored in code (keeps subject pixels)

Recolor only the background (keep v4 subject): from repo root
  node scripts/recolor-icon-background.mjs FDE8D4
  (optional 2nd arg: input path, 3rd: output path — see scripts/recolor-icon-background.mjs)

Batch 2025 warm previews (minimal orbit style, AI — pick by eye):
  preview-warm-01-buttercream-coral.png — buttercream bg + coral core
  preview-warm-02-terracotta-cream.png — terracotta bg + cream orbit
  preview-warm-03-peach-rose.png — peach gradient + rose core
  preview-warm-04-honey-gold.png — honey gold gradient + brown core
  preview-warm-05-mauve.png — warm mauve + violet core

Warm palette backgrounds (different from dark blue app theme):
  warm-v1-cream-peach.png   — cream / pale peach gradient, terracotta motif
  warm-v2-coral-apricot.png — coral / apricot orange background
  warm-v3-amber-honey.png   — amber / honey gold tones
  warm-v4-rose.png          — warm pink / rose background
  warm-coral-concentric-rings.png — coral / apricot gradient + concentric radar rings

PowerShell example (after you choose v2):
  Copy-Item icon-options\v2-bell-calendar.png ..\icon.png -Force
  Copy-Item icon-options\v2-bell-calendar.png ..\adaptive-icon.png -Force
  Copy-Item icon-options\v2-bell-calendar.png ..\splash-icon.png -Force

================================================================================
App 图标设计：基本原则与自检清单（上架前对照）
================================================================================

【平台硬性】
  • iOS 商店：1024×1024 PNG，勿用透明底；勿自画圆角/投影（系统会切）。
  • 主体放在约中间 80% 区域内，四角缩小后易被裁切感更强。
  • Android 自适应：前景关键图形放在约中间 66% 安全区；背景与前景分层。
  • 参考：Apple HIG App Icons — https://developer.apple.com/design/human-interface-guidelines/app-icons
          Android Adaptive Icons — https://developer.android.com/develop/ui/views/launch/icon-design-adaptive

【十条自检】
  1. 识别度：桌面约 60pt 仍能看出「是什么」，避免过细线条与碎装饰。
  2. 简洁：尽量一个主视觉（一个符号/字母/几何母题），少即是多。
  3. 对比：主体与背景明度或色相拉开，勿糊成一团。
  4. 渐变/发光：可用但克制，缩小后仍能分清前后景。
  5. 文字：若用字，宜少（常 1～2 字符）、笔画粗，保证小尺寸可读。
  6. 几何优先：粗一点的圆、弧、面比复杂插画更适合小图标。
  7. 一致性：与 App 内主色、气质一致，避免「图标像 A、打开像 B」。
  8. 禁止：勿用系统图标仿冒、勿误导、勿把整屏 UI 截图当图标。
  9. 导出：方图、足够分辨率；终稿建议无透明（尤其 iOS）。
 10. 定稿主体后改色：优先「保留像素级主体、只换背景色」（如 ../scripts/recolor-icon-background.mjs），
     少依赖整张 AI 重画，以免破坏结构。

================================================================================
