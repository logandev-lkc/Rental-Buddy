# 🏠 Rental Buddy — 看房不踩雷

> 一個讓你在看房現場不慌張的 Checklist 工具  
> 目標客群：第一次租屋的女生

## 快速開始

```bash
# 進入 Angular 專案
cd rental-buddy-web

# 安裝依賴
npm install

# 本地開發
npm start

# 產生正式版
npm run build
```

## 專案結構

```
rental-buddy/
├── rental-buddy-web/      ← Angular 主應用程式
│   ├── src/app/           ← UI 與互動邏輯
│   └── dist/              ← build 產物（執行 build 後產生）
├── docs/                  ← GitHub Pages 部署輸出
├── project-docs/          ← 專案文件資料夾
│   └── PROGRESS.md        ← 進度總表
└── README.md              ← 本文件
```

## 功能說明

- **5 大分類**：合約條件、設備狀態、安全採光、生活機能、環境鄰居
- **30 個檢查項目**：每項都有說明，點 `?` 展開
- **三種狀態**：待確認 / 已確認（✓） / 標記問題（⚑）
- **看房報告**：手機友善版房屋評價 + 可切換 精簡版
- **PDF 匯出**：只匯出 精簡版，適合留存或分享
- **100 分制評等**：A/B/C 等級輔助判斷房源適配度
- **本機儲存**：使用 localStorage，不需後端

## 報告與匯出流程

1. 在 `查核表` 填寫看房紀錄、地址、月租金與檢查項目。
2. 點 `查看報告` 進入手機友善版報告。
3. 在報告內切換 `精簡版` 可預覽正式文件版面。
4. 點 `匯出文件（PDF）`，瀏覽器列印視窗會只輸出精簡版。

## 開發注意

`rental-buddy-web/package.json` 的 `npm start` 使用 `ng serve --poll 1000`，避免部分 macOS/IDE 環境因檔案監看上限出現 `EMFILE` 導致熱更新不穩。

## Cursor 開發指令建議

以下是可以直接貼給 Cursor 的需求描述：

### 新增功能
```
在 Rental Buddy app 中加入「多筆看房記錄」功能：
- 頂部加入一個下拉選單，可切換不同房子（用地址命名）
- 新增「儲存這筆記錄」按鈕，將當前 state 存到 localStorage
- 最多儲存 5 筆，超過則提示用戶刪除舊的
- 在報告頁面可以並排比較兩筆記錄的完成度
```

```
幫 Rental Buddy 加入 PWA 支援：
- 新增 manifest.json（app 名稱、圖示、顏色使用現有的 --rose 色）
- 新增 service-worker.js 讓 app 可離線使用
- 在 Angular 的 src/index.html 加入相關 meta tags
```

```
在看房報告加入「分享功能」：
- 產生一段摘要文字（地址、完成度、問題清單）
- 支援 Web Share API（手機原生分享）
- 若瀏覽器不支援，則顯示「複製文字」按鈕
```

### UI 優化
```
優化 Rental Buddy 的動畫效果：
- checklist 項目勾選時加入 checkmark 動畫
- 標記問題時加入輕微震動提示（CSS 動畫）
- 報告 modal 的環形進度圓使用 SVG stroke-dashoffset 動畫
- 整體加入頁面載入時的 stagger 動畫（項目從下到上依序出現）
```

## 色彩系統

```css
--rose: #D97B6C;        /* 主色：玫瑰粉（CTA、強調） */
--rose-deep: #B05848;   /* 深玫瑰（hover、標題） */
--blush: #F9E8E0;       /* 淺粉（背景色塊） */
--sage-dark: #7A9275;   /* 鼠尾草綠（已確認狀態） */
--cream: #FBF7F4;       /* 奶油白（頁面背景） */
--ink: #2C2420;         /* 墨色（主文字） */
```

## 部署

```bash
# GitHub Pages（main + /docs）
# 1) 先到 Settings > Pages 設定 Source = main /docs
# 2) 每次更新網頁只要跑：
cd rental-buddy-web
npm run deploy:gh

# 3) 回到 repo root 後提交 docs
cd ..
git add docs
git commit -m "deploy: update github pages build"
git push

# Vercel（推薦）
npx vercel --prod
```
