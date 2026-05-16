# 查核題變更對報告的影響（維護清單）

最後更新：2026-05-16（v4；對應 **F-026**）

## 1) 目的

回答兩個問題：

1. **之後查核表新增或刪除題目，報告會不會跟著變？**
2. **開發者要改哪些地方，報告才完整、分數才合理？**

---

## 2) 會自動跟著 `items[]` 變更的部分

程式以 `rental-buddy-web/src/app/app.ts` 的 `readonly items: ChecklistItem[]` 為**題目唯一清單**。

| 報告輸出 | 行為 |
| --- | --- |
| 總題數、已確認、待確認、標記問題 | `totalCount`、`confirmedCount` 等依 `items` 長度與 `state` |
| Rental Score、等級、風險 | 依各題 `state` + `getItemRiskConfig(item)` |
| 五分類雷達、分類表 | `radarAxisIds` + 各題 `cat` |
| 螢幕版優／缺／待清單 | `reportPros` / `reportCons` / `reportPending` 遍歷 `items` |
| PDF 重要項目表 | `reportImportantChecklistRows`：排序後取前 **8** 筆 |
| AI 匯出 JSON `checklistTable` | 全量 `items`（含 `quickStatus`、`selectedOptions`） |

**結論**：在 `items` 陣列新增或刪除一題，**數字與清單會變**；使用者對該題的填答存在 `state[item.id]`。

### 舊資料注意

- 刪除題目後，localStorage 可能仍留有孤兒 `state[舊id]`，通常不影響顯示，但備份 JSON 體積略增。
- 新增題目時，若紀錄無該 `id` 狀態，載入時會補預設（`quickStatus: unknown` 等）。

---

## 3) 不會自動完善、需手動維護的設定

每個 `rb_xxx`（或新 ID）建議同步檢查下表：

| 設定（`app.ts`） | 用途 | 未設定時 |
| --- | --- | --- |
| `itemScoringWeights` | 分數 weight、riskLevel | 預設 weight，扣分可能不準 |
| `itemReportCopyConfig` | 優勢／風險／下一步文案 | 通用句型模板 |
| `itemReportPriorityBoost` | PDF 前 8 筆優先序 | 僅依狀態與 weight 排序 |
| `itemOptionConfig` | 查核頁細節 chips | 該題無 chips |
| `propertySyncChecklistIds` | 房源 chips → 查核連動 | 不連動 |

v4 目標（**F-022**）：新增題時至少補 **weight + riskLevel**；文案可後補。

---

## 4) 開發自查步驟（改 `items[]` 時）

1. 在 `items` 新增／刪除／改 `cat`、`title`、`riskTier`。
2. 更新 `itemScoringWeights[id]`（weight 1～5、riskLevel）。
3. 若需細節 chips：更新 `itemOptionConfig[id]`。
4. 若需 PDF 優先顯示：更新 `itemReportPriorityBoost[id]`。
5. 若需專屬敘事：更新 `itemReportCopyConfig[id]`（可暫用通用句）。
6. 若與房源條件連動：評估是否加入 `propertySyncChecklistIds`。
7. 同步 [v3/specs/checklist-items-overview.md](../../v3/specs/checklist-items-overview.md)（若仍為權威一覽表）。
8. 手動回歸：查核填一筆 → 報告首屏 → 列印 PDF → 複製 AI JSON 抽樣 1 題。

---

## 5) v3 欄位與報告對齊（F-022）

| v3／查核資料 | 報告應呈現 | 現況（基線） |
| --- | --- | --- |
| 房源 chips、`propertySummaryText` | 螢幕首屏 + 列印 meta「條件」 | 列印有；螢幕首屏偏弱 |
| `quickStatus` | 明細列標籤 | JSON 有；螢幕長清單未強調 |
| `selectedOptions` | 明細備註區 | `formatChecklistNote` 已用於 PDF 表與 JSON |
| `layoutNotes` | 戶型備註 | AI JSON `layout.notes` 有 |
| 僅 chips 無自由備註 | 仍顯示細節 | 依 `formatChecklistNote` |

v4 驗收：僅選 chips、不寫備註時，螢幕「詳細分析」仍可讀。

---

## 6) 與 v2 規格關係

- 章節順序、AI 不覆蓋分數：仍以 [v2/inbody-report-gen-spec.md](../../v2/inbody-report-gen-spec.md) 為準。
- 本檔只補「**題目變更維護**」與「**v3 資料呈現**」，不重寫 v2 全文。
