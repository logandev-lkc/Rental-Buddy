# Rental Buddy 第三版 — 進度總表

最後更新：2026-05-10（路徑 `v3/progress.md`；路線圖見 [feature-roadmap.md](./feature-roadmap.md)、總覽見 [README.md](./README.md)、上層索引見 [README.md](../README.md)）

## 起點狀態（第三版開案時）

- **產品基線**：v1 功能主軸與多數 F-xxx 已完成；詳見 [v1/progress.md](../v1/progress.md)。
- **報告／InBody**：v2 規格與 progress 中已登記之 Phase 2～6 相關項目視為**已對齊現況**；細節以 [v2/inbody-report-gen-spec.md](../v2/inbody-report-gen-spec.md) 與 v1 進度條目為準。
- **v3 文件**：目標與 Backlog 已寫入 [README.md](./README.md) §5、[feature-roadmap.md](./feature-roadmap.md)；討論稿 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md)。決策定稿後更新 [decisions.md](./decisions.md)。

---

## 已完成項目（v3）

1. **文件**：查核互動與 `syncQuickStatusFromOptions` 已稽核並寫入 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md)（§5.2、§5.2.1、§7 示例）。
2. **實作（F-015 部分）**：查核頁「現場快速摘要」地址改為多行輸入、摘要區地址欄全寬（`rental-buddy-web`）。
3. **實作（F-015 延續）**：戶型類型旁「填寫更多」收合房／廳／衛、廚房型態與**室內坪數**；套房／雅房選取時自動帶入常見格局與無廚房，廚房預設選項含「共用廚房」；切換戶型時不再自動收起延伸區；GitHub Pages 已與 `docs/` 同步推送。
4. **實作（F-016 部分）**：房源條件 chips 改為「物件條件／管理與費用／租約與補助」三區；寬螢幕下各區內雙欄網格以降低垂直長度；與查核題連動邏輯不變。

---

## 進行中（v3）

1. **F-015**（收尾）：摘要區與房源區塊整體密度是否再調（與 **F-016** 收尾連動）。
2. **F-016**（收尾）：摘要 chips 與下方分類查核題是否仍須語意收斂或減量（見 spec A5）。

---

## 規劃中／待辦（v3）

1. **F-017** 分類多選／第六槽（候選 D-002）。
2. **F-018／F-019** 快速狀態與聚合規則（候選 D-003，對齊 §7 矩陣）。
3. 前端上線版若需同步：於 `rental-buddy-web/` 執行 `npm run deploy:gh` 並提交 `docs/`。

---

## 開發與部署注意（延續）

- 開發：`rental-buddy-web/` 下 `npm start`；建置 `npm run build`。
- GitHub Pages：若前端變更應出現在線上版，依工作區規則執行 `npm run deploy:gh` 並提交 `docs/`。
