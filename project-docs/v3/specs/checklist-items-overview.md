# 查核卡項目一覽

本表對應 **`rental-buddy-web/src/app/app.ts`** 內建資料：題目來源為 **《完整風險模型查核表》PDF**（共 **46** 題，`rb_001`～`rb_046`），舊版 35 題（`c1`…`n6`）已移除；本機紀錄使用 **`rental-buddy-records-v2`**，舊鍵 `rental-buddy-records-v1` 不再讀取。

**欄位說明**

| 欄位 | 對應程式 |
|------|----------|
| 項目 | `items[].title` |
| 所屬分類 | `items[].cat` → `categoryMap`（合約與權責／設備與空間／…） |
| 項目註解 | `items[].tip` |
| 細節選項 | `itemOptionConfig[id]`（皆為複選 chip） |
| 風險層級 | `items[].riskTier`：`must`（必查）／`should`（建議確認）／`later`（可後補） |
| 備註 placeholder | `items[].notePlaceholder`（查核卡 textarea 綁定 `getItemNotePlaceholder(id)`） |

**與房源條件連動**（雙向）：`rb_001` 租補、`rb_002` 押金、`rb_023` 管理費、`rb_037` 大樓管理、`rb_025` 寵物／開伙。

**完整逐題表**（含 PDF 對照說明）見 [checklist-full-risk-model-from-source-pdf.md](./checklist-full-risk-model-from-source-pdf.md)。

---

## 題目 id 速查（依 PDF 順序）

| id 範圍 | 風險層級 | 題數 |
|---------|----------|------|
| `rb_001`～`rb_021` | 必查（must） | 21 |
| `rb_022`～`rb_039` | 建議確認（should） | 18 |
| `rb_040`～`rb_046` | 可後補（later） | 7 |

---

*程式為單一真相來源；若 PDF 修訂，請同步更新 `app.ts` 並調整本檔摘要。*
