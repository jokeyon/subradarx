Place these PNG files here before production builds (Expo / EAS will fail validation without real icons):

  icon.png           — 1024×1024 (iOS)
  splash-screen.png  — 1284×2778 portrait; #FFEDD5 full bleed + centered app icon (generated — run `npm run splash:compose` after changing icon.png)
  splash-icon.png    — legacy / spare; splash uses splash-screen.png (app.config.js)
  adaptive-icon.png  — 1024×1024 (Android adaptive foreground)

You can copy assets from a fresh `npx create-expo-app` project, or export from Figma.

Quick 1×1 placeholder (PowerShell, from repo root):

  $b=[Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
  [IO.File]::WriteAllBytes('subradar-expo/assets/icon.png',$b)
  Copy-Item subradar-expo/assets/icon.png subradar-expo/assets/splash-icon.png
  Copy-Item subradar-expo/assets/icon.png subradar-expo/assets/adaptive-icon.png

Replace with real artwork before App Store / Play Store submission.
