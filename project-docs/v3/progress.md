# Rental Buddy 第三版 — 進度總表

最後更新：2026-05-16（**v3 已結案**；路線圖見 [feature-roadmap.md](./feature-roadmap.md)、總覽見 [README.md](./README.md)）

## 結案摘要

| 項目 | 說明 |
| --- | --- |
| **狀態** | 第三版開發結案 |
| **結案日** | 2026-05-16 |
| **上線基線** | `main` @ `2ec8c8e`（含 `docs/` GitHub Pages 同步） |
| **主要合併** | `feat/bottom-nav-settings` → `main`（fast-forward） |

本版以查核表現場體驗為主軸，並完成底部導覽、設定頁與紀錄選單等導覽／管理 UX；細節見下方「已完成項目」。

---

## 起點狀態（第三版開案時）

- **產品基線**：v1 功能主軸與多數 F-xxx 已完成；詳見 [v1/progress.md](../v1/progress.md)。
- **報告／InBody**：v2 規格與 progress 中已登記之 Phase 2～6 相關項目視為**已對齊現況**；細節以 [v2/inbody-report-gen-spec.md](../v2/inbody-report-gen-spec.md) 與 v1 進度條目為準。
- **v3 文件**：目標與 Backlog 已寫入 [README.md](./README.md) §5、[feature-roadmap.md](./feature-roadmap.md)；討論稿 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md)。決策見 [decisions.md](./decisions.md)（**D-002** 已定案）。

---

## 已完成項目（v3）

### 文件與規格

1. **查核互動稽核**：`syncQuickStatusFromOptions` 與互動矩陣已寫入 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md)（§5.2、§5.2.1、§7）。
2. **查核項目與風險模型**： [specs/checklist-items-overview.md](./specs/checklist-items-overview.md)、[specs/checklist-full-risk-model-from-source-pdf.md](./specs/checklist-full-risk-model-from-source-pdf.md) 與程式對照維護。

### 功能實作（對應 Backlog）

| ID | 摘要 |
| --- | --- |
| **F-015** | 現場快速摘要：地址多行、戶型「填寫更多」收合、套／雅預填、坪數併入延伸區等（`rental-buddy-web`）。 |
| **F-016** | 房源條件與摘要區整理；查核工具列分類 chips 與進度角標，減少重複認知（與 F-017 同迭代）。 |
| **F-017** | 分類可多選、未選＝全部；第六槽為**篩選**面板（決策 **D-002**）；清單範圍分段（精簡／標準／完整）。 |
| **F-018** | 快速狀態三級與風險向視覺延續 v1／v2，第三版以 spec 稽核與工具列一致化收斂。 |
| **F-019** | 細節選項 → `quickStatus` 聚合規則已於 spec §7 定稿並與現行程式對齊。 |

### 導覽與管理（本版一併交付）

- **底部導覽**：查核／報告／設定三頁切換（`app-bottom-nav`）。
- **設定頁**：備份匯出／還原、字級、主題色等自設定頁進入（自紀錄選單移出）。
- **紀錄選單**：清單優先切換、獨立新增、摺疊重新命名、危險操作分區與字級層級調整。

### 部署

- GitHub Pages：`npm run deploy:gh` 產出已併入 `main` 之 `docs/`。

---

## 進行中（v3）

（無 — 第三版已結案。）

---

## 規劃中／待辦（v3）

（無 — 第三版範圍內 Backlog 已結案。後續新需求請另開 **v4** 目錄或於 v1 `feature-roadmap` 新增 F-0xx 並標註版本。）

---

## 開發與部署注意（延續）

- 開發：`rental-buddy-web/` 下 `npm start`；建置 `npm run build`。
- GitHub Pages：若前端變更應出現在線上版，依工作區規則執行 `npm run deploy:gh` 並提交 `docs/`。
