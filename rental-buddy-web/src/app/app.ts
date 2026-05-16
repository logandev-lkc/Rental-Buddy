import { CommonModule } from '@angular/common';
import { ApplicationRef, ChangeDetectorRef, Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { SwUpdate } from '@angular/service-worker';

/** Chromium `beforeinstallprompt`（無官方 DOM 型別） */
type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** 查核清單顯示範圍：精簡／標準／完整 */
type ChecklistScopeMode = 'compact' | 'standard' | 'full';

/** 介面字體：小／中／大（對應 html 根字級 16／18／20px，預設中） */
type FontScale = 'sm' | 'md' | 'lg';

/** 主題配色（目前僅暖色；其餘預留） */
type ThemePalette = 'warm';
type ThemePaletteOption = ThemePalette | 'cool' | 'neutral';

/** 操作教學單步（anchorId 對應畫面元素 id，null 表示不捲動至特定區塊） */
interface TutorialStepDef {
  anchorId: string | null;
  title: string;
  body: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  /** v2：查核題改為 PDF 完整風險模型（rb_*）；舊 v1 localStorage 金鑰不再讀取 */
  readonly storageKey = 'rental-buddy-records-v2';
  readonly backupFormatVersion = 3;
  /** 與房源條件 chips 雙向同步的查核題 id */
  private readonly propertySyncChecklistIds = new Set<string>(['rb_001', 'rb_002', 'rb_023', 'rb_037', 'rb_025']);
  readonly defaultMapCenter: L.LatLngTuple = [25.0478, 121.5319];
  readonly attachmentLimit = 10;
  readonly supportAuthorHref = 'https://buymeacoffee.com/';
  readonly supportAuthorLabel = '贊助';
  readonly contactAuthorHref = 'mailto:logan.lkc.dev@gmail.com';
  readonly contactAuthorLabel = '聯絡作者';
  readonly appShareUrl =
    typeof window !== 'undefined' && window.location?.href
      ? window.location.href
      : 'https://logandev-lkc.github.io/Rental-Buddy/';
  readonly categories = [
    { id: 'contract', label: '合約與權責' },
    { id: 'facility', label: '設備與空間' },
    { id: 'safety', label: '安全與居住品質' },
    { id: 'living', label: '生活便利性' },
    { id: 'neighbor', label: '環境與管理' }
  ];

  readonly categoryMap: Record<string, string> = {
    contract: '合約與權責',
    facility: '設備與空間',
    safety: '安全與居住品質',
    living: '生活便利性',
    neighbor: '環境與管理'
  };

  // 5 個分類對應到「五角形」雷達圖軸
  readonly radarAxisIds = ['contract', 'facility', 'safety', 'living', 'neighbor'] as const;
  /**
   * 總分用分類加權（加總為 1）。雷達圖各軸仍為該分類內加權得分比例，與此無關。
   * 安全與合約權重較高，生活機能相對較低。
   */
  readonly categoryScoreWeightByAxis: Record<(typeof App.prototype.radarAxisIds)[number], number> = {
    safety: 0.25,
    contract: 0.22,
    facility: 0.2,
    neighbor: 0.18,
    living: 0.15
  };
  readonly radarRingRatios = [0.25, 0.5, 0.75] as const;
  /** 比較雷達圖：色相差距大，避免紅棕綠相近難辨識 */
  readonly radarColors = ['#D97B6C', '#2563EB', '#059669', '#CA8A04', '#7C3AED'];

  readonly radarCenter = 150;
  readonly radarRadius = 86;
  readonly quickStatusOptions: Array<{ value: QuickStatus; label: string; title: string }> = [
    {
      value: 'good',
      label: '良好',
      title: '大致滿意、未見明顯扣分點（+2）。已選時再點「良好」可回到未評。'
    },
    {
      value: 'ok',
      label: '可接受',
      title: '大致可行，有可談的小妥協或資訊落差（+1）。已選時再點「可接受」可回到未評。'
    },
    {
      value: 'attention',
      label: '需注意',
      title: '有疑慮或待核對，建議追問或列待辦（-1）。已選時再點「需注意」可回到未評。'
    },
    {
      value: 'bad',
      label: '很不理想',
      title: '狀況偏差或有明顯硬傷，建議慎重評估（-2）。已選時再點「很不理想」可回到未評。'
    }
  ];
  readonly checklistFilterOptions: Array<{ id: ChecklistFilterId; label: string; group: ChecklistFilterGroupId }> = [
    { id: 'pending', label: '尚未確認', group: 'status' },
    { id: 'confirmed', label: '已確認', group: 'status' },
    { id: 'good', label: '良好', group: 'quick' },
    { id: 'ok', label: '可接受', group: 'quick' },
    { id: 'attention', label: '需注意', group: 'quick' },
    { id: 'bad', label: '很不理想', group: 'quick' },
    { id: 'priority_high', label: '必須審查', group: 'priority' },
    { id: 'priority_normal', label: '建議審查', group: 'priority' },
    { id: 'priority_later', label: '補充條件', group: 'priority' }
  ];
  readonly checklistFilterGroups: Array<{ id: ChecklistFilterGroupId; label: string }> = [
    { id: 'status', label: '狀態' },
    { id: 'quick', label: '評等' },
    { id: 'priority', label: '查核層級' }
  ];
  readonly propertyChoiceGroups: Array<{ field: PropertyChoiceField; label: string; options: string[] }> = [
    { field: 'buildingType', label: '建物類型', options: ['電梯大樓', '公寓', '套房', '雅房', '分租'] },
    { field: 'floorLevel', label: '樓層', options: ['低樓層', '中樓層', '高樓層', '頂樓', '地下/半地下'] },
    { field: 'buildingAgeRange', label: '屋齡', options: ['5年內', '5-15年', '15-30年', '30年以上', '不確定'] },
    { field: 'hasElevator', label: '電梯', options: ['有', '無', '不確定'] },
    { field: 'hasManager', label: '管理員', options: ['有', '無', '不確定'] },
    { field: 'managementFeeType', label: '管理費', options: ['含租金', '另計', '無', '需確認'] },
    { field: 'depositMonths', label: '押金', options: ['1個月', '2個月', '超過2個月', '需確認'] },
    { field: 'minLeaseTerm', label: '最短租期', options: ['半年', '一年', '兩年', '可談', '需確認'] },
    { field: 'canCook', label: '開伙', options: ['可', '不可', '需確認'] },
    { field: 'canPet', label: '寵物', options: ['可', '不可', '需確認'] },
    { field: 'subsidyAvailable', label: '租補', options: ['可申請', '不可', '需確認'] }
  ];
  /** 看房前多數可從網路/電話先取得的基本資訊（預設直接顯示） */
  readonly propertyPrimaryFields: ReadonlyArray<PropertyChoiceField> = [
    'depositMonths',
    'managementFeeType',
    'minLeaseTerm',
    'canCook',
    'canPet',
    'subsidyAvailable'
  ];
  /** 次要戶型欄位（摺疊在「更多補充條件」） */
  readonly propertySecondaryFields: ReadonlyArray<PropertyChoiceField> = [
    'buildingType',
    'floorLevel',
    'buildingAgeRange',
    'hasElevator',
    'hasManager'
  ];
  readonly propertyPrimaryChoiceGroups = this.propertyChoiceGroups.filter((g) => this.propertyPrimaryFields.includes(g.field));
  readonly propertySecondaryChoiceGroups = this.propertyChoiceGroups.filter((g) => this.propertySecondaryFields.includes(g.field));

  readonly items: ChecklistItem[] = [
    { id: 'rb_001', cat: 'contract', title: '租屋補助資格', tip: '部分房東可能不配合租屋補助申請，建議簽約前先確認。', notePlaceholder: '例如：房東願意協助租補，但需額外簽切結書', riskTier: 'must' as const },
    { id: 'rb_002', cat: 'contract', title: '押金金額', tip: '依法押金不得超過兩個月租金，建議簽約前確認。', notePlaceholder: '例如：押金為 3 個月，需確認是否合法', riskTier: 'must' as const },
    { id: 'rb_003', cat: 'contract', title: '合約期限與違約金', tip: '建議提前確認租期、提前解約條件與違約金規則。', notePlaceholder: '例如：提前解約需支付 1 個月違約金', riskTier: 'must' as const },
    { id: 'rb_004', cat: 'contract', title: '設備維修與費用責任', tip: '建議提前確認維修責任、聯絡流程與費用負擔方式。', notePlaceholder: '例如：小型維修需房客自行負擔', riskTier: 'must' as const },
    { id: 'rb_005', cat: 'contract', title: '退租告知與看房規則', tip: '需確認退租提前通知時間，以及房東是否可帶新房客看房。', notePlaceholder: '例如：退租需提前兩個月通知，期間可能安排帶看', riskTier: 'must' as const },
    { id: 'rb_006', cat: 'contract', title: '房東進入與隱私規則', tip: '建議確認房東是否能自行進入房屋或臨時帶看。', notePlaceholder: '例如：房東持有備份鑰匙，但表示會提前通知', riskTier: 'must' as const },
    { id: 'rb_007', cat: 'facility', title: '熱水穩定度', tip: '建議實際測試熱水、水壓與穩定度。', notePlaceholder: '例如：洗澡時熱水容易忽冷忽熱', riskTier: 'must' as const },
    { id: 'rb_008', cat: 'safety', title: '天花板與夾層狀況', tip: '需注意漏水痕跡、輕鋼架與天花板內部狀況。', notePlaceholder: '例如：浴室為輕鋼架，需確認是否曾漏水', riskTier: 'must' as const },
    { id: 'rb_009', cat: 'safety', title: '是否有壁癌／漏水', tip: '注意牆角、窗框與天花板是否有潮濕、水痕或壁癌。', notePlaceholder: '例如：窗邊牆角有疑似壁癌痕跡', riskTier: 'must' as const },
    { id: 'rb_010', cat: 'safety', title: '頂樓加蓋與違建風險', tip: '需留意隔熱、漏水、消防與違建相關風險。', notePlaceholder: '例如：夏天室內偏熱，需確認隔熱狀況', riskTier: 'must' as const },
    { id: 'rb_011', cat: 'safety', title: '門鎖安全性', tip: '確認鎖具狀況與是否可自行更換門鎖。', notePlaceholder: '例如：房東持有備份鑰匙，需確認是否會進入房間', riskTier: 'must' as const },
    { id: 'rb_012', cat: 'safety', title: '滅火器／逃生設備', tip: '確認逃生動線、滅火器與消防設備是否可正常使用。', notePlaceholder: '例如：逃生梯堆放雜物，可能影響逃生', riskTier: 'must' as const },
    { id: 'rb_013', cat: 'safety', title: '室內隔音狀況', tip: '白天安靜不代表夜晚安靜，建議確認夜間噪音。', notePlaceholder: '例如：晚上可聽到樓上腳步聲與關門聲', riskTier: 'must' as const },
    { id: 'rb_014', cat: 'safety', title: '浴室通風與乾濕狀況', tip: '確認是否有對外窗、抽風設備與潮濕問題。', notePlaceholder: '例如：浴室沒有抽風機，但有對外窗', riskTier: 'must' as const },
    { id: 'rb_015', cat: 'safety', title: '室內潮濕程度', tip: '台灣潮濕環境常影響居住品質與健康。', notePlaceholder: '例如：衣櫃內有潮濕味，雨季可能更明顯', riskTier: 'must' as const },
    { id: 'rb_016', cat: 'safety', title: '排水與異味問題', tip: '老屋常有排水反味與管線問題。', notePlaceholder: '例如：下雨後浴室會有排水味', riskTier: 'must' as const },
    { id: 'rb_017', cat: 'safety', title: '室內監視器與偷拍風險', tip: '建議確認房內是否有可疑鏡頭、監視器或異常設備。', notePlaceholder: '例如：床鋪附近有不明電子設備', riskTier: 'must' as const },
    { id: 'rb_018', cat: 'neighbor', title: '周邊噪音與夜間環境', tip: '注意夜市、酒吧、工地與主要道路噪音。', notePlaceholder: '例如：附近酒吧晚上較吵，凌晨仍有人潮', riskTier: 'must' as const },
    { id: 'rb_019', cat: 'neighbor', title: '緊急聯絡與管理窗口', tip: '確認設備故障、漏水或突發狀況時的聯絡窗口。', notePlaceholder: '例如：漏水需聯絡代管公司', riskTier: 'must' as const },
    { id: 'rb_020', cat: 'neighbor', title: '蟲害與衛生狀況', tip: '檢查廚房、浴室與排水孔周圍是否有蟲害跡象。', notePlaceholder: '例如：廚房角落有疑似蟑螂痕跡', riskTier: 'must' as const },
    { id: 'rb_021', cat: 'neighbor', title: '夜間周邊安全感', tip: '建議晚上再次查看周邊環境與人流狀況。', notePlaceholder: '例如：巷口偏暗，晚上人較少', riskTier: 'must' as const },
    { id: 'rb_022', cat: 'contract', title: '水電費計算方式', tip: '確認是否依台水台電帳單計費，或由房東自行訂價。', notePlaceholder: '例如：電費依房東計算，每度 6 元', riskTier: 'should' as const },
    { id: 'rb_023', cat: 'contract', title: '管理費與其他費用', tip: '確認管理費、清潔費或其他固定支出是否包含在租金內。', notePlaceholder: '例如：管理費每月 1500 元，未包含在租金內', riskTier: 'should' as const },
    { id: 'rb_024', cat: 'contract', title: '可否登記戶籍', tip: '部分房東不接受戶籍登記，可能影響租補、報稅或行政需求。', notePlaceholder: '例如：房東表示可登記，但需提前告知', riskTier: 'should' as const },
    { id: 'rb_025', cat: 'contract', title: '寵物與開伙限制', tip: '建議確認是否可養寵物、開伙，以及相關限制。', notePlaceholder: '例如：可養貓，但不可養狗與明火開伙', riskTier: 'should' as const },
    { id: 'rb_026', cat: 'facility', title: '冷氣是否為變頻款', tip: '變頻冷氣通常較省電，長期居住差異明顯。', notePlaceholder: '例如：冷氣年份較舊，需確認耗電情況', riskTier: 'should' as const },
    { id: 'rb_027', cat: 'facility', title: '網路與 WiFi 穩定度', tip: '建議現場測試網速與訊號穩定性。', notePlaceholder: '例如：房間內訊號偏弱，客廳較穩定', riskTier: 'should' as const },
    { id: 'rb_028', cat: 'facility', title: '插座與電力配置', tip: '確認插座數量、位置與電線狀況，避免延長線過多。', notePlaceholder: '例如：床邊沒有插座，可能需要延長線', riskTier: 'should' as const },
    { id: 'rb_029', cat: 'safety', title: '隔間與牆面材質', tip: '隔音、安全性與耐用度，通常與隔間材質有關。', notePlaceholder: '例如：與隔壁僅輕隔間，可聽到說話聲', riskTier: 'should' as const },
    { id: 'rb_030', cat: 'safety', title: '採光與通風方向', tip: '採光與通風會直接影響居住舒適度。', notePlaceholder: '例如：窗戶朝內側，白天採光偏弱', riskTier: 'should' as const },
    { id: 'rb_031', cat: 'safety', title: '西曬與室內溫度', tip: '西曬與頂樓容易影響夏季室內溫度。', notePlaceholder: '例如：下午西曬明顯，室內溫度偏高', riskTier: 'should' as const },
    { id: 'rb_032', cat: 'living', title: '通勤便利性', tip: '建議實際走一趟通勤路線與轉乘動線。', notePlaceholder: '例如：通勤需轉乘兩次，尖峰時段較擁擠', riskTier: 'should' as const },
    { id: 'rb_033', cat: 'living', title: '垃圾處理方式', tip: '確認垃圾車時間、分類方式與是否有代收。', notePlaceholder: '例如：需固定時間追垃圾車，假日沒有清運', riskTier: 'should' as const },
    { id: 'rb_034', cat: 'living', title: '手機訊號與死角', tip: '建議測試不同位置的手機訊號強度。', notePlaceholder: '例如：房間內訊號偏弱，窗邊正常', riskTier: 'should' as const },
    { id: 'rb_035', cat: 'neighbor', title: '環境與鄰里組成', tip: '觀察鄰居類型與生活作息是否適合自己。', notePlaceholder: '例如：鄰居多為學生，晚上較晚休息', riskTier: 'should' as const },
    { id: 'rb_036', cat: 'neighbor', title: '房東溝通與配合度', tip: '看房時的回覆速度與態度，通常能反映後續溝通品質。', notePlaceholder: '例如：房東回覆較慢，部分條件未明確說明', riskTier: 'should' as const },
    { id: 'rb_037', cat: 'neighbor', title: '大樓管理與出入安全', tip: '有管理員通常能提升安全性與便利性。', notePlaceholder: '例如：管理員只在白天值班', riskTier: 'should' as const },
    { id: 'rb_038', cat: 'neighbor', title: '室內氣味與空氣狀況', tip: '留意霉味、油煙味、菸味與寵物氣味。', notePlaceholder: '例如：房間有淡淡霉味，雨天可能更明顯', riskTier: 'should' as const },
    { id: 'rb_039', cat: 'neighbor', title: '公共區域維護狀況', tip: '公共區域整潔會直接影響居住品質。', notePlaceholder: '例如：樓梯間長期堆放雜物', riskTier: 'should' as const },
    { id: 'rb_040', cat: 'facility', title: '飲水與濾水設備', tip: '若未提供飲水或濾水設備，需自行添購並評估成本。', notePlaceholder: '例如：僅有共用飲水機，房內無濾水設備', riskTier: 'later' as const },
    { id: 'rb_041', cat: 'facility', title: '洗曬衣空間', tip: '確認曬衣空間是否獨立、共用，以及是否方便使用。', notePlaceholder: '例如：陽台空間較小，雨天可能不易晾乾', riskTier: 'later' as const },
    { id: 'rb_042', cat: 'facility', title: '廚房設備', tip: '確認冰箱、爐具、抽風設備是否正常。', notePlaceholder: '例如：抽油煙機較弱，煮飯時油煙較重', riskTier: 'later' as const },
    { id: 'rb_043', cat: 'facility', title: '工作與桌面空間', tip: '若有遠端工作需求，建議確認桌面空間與插座配置。', notePlaceholder: '例如：桌面空間較小，可能不適合雙螢幕', riskTier: 'later' as const },
    { id: 'rb_044', cat: 'facility', title: '停車空間', tip: '確認停車位置、費用與進出動線。', notePlaceholder: '例如：機車位需額外抽籤，汽車位另租', riskTier: 'later' as const },
    { id: 'rb_045', cat: 'facility', title: '收納空間', tip: '確認衣櫃、鞋櫃與雜物收納空間是否足夠。', notePlaceholder: '例如：冬季衣物可能不夠放', riskTier: 'later' as const },
    { id: 'rb_046', cat: 'living', title: '日常採買便利性', tip: '步行 5 分鐘內有超商或超市會較方便。', notePlaceholder: '例如：晚上附近只有超商，沒有超市', riskTier: 'later' as const },
  ];

  readonly itemRiskConfig: Record<string, ItemRiskConfig> = {
    rb_001: { weight: 4, riskLevel: 'high' },
    rb_002: { weight: 4, riskLevel: 'high' },
    rb_003: { weight: 4, riskLevel: 'high' },
    rb_004: { weight: 4, riskLevel: 'high' },
    rb_005: { weight: 4, riskLevel: 'high' },
    rb_006: { weight: 4, riskLevel: 'high' },
    rb_007: { weight: 4, riskLevel: 'high' },
    rb_008: { weight: 4, riskLevel: 'high' },
    rb_009: { weight: 5, riskLevel: 'high' },
    rb_010: { weight: 5, riskLevel: 'high' },
    rb_011: { weight: 4, riskLevel: 'high' },
    rb_012: { weight: 5, riskLevel: 'high' },
    rb_013: { weight: 4, riskLevel: 'high' },
    rb_014: { weight: 4, riskLevel: 'high' },
    rb_015: { weight: 4, riskLevel: 'high' },
    rb_016: { weight: 5, riskLevel: 'high' },
    rb_017: { weight: 4, riskLevel: 'high' },
    rb_018: { weight: 4, riskLevel: 'high' },
    rb_019: { weight: 4, riskLevel: 'high' },
    rb_020: { weight: 5, riskLevel: 'high' },
    rb_021: { weight: 4, riskLevel: 'high' },
    rb_022: { weight: 3, riskLevel: 'medium' },
    rb_023: { weight: 3, riskLevel: 'medium' },
    rb_024: { weight: 3, riskLevel: 'medium' },
    rb_025: { weight: 3, riskLevel: 'medium' },
    rb_026: { weight: 3, riskLevel: 'medium' },
    rb_027: { weight: 3, riskLevel: 'medium' },
    rb_028: { weight: 3, riskLevel: 'medium' },
    rb_029: { weight: 3, riskLevel: 'medium' },
    rb_030: { weight: 3, riskLevel: 'medium' },
    rb_031: { weight: 3, riskLevel: 'medium' },
    rb_032: { weight: 3, riskLevel: 'medium' },
    rb_033: { weight: 3, riskLevel: 'medium' },
    rb_034: { weight: 3, riskLevel: 'medium' },
    rb_035: { weight: 3, riskLevel: 'medium' },
    rb_036: { weight: 3, riskLevel: 'medium' },
    rb_037: { weight: 3, riskLevel: 'medium' },
    rb_038: { weight: 3, riskLevel: 'medium' },
    rb_039: { weight: 3, riskLevel: 'medium' },
    rb_040: { weight: 1, riskLevel: 'low' },
    rb_041: { weight: 1, riskLevel: 'low' },
    rb_042: { weight: 1, riskLevel: 'low' },
    rb_043: { weight: 1, riskLevel: 'low' },
    rb_044: { weight: 1, riskLevel: 'low' },
    rb_045: { weight: 1, riskLevel: 'low' },
    rb_046: { weight: 1, riskLevel: 'low' },
  };

  readonly itemReportCopyConfig: Record<string, ItemReportCopyConfig> = {
    rb_001: { positiveText: '「租屋補助資格」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「租屋補助資格」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「租屋補助資格」補齊書面約定或二次看房再確認。' },
    rb_002: { positiveText: '「押金金額」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「押金金額」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「押金金額」補齊書面約定或二次看房再確認。' },
    rb_003: { positiveText: '「合約期限與違約金」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「合約期限與違約金」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「合約期限與違約金」補齊書面約定或二次看房再確認。' },
    rb_004: { positiveText: '「設備維修與費用責任」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「設備維修與費用責任」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「設備維修與費用責任」補齊書面約定或二次看房再確認。' },
    rb_005: { positiveText: '「退租告知與看房規則」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「退租告知與看房規則」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「退租告知與看房規則」補齊書面約定或二次看房再確認。' },
    rb_006: { positiveText: '「房東進入與隱私規則」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「房東進入與隱私規則」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「房東進入與隱私規則」補齊書面約定或二次看房再確認。' },
    rb_007: { positiveText: '「熱水穩定度」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「熱水穩定度」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「熱水穩定度」補齊書面約定或二次看房再確認。' },
    rb_008: { positiveText: '「天花板與夾層狀況」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「天花板與夾層狀況」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「天花板與夾層狀況」補齊書面約定或二次看房再確認。' },
    rb_009: { positiveText: '「是否有壁癌／漏水」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「是否有壁癌／漏水」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「是否有壁癌／漏水」補齊書面約定或二次看房再確認。' },
    rb_010: { positiveText: '「頂樓加蓋與違建風險」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「頂樓加蓋與違建風險」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「頂樓加蓋與違建風險」補齊書面約定或二次看房再確認。' },
    rb_011: { positiveText: '「門鎖安全性」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「門鎖安全性」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「門鎖安全性」補齊書面約定或二次看房再確認。' },
    rb_012: { positiveText: '「滅火器／逃生設備」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「滅火器／逃生設備」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「滅火器／逃生設備」補齊書面約定或二次看房再確認。' },
    rb_013: { positiveText: '「室內隔音狀況」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「室內隔音狀況」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「室內隔音狀況」補齊書面約定或二次看房再確認。' },
    rb_014: { positiveText: '「浴室通風與乾濕狀況」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「浴室通風與乾濕狀況」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「浴室通風與乾濕狀況」補齊書面約定或二次看房再確認。' },
    rb_015: { positiveText: '「室內潮濕程度」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「室內潮濕程度」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「室內潮濕程度」補齊書面約定或二次看房再確認。' },
    rb_016: { positiveText: '「排水與異味問題」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「排水與異味問題」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「排水與異味問題」補齊書面約定或二次看房再確認。' },
    rb_017: { positiveText: '「室內監視器與偷拍風險」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「室內監視器與偷拍風險」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「室內監視器與偷拍風險」補齊書面約定或二次看房再確認。' },
    rb_018: { positiveText: '「周邊噪音與夜間環境」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「周邊噪音與夜間環境」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「周邊噪音與夜間環境」補齊書面約定或二次看房再確認。' },
    rb_019: { positiveText: '「緊急聯絡與管理窗口」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「緊急聯絡與管理窗口」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「緊急聯絡與管理窗口」補齊書面約定或二次看房再確認。' },
    rb_020: { positiveText: '「蟲害與衛生狀況」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「蟲害與衛生狀況」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「蟲害與衛生狀況」補齊書面約定或二次看房再確認。' },
    rb_021: { positiveText: '「夜間周邊安全感」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「夜間周邊安全感」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「夜間周邊安全感」補齊書面約定或二次看房再確認。' },
    rb_022: { positiveText: '「水電費計算方式」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「水電費計算方式」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「水電費計算方式」補齊書面約定或二次看房再確認。' },
    rb_023: { positiveText: '「管理費與其他費用」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「管理費與其他費用」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「管理費與其他費用」補齊書面約定或二次看房再確認。' },
    rb_024: { positiveText: '「可否登記戶籍」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「可否登記戶籍」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「可否登記戶籍」補齊書面約定或二次看房再確認。' },
    rb_025: { positiveText: '「寵物與開伙限制」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「寵物與開伙限制」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「寵物與開伙限制」補齊書面約定或二次看房再確認。' },
    rb_026: { positiveText: '「冷氣是否為變頻款」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「冷氣是否為變頻款」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「冷氣是否為變頻款」補齊書面約定或二次看房再確認。' },
    rb_027: { positiveText: '「網路與 WiFi 穩定度」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「網路與 WiFi 穩定度」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「網路與 WiFi 穩定度」補齊書面約定或二次看房再確認。' },
    rb_028: { positiveText: '「插座與電力配置」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「插座與電力配置」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「插座與電力配置」補齊書面約定或二次看房再確認。' },
    rb_029: { positiveText: '「隔間與牆面材質」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「隔間與牆面材質」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「隔間與牆面材質」補齊書面約定或二次看房再確認。' },
    rb_030: { positiveText: '「採光與通風方向」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「採光與通風方向」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「採光與通風方向」補齊書面約定或二次看房再確認。' },
    rb_031: { positiveText: '「西曬與室內溫度」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「西曬與室內溫度」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「西曬與室內溫度」補齊書面約定或二次看房再確認。' },
    rb_032: { positiveText: '「通勤便利性」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「通勤便利性」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「通勤便利性」補齊書面約定或二次看房再確認。' },
    rb_033: { positiveText: '「垃圾處理方式」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「垃圾處理方式」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「垃圾處理方式」補齊書面約定或二次看房再確認。' },
    rb_034: { positiveText: '「手機訊號與死角」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「手機訊號與死角」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「手機訊號與死角」補齊書面約定或二次看房再確認。' },
    rb_035: { positiveText: '「環境與鄰里組成」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「環境與鄰里組成」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「環境與鄰里組成」補齊書面約定或二次看房再確認。' },
    rb_036: { positiveText: '「房東溝通與配合度」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「房東溝通與配合度」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「房東溝通與配合度」補齊書面約定或二次看房再確認。' },
    rb_037: { positiveText: '「大樓管理與出入安全」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「大樓管理與出入安全」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「大樓管理與出入安全」補齊書面約定或二次看房再確認。' },
    rb_038: { positiveText: '「室內氣味與空氣狀況」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「室內氣味與空氣狀況」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「室內氣味與空氣狀況」補齊書面約定或二次看房再確認。' },
    rb_039: { positiveText: '「公共區域維護狀況」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「公共區域維護狀況」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「公共區域維護狀況」補齊書面約定或二次看房再確認。' },
    rb_040: { positiveText: '「飲水與濾水設備」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「飲水與濾水設備」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「飲水與濾水設備」補齊書面約定或二次看房再確認。' },
    rb_041: { positiveText: '「洗曬衣空間」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「洗曬衣空間」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「洗曬衣空間」補齊書面約定或二次看房再確認。' },
    rb_042: { positiveText: '「廚房設備」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「廚房設備」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「廚房設備」補齊書面約定或二次看房再確認。' },
    rb_043: { positiveText: '「工作與桌面空間」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「工作與桌面空間」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「工作與桌面空間」補齊書面約定或二次看房再確認。' },
    rb_044: { positiveText: '「停車空間」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「停車空間」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「停車空間」補齊書面約定或二次看房再確認。' },
    rb_045: { positiveText: '「收納空間」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「收納空間」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「收納空間」補齊書面約定或二次看房再確認。' },
    rb_046: { positiveText: '「日常採買便利性」已掌握現場狀況，有利於後續比較與簽約判斷。', riskText: '「日常採買便利性」仍有疑慮或未釐清，建議列入待辦並與房東確認。', nextAction: '針對「日常採買便利性」補齊書面約定或二次看房再確認。' },
  };

  readonly itemReportPriorityBoost: Record<string, number> = {
    rb_009: 18,
    rb_010: 16,
    rb_012: 18,
    rb_011: 8,
    rb_016: 12,
    rb_020: 14,
    rb_017: 8,
    rb_002: 8,
    rb_003: 8,
    rb_007: 8,
  };

  readonly itemOptionConfig: Record<string, string[]> = {
    rb_001: ['房東願配合', '房東不配合', '不符合資格', '補助條件限制'],
    rb_002: ['1個月', '2個月', '超過2個月', '退還條件不明'],
    rb_003: ['一年約', '可提前解約', '違約金 1 個月', '條件不明'],
    rb_004: ['房東負責', '房客負責', '先修後報帳', '需提前通知'],
    rb_005: ['提前 1 個月', '提前 2 個月', '可配合帶看', '房東可自行帶看'],
    rb_006: ['需提前通知', '房東持有鑰匙', '可自行帶看', '緊急狀況可進入'],
    rb_007: ['熱水穩定', '水壓偏弱', '忽冷忽熱', '熱水等待較久'],
    rb_008: ['水泥天花板', '輕鋼架', '有維修痕跡', '疑似漏水'],
    rb_009: ['無明顯異常', '牆角潮濕', '窗框水痕', '疑似漏水'],
    rb_010: ['非頂加', '頂樓加蓋', '疑似違建', '隔熱不足'],
    rb_011: ['電子鎖', '可自行換鎖', '門框鬆動', '木板門'],
    rb_012: ['有滅火器', '逃生動線正常', '逃生受阻', '消防設備不足'],
    rb_013: ['室內安靜', '車流聲明顯', '鄰居聲明顯', '樓上腳步聲'],
    rb_014: ['有對外窗', '有抽風機', '霉味明顯', '排水不順'],
    rb_015: ['空氣乾爽', '潮濕感明顯', '衣物難乾', '需長時間除濕'],
    rb_016: ['排水正常', '浴室反味', '廚房異味', '雨天異味明顯'],
    rb_017: ['無可疑設備', '公共區域監視器', '房內可疑設備', '不明電子設備'],
    rb_018: ['環境安靜', '車流噪音', '店家噪音', '夜間人潮較多'],
    rb_019: ['房東本人', '包租代管', '管理員協助', '無明確窗口'],
    rb_020: ['無明顯痕跡', '蟑螂跡象', '螞蟻出沒', '排水孔可疑'],
    rb_021: ['巷弄明亮', '人流正常', '晚上偏暗', '可疑人士聚集'],
    rb_022: ['台水台電', '房東計價', '包水電', '夏季另計'],
    rb_023: ['已含租金', '另計固定金額', '另計不固定', '項目不明'],
    rb_024: ['可登記', '不可登記', '需額外申請', '限部分用途'],
    rb_025: ['可養寵物', '禁止寵物', '可開伙', '禁止明火'],
    rb_026: ['變頻冷氣', '定頻冷氣', '無冷氣', '冷氣年份較舊'],
    rb_027: ['訊號穩定', '訊號偏弱', '網速偏慢', '可自行申辦'],
    rb_028: ['插座足夠', '位置不便', '線路老舊', '需延長線'],
    rb_029: ['水泥隔間', '輕隔間', '木作隔間', '隔音偏差'],
    rb_030: ['採光佳', '通風佳', '白天偏暗', '空氣不流通'],
    rb_031: ['無西曬', '下午偏熱', '西曬明顯', '頂樓較悶熱'],
    rb_032: ['可步行到站', '需轉乘', '通勤時間較長', '尖峰時段擁擠'],
    rb_033: ['垃圾代收', '固定時段', '需追垃圾車', '假日無清運'],
    rb_034: ['訊號正常', '房間偏弱', '浴室偏弱', '室內死角'],
    rb_035: ['家庭戶', '學生多', '套房多', '生活作息差異大'],
    rb_036: ['回覆清楚', '態度保留', '條件模糊', '需白紙黑字'],
    rb_037: ['有管理員', '24 小時管理', '白天管理員', '無管理員'],
    rb_038: ['空氣正常', '霉味', '菸味', '油煙味', '寵物味'],
    rb_039: ['公共區域整潔', '樓梯雜亂', '有垃圾堆放', '公共區域異味'],
    rb_040: ['有濾水設備', '有飲水機', '需自行添購', '共用設備'],
    rb_041: ['獨立陽台', '共用曬衣區', '室內曬衣', '通風較差'],
    rb_042: ['有冰箱', '有爐具', '抽風佳', '油煙較重'],
    rb_043: ['空間足夠', '桌面偏小', '插座不足', '不適合雙螢幕'],
    rb_044: ['有機車位', '有汽車位', '需另租', '停車位不足'],
    rb_045: ['收納足夠', '鞋櫃不足', '雜物空間偏少', '可接受'],
    rb_046: ['超商方便', '超市方便', '需騎車採買', '生活機能普通'],
  };

  /** 細節選項子字串：命中任一視為風險 chip（PDF 版已避免「需確認」選項文字） */
  readonly riskOptionKeywords = [
    '不配合',
    '不符合',
    '條件不明',
    '項目不明',
    '退還條件不明',
    '補助條件限制',
    '房客負責',
    '可自行帶看',
    '房東可自行帶看',
    '持有鑰匙',
    '偏弱',
    '忽冷忽熱',
    '較久',
    '輕鋼架',
    '維修痕跡',
    '疑似漏水',
    '牆角潮濕',
    '窗框水痕',
    '頂樓加蓋',
    '疑似違建',
    '隔熱不足',
    '門框鬆動',
    '木板門',
    '受阻',
    '消防設備不足',
    '車流聲明顯',
    '鄰居聲明顯',
    '樓上腳步聲',
    '霉味明顯',
    '排水不順',
    '潮濕感明顯',
    '衣物難乾',
    '需長時間除濕',
    '浴室反味',
    '廚房異味',
    '雨天異味明顯',
    '房內可疑設備',
    '不明電子設備',
    '車流噪音',
    '店家噪音',
    '夜間人潮較多',
    '無明確窗口',
    '蟑螂跡象',
    '螞蟻出沒',
    '排水孔可疑',
    '晚上偏暗',
    '可疑人士聚集',
    '房東計價',
    '夏季另計',
    '另計不固定',
    '不可登記',
    '需額外申請',
    '限部分用途',
    '禁止寵物',
    '禁止明火',
    '定頻冷氣',
    '無冷氣',
    '冷氣年份較舊',
    '訊號偏弱',
    '網速偏慢',
    '位置不便',
    '線路老舊',
    '需延長線',
    '輕隔間',
    '木作隔間',
    '隔音偏差',
    '白天偏暗',
    '空氣不流通',
    '下午偏熱',
    '西曬明顯',
    '頂樓較悶熱',
    '需轉乘',
    '通勤時間較長',
    '尖峰時段擁擠',
    '需追垃圾車',
    '假日無清運',
    '房間偏弱',
    '浴室偏弱',
    '室內死角',
    '學生多',
    '套房多',
    '生活作息差異大',
    '態度保留',
    '條件模糊',
    '無管理員',
    '霉味',
    '菸味',
    '油煙味',
    '寵物味',
    '樓梯雜亂',
    '有垃圾堆放',
    '公共區域異味',
    '需自行添購',
    '共用設備',
    '共用曬衣區',
    '室內曬衣',
    '通風較差',
    '油煙較重',
    '桌面偏小',
    '插座不足',
    '不適合雙螢幕',
    '需另租',
    '停車位不足',
    '鞋櫃不足',
    '雜物空間偏少',
    '需騎車採買',
    '生活機能普通',
    '疑似漏水'
  ];

  private readonly nonRiskDetailOptions = new Set<string>([
    '24 小時管理',
    '一年約',
    '人流正常',
    '先修後報帳',
    '公共區域整潔',
    '公共區域監視器',
    '包租代管',
    '另計固定金額',
    '可接受',
    '可提前解約',
    '可步行到站',
    '可登記',
    '可自行換鎖',
    '可自行申辦',
    '可配合帶看',
    '可開伙',
    '可養寵物',
    '台水台電',
    '回覆清楚',
    '固定時段',
    '垃圾代收',
    '室內安靜',
    '家庭戶',
    '已含租金',
    '巷弄明亮',
    '房東本人',
    '房東負責',
    '房東願配合',
    '抽風佳',
    '排水正常',
    '採光佳',
    '提前 1 個月',
    '提前 2 個月',
    '插座足夠',
    '收納足夠',
    '有冰箱',
    '有對外窗',
    '有抽風機',
    '有機車位',
    '有汽車位',
    '有滅火器',
    '有濾水設備',
    '有爐具',
    '有管理員',
    '有飲水機',
    '水泥天花板',
    '水泥隔間',
    '無可疑設備',
    '無明顯異常',
    '無明顯痕跡',
    '無西曬',
    '熱水穩定',
    '環境安靜',
    '白天管理員',
    '空氣乾爽',
    '空氣正常',
    '空間足夠',
    '管理員協助',
    '緊急狀況可進入',
    '訊號正常',
    '訊號穩定',
    '變頻冷氣',
    '超商方便',
    '超市方便',
    '逃生動線正常',
    '通風佳',
    '違約金 1 個月',
    '電子鎖',
    '需提前通知',
    '非頂加'
  ]);
  records: HouseRecord[] = [];
  activeRecordId = '';
  compareIds: string[] = [];
  draftRecordName = '';
  editingRecordName = '';
  isRecordMenuOpen = false;
  /** 紀錄選單內「重新命名」區是否展開 */
  recordMenuRenameOpen = false;
  isCategoryMenuOpen = false;
  checklistFilterPanelOpen = false;
  activeChecklistFilters: ChecklistFilterId[] = [];
  draftChecklistFilters: ChecklistFilterId[] = [];
  /** 查核清單範圍：精簡＝必須審查題、標準＋建議審查、完整＝全部 */
  checklistScopeMode: ChecklistScopeMode = 'compact';
  /** 介面字體大小（小／中／大） */
  fontScale: FontScale = 'md';
  /** 主題配色（目前僅暖色） */
  themePalette: ThemePalette = 'warm';
  readonly themePaletteOptions: readonly { id: ThemePaletteOption; label: string; available: boolean }[] = [
    { id: 'warm', label: '暖色', available: true },
    { id: 'cool', label: '冷色', available: false },
    { id: 'neutral', label: '中性', available: false }
  ];
  /** 首次引導／操作教學 */
  tutorialOpen = false;
  tutorialStepIndex = 0;
  /** 教學浮層貼上／貼下，避免遮住目前步驟的錨點 */
  tutorialPanelEdge: 'top' | 'bottom' = 'bottom';
  /** 教學遮罩：off、full 全灰、hole 四向留洞（介紹區保持原色） */
  tutorialDimMode: 'off' | 'full' | 'hole' = 'off';
  tutorialDimTopH = 0;
  tutorialDimLeftW = 0;
  tutorialDimHoleT = 0;
  tutorialDimHoleL = 0;
  tutorialDimHoleW = 0;
  tutorialDimHoleH = 0;
  tutorialDimRightLeft = 0;
  tutorialDimRightW = 0;
  tutorialDimBottomT = 0;
  tutorialDimBottomH = 0;
  /** 聚光燈「透明洞」圓角（px）；外緣與圈選 outline 外緣對齊，見 updateTutorialDimLayout */
  tutorialDimHoleRx = 14;
  /** SVG mask 用視窗寬高（userSpaceOnUse） */
  tutorialViewportW = 0;
  tutorialViewportH = 0;
  /** SVG mask 內圓角洞 path（與圈選 outline 外緣對齊） */
  tutorialHoleMaskPathD = '';
  /** 教學「查核題目」步在陣列中的索引（含自動展開示範題）；改動步驟順序時一併調整 */
  readonly tutorialChecklistDemoStepIndex = 7;
  readonly tutorialBottomNavStepIndex = 2;
  readonly tutorialRecordMenuStepIndex = 3;
  readonly tutorialFilterStepIndex = 6;
  readonly tutorialSteps: readonly TutorialStepDef[] = [
    {
      anchorId: null,
      title: '歡迎',
      body: '幾步帶你看主要功能。隨時可「跳過」。'
    },
    {
      anchorId: 'tutorial-anchor-site-header',
      title: '頂部列',
      body: '進度條反映查核完成度。右上角可管理看房紀錄。'
    },
    {
      anchorId: 'tutorial-anchor-bottom-nav',
      title: '底部導覽',
      body: '切換查核、報告與設定。備份、字體與說明在「設定」。'
    },
    {
      anchorId: 'tutorial-anchor-record-menu',
      title: '紀錄管理',
      body: '點列表切換紀錄；上方「＋ 新增」建立紀錄；「重新命名…」可改目前名稱。'
    },
    {
      anchorId: 'tutorial-anchor-overview',
      title: '快速摘要',
      body: '填地址與月租；展開「看房前先記錄」可填戶型，部分會帶入下方查核題。'
    },
    {
      anchorId: 'tutorial-anchor-toolbar',
      title: '清單範圍與分類',
      body: '上方切換清單範圍（精簡／標準／完整）；下方分類可多選，未選＝全部。'
    },
    {
      anchorId: 'tutorial-anchor-filter',
      title: '篩選',
      body: '依狀態、評等、層級篩選列表。'
    },
    {
      anchorId: 'tutorial-anchor-checklist-body',
      title: '查核題目',
      body: '選評等、勾選項、寫備註。點標題可收合。'
    },
    {
      anchorId: 'tutorial-anchor-footer',
      title: '完成度',
      body: '數字為目前範圍內進度。切到「報告」可看摘要與匯出 PDF。'
    }
  ];
  private readonly tutorialStorageKey = 'rental-buddy-tutorial-completed-v1';
  private readonly fontScaleStorageKey = 'rental-buddy-font-scale-v1';
  private readonly themeStorageKey = 'rental-buddy-theme-v1';
  private tutorialRevealTimer: ReturnType<typeof window.setTimeout> | null = null;
  /** 教學「查核題目」步自動展開的題目 id，離開該步或結束教學時收合 */
  private tutorialAutoExpandedItemId: string | null = null;
  /** 戶型區：與 `.custom-select` 同風格的下拉（layoutType / kitchenType） */
  overviewDropdownOpen: null | 'layoutType' | 'kitchenType' = null;
  /** 戶型區：房／廳／衛、廚房為選填，經「填寫更多」展開 */
  overviewLayoutExtraExpanded = false;
  readonly layoutTypePresetOptions = ['套房', '雅房', '整層住家', '分租套房', '分租雅房'];
  readonly kitchenTypePresetOptions = ['開放式', '獨立廚房', '半開放式', '共用廚房', '無廚房'];
  /** 空陣列＝未篩選分類（顯示全部）；多選時依陣列順序顯示各分類區塊 */
  selectedCategoryIds: string[] = [];
  currentPage: 'checklist' | 'report' | 'settings' = 'checklist';
  settingsActionMessage = '';
  reportViewMode: 'friendly' | 'compact' = 'friendly';
  reportDataCopyState = '';
  showAiImportPanel = false;
  aiReportDraftInput = '';
  aiReportImportMessage = '';
  /** 報告頁：次要動作收合（地圖／檢視切換／AI 複製等） */
  reportToolsExpanded = false;
  showMapPicker = false;
  /** 戶型／房源條件預設收合，降低查核表首屏高度（F-013 S3） */
  overviewExtraExpanded = false;
  /** 備註與現場照片區預設收合 */
  overviewNotesMediaExpanded = false;
  overviewPropertyMoreExpanded = false;
  mapPickerStatus = '點一下地圖，會自動帶入相似地址。';
  isReverseGeocoding = false;
  isLocating = false;
  showIntro = true;
  /** F-010：PWA 安裝提示（僅手機／平板觸控；iOS 手動加入主畫面、Android 原生安裝） */
  installPromptEvent: BeforeInstallPromptEventLike | null = null;
  showPwaInstallBanner = false;
  /** F-011：離線狀態提示列 */
  isOffline = false;
  showReconnectBanner = false;
  showUpdateBanner = false;
  attachmentThumbs: AttachmentThumb[] = [];
  attachmentSelectionMode = false;
  /** 選檔寫入 IndexedDB 與重建預覽期間 */
  attachmentUploadBusy = false;
  /** 全站自訂確認（取代 window.confirm，配合無 Zone 變更偵測） */
  appConfirmOpen = false;
  appConfirmTitle = '請確認';
  appConfirmMessage = '';
  private appConfirmResolver: ((ok: boolean) => void) | null = null;
  selectedAttachmentIds: string[] = [];
  attachmentPreviewUrl = '';
  attachmentPreviewName = '';
  backupExportBusy = false;
  backupImportBusy = false;
  private reconnectBannerTimer: ReturnType<typeof window.setTimeout> | null = null;
  private attachmentDbPromise: Promise<IDBDatabase> | null = null;
  private attachmentObjectUrls: string[] = [];
  private readonly pwaInstallNeverKey = 'rental-buddy-pwa-install-never';
  private readonly pwaInstallSnoozeKey = 'rental-buddy-pwa-install-snooze-until';
  private readonly pwaInstallSnoozeMs = 7 * 24 * 60 * 60 * 1000;
  /** 進入主畫面後稍晚再顯示 PWA 提示，避免與首屏操作搶焦點 */
  private pwaInstallRevealTimer: ReturnType<typeof window.setTimeout> | null = null;
  private readonly pwaInstallRevealDelayMs = 1000;
  private mapInstance: L.Map | null = null;
  private mapMarker: L.CircleMarker | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly swUpdate: SwUpdate,
    private readonly appRef: ApplicationRef
  ) {
    this.loadState();
    this.loadFontScale();
    this.loadThemePalette();
  }

  ngOnInit(): void {
    this.isOffline = !navigator.onLine;
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.showUpdateBanner = true;
        }
      });
      this.swUpdate.unrecoverable.subscribe(() => {
        this.showUpdateBanner = true;
      });
    }
    this.tryShowPwaInstallBanner();
    this.reconcileLinkedChecklistFromProperty();
    this.saveState();
    void this.loadAttachmentThumbs();
  }

  startApp(): void {
    this.showIntro = false;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(this.tutorialStorageKey) === '1') {
      this.tryShowPwaInstallBanner();
    }
    this.scheduleFirstTutorialIfNeeded();
  }

  ngOnDestroy(): void {
    if (this.reconnectBannerTimer) {
      window.clearTimeout(this.reconnectBannerTimer);
      this.reconnectBannerTimer = null;
    }
    if (this.pwaInstallRevealTimer) {
      window.clearTimeout(this.pwaInstallRevealTimer);
      this.pwaInstallRevealTimer = null;
    }
    if (this.tutorialRevealTimer) {
      window.clearTimeout(this.tutorialRevealTimer);
      this.tutorialRevealTimer = null;
    }
    this.revokeAttachmentObjectUrls();
    this.destroyMapPicker();
  }

  get activeRecord(): HouseRecord {
    return this.records.find((record) => record.id === this.activeRecordId) ?? this.records[0];
  }

  get state(): Record<string, ItemState> {
    return this.activeRecord?.state ?? {};
  }

  get address(): string {
    return this.activeRecord?.address ?? '';
  }

  set address(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.address = value;
    this.touchActiveRecord();
  }

  get hasMapLocation(): boolean {
    return typeof this.activeRecord?.latitude === 'number' && typeof this.activeRecord?.longitude === 'number';
  }

  get mapLocationText(): string {
    if (!this.hasMapLocation) return '尚未選擇地圖位置';
    return `${this.activeRecord.latitude?.toFixed(5)}, ${this.activeRecord.longitude?.toFixed(5)}`;
  }

  get monthlyRent(): string {
    return this.activeRecord?.monthlyRent ?? '';
  }

  set monthlyRent(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.monthlyRent = value;
    this.touchActiveRecord();
  }

  get layoutType(): string {
    return this.activeRecord?.layoutType ?? '';
  }

  set layoutType(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutType = value;
    this.touchActiveRecord();
  }

  get layoutRooms(): string {
    return this.activeRecord?.layoutRooms ?? '';
  }

  set layoutRooms(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutRooms = value;
    this.touchActiveRecord();
  }

  get layoutLivingRooms(): string {
    return this.activeRecord?.layoutLivingRooms ?? '';
  }

  set layoutLivingRooms(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutLivingRooms = value;
    this.touchActiveRecord();
  }

  get layoutBathrooms(): string {
    return this.activeRecord?.layoutBathrooms ?? '';
  }

  set layoutBathrooms(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutBathrooms = value;
    this.touchActiveRecord();
  }

  get layoutKitchenType(): string {
    return this.activeRecord?.layoutKitchenType ?? '';
  }

  set layoutKitchenType(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutKitchenType = value;
    this.touchActiveRecord();
  }

  get layoutAreaPing(): string {
    return this.activeRecord?.layoutAreaPing ?? '';
  }

  set layoutAreaPing(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutAreaPing = value;
    this.touchActiveRecord();
  }

  get layoutNotes(): string {
    return this.activeRecord?.layoutNotes ?? '';
  }

  set layoutNotes(value: string) {
    if (!this.activeRecord) return;
    this.activeRecord.layoutNotes = value;
    this.touchActiveRecord();
  }

  /** 套房／雅房：多半不需填房廳衛；選取時自動收合輔助區 */
  get isSuiteLikeLayoutType(): boolean {
    const t = this.layoutType.trim();
    return t === '套房' || t === '雅房';
  }

  toggleOverviewLayoutExtra(event: Event): void {
    event.stopPropagation();
    this.overviewLayoutExtraExpanded = !this.overviewLayoutExtraExpanded;
    this.overviewDropdownOpen = null;
  }

  toggleOverviewPropertyMore(event: Event): void {
    event.stopPropagation();
    this.overviewPropertyMoreExpanded = !this.overviewPropertyMoreExpanded;
  }

  private applyLayoutTypeSideEffects(value: string): void {
    if (!this.activeRecord) return;
    const v = value.trim();
    if (v === '套房') {
      this.activeRecord.layoutRooms = '1';
      this.activeRecord.layoutLivingRooms = '0';
      this.activeRecord.layoutBathrooms = '1';
      this.activeRecord.layoutKitchenType = '無廚房';
      this.touchActiveRecord();
      return;
    }
    if (v === '雅房') {
      this.activeRecord.layoutRooms = '1';
      this.activeRecord.layoutLivingRooms = '0';
      this.activeRecord.layoutBathrooms = '0';
      this.activeRecord.layoutKitchenType = '無廚房';
      this.touchActiveRecord();
    }
  }

  onLayoutTypeCustomInput(value: string): void {
    if (!this.activeRecord) return;
    this.activeRecord.layoutType = value;
    this.applyLayoutTypeSideEffects(value);
    this.touchActiveRecord();
    this.cdr.detectChanges();
  }

  getPropertyChoiceValue(field: PropertyChoiceField): string {
    return this.activeRecord?.[field] ?? '';
  }

  setPropertyChoice(field: PropertyChoiceField, value: string): void {
    if (!this.activeRecord) return;
    this.activeRecord[field] = this.activeRecord[field] === value ? '' : value;
    this.syncChecklistFromPropertyChoice(field);
    this.touchActiveRecord();
  }

  get propertySummaryText(): string {
    const parts = [
      this.activeRecord?.buildingType,
      this.activeRecord?.floorLevel,
      this.activeRecord?.buildingAgeRange ? `屋齡${this.activeRecord.buildingAgeRange}` : '',
      this.activeRecord?.hasElevator ? `電梯${this.activeRecord.hasElevator}` : '',
      this.activeRecord?.hasManager ? `管理員${this.activeRecord.hasManager}` : '',
      this.activeRecord?.managementFeeType ? `管理費${this.activeRecord.managementFeeType}` : '',
      this.activeRecord?.depositMonths ? `押金${this.activeRecord.depositMonths}` : '',
      this.activeRecord?.minLeaseTerm ? `租期${this.activeRecord.minLeaseTerm}` : '',
      this.activeRecord?.canCook ? `開伙${this.activeRecord.canCook}` : '',
      this.activeRecord?.canPet ? `寵物${this.activeRecord.canPet}` : '',
      this.activeRecord?.subsidyAvailable ? `租補${this.activeRecord.subsidyAvailable}` : ''
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : '未填寫';
  }

  /** InBody Phase 3：房源條件 chips 與查核題 rb_001／rb_002／rb_023／rb_037／rb_025 連動（房源 → 查核） */
  private syncChecklistFromPropertyChoice(field: PropertyChoiceField): void {
    switch (field) {
      case 'depositMonths':
        this.syncDepositMonthsToLinked(this.activeRecord?.depositMonths ?? '');
        break;
      case 'managementFeeType':
        this.syncManagementFeeToLinked(this.activeRecord?.managementFeeType ?? '');
        break;
      case 'subsidyAvailable':
        this.syncSubsidyToLinked(this.activeRecord?.subsidyAvailable ?? '');
        break;
      case 'hasManager':
        this.syncHasManagerToLinked(this.activeRecord?.hasManager ?? '');
        break;
      case 'canCook':
      case 'canPet':
        this.syncCookPetToLinked();
        break;
      default:
        break;
    }
  }

  private syncDepositMonthsToLinked(months: string): void {
    const st = this.state['rb_002'];
    if (!st) return;
    if (!months) {
      st.selectedOptions = [];
      this.syncQuickStatusFromOptions(st);
      return;
    }
    st.selectedOptions = [months];
    this.syncQuickStatusFromOptions(st);
  }

  private syncManagementFeeToLinked(fee: string): void {
    const st = this.state['rb_023'];
    if (!st) return;
    const map: Record<string, string> = {
      含租金: '已含租金',
      另計: '另計固定金額',
      無: '已含租金',
      需確認: '另計不固定'
    };
    const mapped = fee ? map[fee] : '';
    if (!mapped) {
      st.selectedOptions = [];
      this.syncQuickStatusFromOptions(st);
      return;
    }
    st.selectedOptions = [mapped];
    this.syncQuickStatusFromOptions(st);
  }

  private syncSubsidyToLinked(subsidy: string): void {
    const st = this.state['rb_001'];
    if (!st) return;
    const map: Record<string, string> = {
      可申請: '房東願配合',
      不可: '不符合資格',
      需確認: '補助條件限制'
    };
    const mapped = subsidy ? map[subsidy] : '';
    if (!mapped) {
      st.selectedOptions = [];
      this.syncQuickStatusFromOptions(st);
      return;
    }
    st.selectedOptions = [mapped];
    this.syncQuickStatusFromOptions(st);
  }

  private syncHasManagerToLinked(manager: string): void {
    const st = this.state['rb_037'];
    if (!st) return;
    if (!manager) {
      st.selectedOptions = [];
      this.syncQuickStatusFromOptions(st);
      return;
    }
    const map: Record<string, string> = {
      有: '有管理員',
      無: '無管理員',
      不確定: '白天管理員'
    };
    st.selectedOptions = [map[manager] ?? ''];
    this.syncQuickStatusFromOptions(st);
  }

  /** 房源「開伙／寵物」與查核 rb_025 同步（不覆寫備註；細節 chip 另由使用者點選） */
  private syncCookPetToLinked(): void {
    const record = this.activeRecord;
    if (!record) return;
    const st = this.state['rb_025'];
    if (!st) return;
    const cook = record.canCook;
    const pet = record.canPet;
    if (!cook && !pet) {
      return;
    }
    const bad = cook === '不可' || pet === '不可';
    const uncertain = cook === '需確認' || pet === '需確認';
    if (bad) {
      st.flagged = true;
      st.checked = false;
      st.quickStatus = 'attention';
    } else if (!cook || !pet || uncertain) {
      st.flagged = false;
      st.checked = false;
      st.quickStatus = 'unknown';
    } else {
      st.flagged = false;
      st.checked = true;
      st.quickStatus = 'good';
    }
  }

  /** 切換紀錄後以房源欄位為準，對齊連動查核項 */
  private reconcileLinkedChecklistFromProperty(): void {
    const record = this.activeRecord;
    if (!record) return;
    this.syncDepositMonthsToLinked(record.depositMonths);
    this.syncManagementFeeToLinked(record.managementFeeType);
    this.syncSubsidyToLinked(record.subsidyAvailable);
    this.syncHasManagerToLinked(record.hasManager);
    this.syncCookPetToLinked();
  }

  /** 查核細節選項 → 回填房源條件（與 syncChecklistFromPropertyChoice 互補） */
  private syncPropertyFieldsFromLinkedChecklist(itemId: string, itemState: ItemState): void {
    const record = this.activeRecord;
    if (!record) return;
    const pick = itemState.selectedOptions[itemState.selectedOptions.length - 1] ?? '';

    if (itemId === 'rb_002') {
      record.depositMonths = pick;
      return;
    }
    if (itemId === 'rb_037') {
      const rev: Record<string, string> = {
        有管理員: '有',
        '24 小時管理': '有',
        白天管理員: '有',
        無管理員: '無'
      };
      record.hasManager = pick ? rev[pick] ?? '不確定' : '';
      return;
    }
    if (itemId === 'rb_023') {
      const rev: Record<string, string> = {
        已含租金: '含租金',
        另計固定金額: '另計',
        另計不固定: '需確認',
        項目不明: '需確認'
      };
      record.managementFeeType = pick ? rev[pick] ?? '' : '';
      return;
    }
    if (itemId === 'rb_001') {
      const rev: Record<string, string> = {
        房東願配合: '可申請',
        房東不配合: '不可',
        不符合資格: '不可',
        補助條件限制: '需確認'
      };
      record.subsidyAvailable = pick ? rev[pick] ?? '' : '';
      return;
    }
    if (itemId === 'rb_025') {
      const sel = new Set(itemState.selectedOptions);
      if (sel.has('禁止寵物')) record.canPet = '不可';
      else if (sel.has('可養寵物')) record.canPet = '可';
      if (sel.has('禁止明火')) record.canCook = '不可';
      else if (sel.has('可開伙')) record.canCook = '可';
      return;
    }
  }

  get activeAttachments(): AttachmentMeta[] {
    return this.activeRecord?.attachments ?? [];
  }

  get activeAttachmentCount(): number {
    return this.activeAttachments.length;
  }

  get activeAttachmentRemaining(): number {
    return Math.max(0, this.attachmentLimit - this.activeAttachmentCount);
  }

  get reportAttachmentExtraCount(): number {
    return Math.max(0, this.activeAttachmentCount - this.attachmentThumbs.length);
  }

  get hasSelectedAttachments(): boolean {
    return this.selectedAttachmentIds.length > 0;
  }

  get compareRecords(): HouseRecord[] {
    return this.compareIds
      .map((id) => this.records.find((record) => record.id === id))
      .filter((record): record is HouseRecord => Boolean(record));
  }

  get canCompare(): boolean {
    return this.compareRecords.length >= 2;
  }

  get chartRecords(): HouseRecord[] {
    const ids = [this.activeRecord.id, ...this.compareRecords.map((r) => r.id)];
    const uniqIds = Array.from(new Set(ids)).slice(0, 3);
    return uniqIds
      .map((id) => this.records.find((record) => record.id === id))
      .filter((record): record is HouseRecord => Boolean(record));
  }

  get itemsInChecklistScope(): ChecklistItem[] {
    if (this.checklistScopeMode === 'compact') {
      return this.items.filter((item) => item.riskTier === 'must');
    }
    if (this.checklistScopeMode === 'standard') {
      return this.items.filter((item) => item.riskTier === 'must' || item.riskTier === 'should');
    }
    return this.items;
  }

  /** 查核表頁頂進度條：依目前範圍內已確認比例 */
  get headerProgressPercent(): number {
    if (this.currentPage !== 'checklist') {
      return this.progressPercent;
    }
    const total = this.checklistBarTotal;
    if (total === 0) return 0;
    return Math.round((this.checklistBarConfirmed / total) * 100);
  }

  /** 範圍內：已勾選或已標記問題（與底部「已確認」chip 一致） */
  get checklistBarConfirmed(): number {
    return this.itemsInChecklistScope.filter(
      (item) => this.state[item.id]?.checked || this.state[item.id]?.flagged
    ).length;
  }

  get checklistBarFlagged(): number {
    return this.itemsInChecklistScope.filter((item) => this.state[item.id]?.flagged).length;
  }

  get checklistBarLeft(): number {
    return this.itemsInChecklistScope.filter(
      (item) => !this.state[item.id]?.checked && !this.state[item.id]?.flagged
    ).length;
  }

  get checklistBarTotal(): number {
    return this.itemsInChecklistScope.length;
  }

  setFontScale(scale: FontScale): void {
    if (this.fontScale === scale) return;
    this.fontScale = scale;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.fontScaleStorageKey, scale);
    }
    this.applyFontScaleToDocument();
    this.cdr.markForCheck();
  }

  setThemePalette(palette: ThemePaletteOption): void {
    if (palette !== 'warm') return;
    if (this.themePalette === palette) return;
    this.themePalette = palette;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.themeStorageKey, palette);
    }
    this.applyThemePaletteToDocument();
    this.cdr.markForCheck();
  }

  private loadThemePalette(): void {
    if (typeof localStorage === 'undefined') {
      this.applyThemePaletteToDocument();
      return;
    }
    const saved = localStorage.getItem(this.themeStorageKey);
    if (saved === 'warm') {
      this.themePalette = 'warm';
    }
    this.applyThemePaletteToDocument();
  }

  private applyThemePaletteToDocument(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', this.themePalette);
  }

  private loadFontScale(): void {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.fontScaleStorageKey);
      if (saved === 'sm' || saved === 'md' || saved === 'lg') {
        this.fontScale = saved;
      }
    }
    this.applyFontScaleToDocument();
  }

  private applyFontScaleToDocument(): void {
    if (typeof document === 'undefined') return;
    const pxByScale: Record<FontScale, number> = { sm: 16, md: 18, lg: 20 };
    document.documentElement.setAttribute('data-font-scale', this.fontScale);
    document.documentElement.style.fontSize = `${pxByScale[this.fontScale]}px`;
  }

  setChecklistScopeMode(mode: ChecklistScopeMode): void {
    if (this.checklistScopeMode === mode) return;
    this.checklistScopeMode = mode;
    this.saveState();
  }

  get checklistScopeModeLabel(): string {
    if (this.checklistScopeMode === 'compact') return '精簡';
    if (this.checklistScopeMode === 'standard') return '標準';
    return '完整';
  }

  get currentTutorialStep(): TutorialStepDef | null {
    return this.tutorialSteps[this.tutorialStepIndex] ?? null;
  }

  get isLastTutorialStep(): boolean {
    return this.tutorialStepIndex >= this.tutorialSteps.length - 1;
  }

  tutorialAnchorActive(anchorId: string): boolean {
    const step = this.currentTutorialStep;
    return Boolean(this.tutorialOpen && step?.anchorId === anchorId);
  }

  /** 教學「查核題目」步：示範題掛固定 id，聚光燈／捲動對準該題而非整塊清單 */
  readonly tutorialChecklistDemoDomId = 'tutorial-anchor-checklist-demo-item';

  tutorialChecklistDemoArticleId(itemId: string): string | null {
    if (!this.tutorialOpen || this.tutorialStepIndex !== this.tutorialChecklistDemoStepIndex) return null;
    return this.filteredItems[0]?.id === itemId ? this.tutorialChecklistDemoDomId : null;
  }

  private scheduleFirstTutorialIfNeeded(): void {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(this.tutorialStorageKey) === '1') return;
    if (this.tutorialRevealTimer) {
      window.clearTimeout(this.tutorialRevealTimer);
      this.tutorialRevealTimer = null;
    }
    this.tutorialRevealTimer = window.setTimeout(() => {
      this.tutorialRevealTimer = null;
      if (this.showIntro || this.appConfirmOpen || this.tutorialOpen) return;
      this.beginTutorial();
    }, 950);
  }

  beginTutorial(): void {
    if (this.pwaInstallRevealTimer) {
      window.clearTimeout(this.pwaInstallRevealTimer);
      this.pwaInstallRevealTimer = null;
    }
    this.showPwaInstallBanner = false;
    this.tutorialOpen = true;
    this.tutorialStepIndex = 0;
    this.tutorialPanelEdge = 'bottom';
    this.tutorialDimMode = 'full';
    this.clearTutorialAutoExpandedItem();
    this.currentPage = 'checklist';
    this.closeChecklistFilterPanel();
    this.closeMapPicker();
    this.applyTutorialUiForStep();
    this.focusTutorialAnchorSoon();
    this.cdr.markForCheck();
  }

  replayTutorial(): void {
    this.closeRecordMenu();
    this.beginTutorial();
  }

  finishTutorial(markCompleted: boolean): void {
    this.clearTutorialAutoExpandedItem();
    this.closeRecordMenu();
    this.tutorialOpen = false;
    this.tutorialDimMode = 'off';
    if (markCompleted && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tutorialStorageKey, '1');
    }
    this.cdr.markForCheck();
    this.scrollAppToTop();
    this.tryShowPwaInstallBanner(true);
  }

  /** 教學結束後回到頁面頂部（與點 logo 相同） */
  private scrollAppToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tutorialNext(): void {
    if (this.isLastTutorialStep) {
      this.finishTutorial(true);
      return;
    }
    this.tutorialStepIndex += 1;
    this.tutorialDimMode = 'full';
    this.applyTutorialUiForStep();
    this.applyTutorialChecklistDemoExpand();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.focusTutorialAnchorSoon();
  }

  tutorialPrevious(): void {
    if (this.tutorialStepIndex <= 0) return;
    this.tutorialStepIndex -= 1;
    this.tutorialDimMode = 'full';
    this.applyTutorialUiForStep();
    this.applyTutorialChecklistDemoExpand();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.focusTutorialAnchorSoon();
  }

  tutorialSkip(): void {
    this.finishTutorial(true);
  }

  private focusTutorialAnchorSoon(): void {
    window.setTimeout(() => {
      const id = this.currentTutorialStep?.anchorId;
      if (!id) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.flushTutorialLayoutAfterScroll();
        return;
      }
      const el = document.getElementById(id);
      let scrollTarget: Element | null = el;
      if (id === 'tutorial-anchor-record-menu' && this.isRecordMenuOpen) {
        scrollTarget = document.querySelector('.record-menu-panel') ?? el;
      }
      if (id === 'tutorial-anchor-checklist-body' && this.tutorialStepIndex === this.tutorialChecklistDemoStepIndex) {
        scrollTarget =
          document.getElementById(this.tutorialChecklistDemoDomId) ?? el?.querySelector('article.check-item') ?? el;
      }
      scrollTarget?.scrollIntoView({ block: 'center', behavior: 'auto' });
      this.flushTutorialLayoutAfterScroll();
    }, 0);
  }

  /** 捲動後等版面繪製再量測洞與浮層，避免聚光燈與錨點圈選不同步或跑版 */
  private flushTutorialLayoutAfterScroll(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.updateTutorialPanelPlacement();
      });
    });
  }

  private clearTutorialAutoExpandedItem(): void {
    const demo = this.tutorialAutoExpandedItemId;
    this.tutorialAutoExpandedItemId = null;
    if (!demo || !this.state[demo]) return;
    if (this.state[demo].expanded) {
      this.state[demo].expanded = false;
      this.touchActiveRecord();
    }
  }

  /** 教學「查核題目」步：自動展開清單第一題；離開該步時收合 */
  private applyTutorialChecklistDemoExpand(): void {
    this.clearTutorialAutoExpandedItem();
    if (!this.tutorialOpen || this.tutorialStepIndex !== this.tutorialChecklistDemoStepIndex) return;
    const first = this.filteredItems[0];
    if (first && this.state[first.id]) {
      this.state[first.id].expanded = true;
      this.tutorialAutoExpandedItemId = first.id;
      this.touchActiveRecord();
    }
  }

  /** 依目前步驟調整頁面、紀錄選單、篩選面板等，避免教學錨點不在 DOM 或與改版 UI 衝突 */
  private applyTutorialUiForStep(): void {
    if (!this.tutorialOpen) return;
    const anchor = this.currentTutorialStep?.anchorId;
    const checklistAnchors = new Set([
      'tutorial-anchor-site-header',
      'tutorial-anchor-record-menu',
      'tutorial-anchor-overview',
      'tutorial-anchor-toolbar',
      'tutorial-anchor-filter',
      'tutorial-anchor-checklist-body',
      'tutorial-anchor-footer',
      'tutorial-anchor-bottom-nav'
    ]);
    if ((anchor === null || checklistAnchors.has(anchor ?? '')) && this.currentPage !== 'checklist') {
      this.currentPage = 'checklist';
      this.closeMapPicker();
    }
    const openRecordMenu = this.tutorialStepIndex === this.tutorialRecordMenuStepIndex;
    this.isRecordMenuOpen = openRecordMenu;
    this.recordMenuRenameOpen = false;
    if (openRecordMenu) {
      this.syncEditingRecordName();
    }
    if (this.tutorialStepIndex !== this.tutorialFilterStepIndex) {
      this.closeChecklistFilterPanel();
    }
  }

  /** 貼底提示卡時避開底部導覽（改版後必開，否則會遮住導覽列） */
  get tutorialPanelAvoidBottomNav(): boolean {
    return this.tutorialOpen && this.tutorialPanelEdge === 'bottom' && !this.showIntro;
  }

  /** 完成度步：再避開查核進度列 */
  get tutorialPanelAvoidChecklistFooter(): boolean {
    return (
      this.tutorialPanelAvoidBottomNav &&
      this.currentPage === 'checklist' &&
      this.tutorialStepIndex > this.tutorialChecklistDemoStepIndex
    );
  }

  /** 底部導覽／完成度步改由版面演算法決定上下；其餘步驟貼底 */
  private isTutorialPanelForceBottom(): boolean {
    const anchor = this.currentTutorialStep?.anchorId;
    if (anchor === 'tutorial-anchor-bottom-nav' || anchor === 'tutorial-anchor-footer') {
      return false;
    }
    return this.tutorialStepIndex <= this.tutorialChecklistDemoStepIndex;
  }

  private tutorialBottomChromePx(): number {
    const root = document.documentElement;
    const nav = this.cssVarToPx(getComputedStyle(root).getPropertyValue('--app-bottom-nav-h'), 56);
    if (this.currentPage !== 'checklist' || this.showIntro) {
      return nav;
    }
    const stats = this.cssVarToPx(getComputedStyle(root).getPropertyValue('--checklist-stats-bar-h'), 64);
    return nav + stats;
  }

  private cssVarToPx(raw: string, fallback: number): number {
    const v = raw.trim();
    if (!v) return fallback;
    const rem = /^([\d.]+)rem$/i.exec(v);
    if (rem) {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return parseFloat(rem[1]) * rootPx;
    }
    const px = /^([\d.]+)px$/i.exec(v);
    if (px) return parseFloat(px[1]);
    return fallback;
  }

  private updateTutorialPanelPlacement(): void {
    if (!this.tutorialOpen) return;
    if (this.isTutorialPanelForceBottom()) {
      this.tutorialPanelEdge = 'bottom';
      this.cdr.markForCheck();
      this.updateTutorialDimLayout();
      return;
    }
    const id = this.currentTutorialStep?.anchorId;
    if (!id) {
      this.tutorialPanelEdge = 'bottom';
      this.cdr.markForCheck();
      this.updateTutorialDimLayout();
      return;
    }
    const el = document.getElementById(id);
    if (!el) {
      this.tutorialPanelEdge = 'bottom';
      this.cdr.markForCheck();
      this.updateTutorialDimLayout();
      return;
    }
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const bottomReserve = this.tutorialBottomChromePx() + 168;
    const bottomZoneTop = vh - bottomReserve;
    const anchorMidY = rect.top + rect.height / 2;
    const overlapsLowerUi = rect.bottom > bottomZoneTop - 4;
    const preferTop = overlapsLowerUi || anchorMidY > vh * 0.52;
    const topReserve = 150;
    const anchorMostlyInUpperBand = rect.bottom < topReserve + rect.height * 0.35;
    this.tutorialPanelEdge = preferTop && !anchorMostlyInUpperBand ? 'top' : 'bottom';
    this.cdr.markForCheck();
    this.updateTutorialDimLayout();
  }

  private updateTutorialDimLayout(): void {
    if (!this.tutorialOpen) {
      this.tutorialDimMode = 'off';
      this.tutorialHoleMaskPathD = '';
      return;
    }
    const id = this.currentTutorialStep?.anchorId;
    if (!id) {
      this.tutorialDimMode = 'full';
      this.tutorialHoleMaskPathD = '';
      this.cdr.markForCheck();
      return;
    }
    const el = document.getElementById(id);
    if (!el) {
      this.tutorialDimMode = 'full';
      this.tutorialHoleMaskPathD = '';
      this.cdr.markForCheck();
      return;
    }
    let holeTargetEl: Element = el;
    if (id === 'tutorial-anchor-checklist-body' && this.tutorialStepIndex === this.tutorialChecklistDemoStepIndex) {
      holeTargetEl =
        document.getElementById(this.tutorialChecklistDemoDomId) ??
        el.querySelector('article.check-item') ??
        el;
    } else if (id === 'tutorial-anchor-record-menu' && this.isRecordMenuOpen) {
      holeTargetEl = document.querySelector('.record-menu-panel') ?? el;
    }
    const holeEl = holeTargetEl as HTMLElement;
    const rect = holeEl.getBoundingClientRect();
    const { expandOuter, borderRadiusPx } = this.readTutorialSpotOutlineMetrics(holeEl);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let l = rect.left - expandOuter;
    let t = rect.top - expandOuter;
    let w = rect.width + expandOuter * 2;
    let h = rect.height + expandOuter * 2;
    l = Math.max(0, Math.min(l, vw - 48));
    t = Math.max(0, Math.min(t, vh - 48));
    w = Math.min(Math.max(w, 32), vw - l);
    h = Math.min(Math.max(h, 32), vh - t);
    if (w < 28 || h < 28) {
      this.tutorialDimMode = 'full';
      this.tutorialHoleMaskPathD = '';
      this.cdr.markForCheck();
      return;
    }
    this.tutorialDimTopH = t;
    this.tutorialDimLeftW = l;
    this.tutorialDimHoleT = t;
    this.tutorialDimHoleL = l;
    this.tutorialDimHoleW = w;
    this.tutorialDimHoleH = h;
    this.tutorialDimRightLeft = l + w;
    this.tutorialDimRightW = Math.max(0, vw - l - w);
    this.tutorialDimBottomT = t + h;
    this.tutorialDimBottomH = Math.max(0, vh - t - h);
    this.tutorialViewportW = vw;
    this.tutorialViewportH = vh;
    const rxHole = Math.max(
      0,
      Math.min(borderRadiusPx + expandOuter, w / 2 - 0.0001, h / 2 - 0.0001)
    );
    this.tutorialDimHoleRx = rxHole;
    this.tutorialHoleMaskPathD = this.tutorialRoundedRectMaskPathD(l, t, w, h, rxHole);
    this.tutorialDimMode = 'hole';
    this.cdr.markForCheck();
  }

  /** 讀取圈選樣式：outline-offset ≥0 時洞外擴；負 offset（畫在內側）時洞＝border box，避免貼邊裁切 */
  private readTutorialSpotOutlineMetrics(el: HTMLElement): {
    expandOuter: number;
    borderRadiusPx: number;
  } {
    const cs = window.getComputedStyle(el);
    let ow = this.parseCssLengthPx(cs.outlineWidth, 0);
    let oo = this.parseCssLengthPx(cs.outlineOffset, -3);
    if (ow <= 0) ow = 3;
    const expandOuter = oo >= 0 ? oo + ow : 0;
    const brRaw = (cs.borderRadius ?? '').trim();
    let borderRadiusPx = 14;
    if (brRaw && brRaw !== '0px') {
      const firstToken = brRaw.split(/\s+/)[0] ?? brRaw;
      borderRadiusPx = this.parseCssLengthPx(firstToken, 14);
    }
    return { expandOuter, borderRadiusPx };
  }

  private parseCssLengthPx(value: string, fallback: number): number {
    if (!value) return fallback;
    const v = value.trim().toLowerCase();
    if (v === 'medium') return 3;
    const m = /^(-?[\d.]+)px$/i.exec(v);
    if (m) {
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : fallback;
    }
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** SVG mask 用圓角矩形 path（順時針封閉） */
  private tutorialRoundedRectMaskPathD(x: number, y: number, w: number, h: number, rxIn: number): string {
    const r = Math.max(0, Math.min(rxIn, w / 2, h / 2));
    const x0 = x;
    const y0 = y;
    if (r <= 0) {
      return `M${x0},${y0} H${x0 + w} V${y0 + h} H${x0} Z`;
    }
    const rr = +r.toFixed(4);
    const x1 = +(x0 + rr).toFixed(4);
    const x2 = +(x0 + w - rr).toFixed(4);
    const x3 = +(x0 + w).toFixed(4);
    const y1 = +(y0 + rr).toFixed(4);
    const y2 = +(y0 + h - rr).toFixed(4);
    const y3 = +(y0 + h).toFixed(4);
    return `M${x1},${y0} H${x2} A${rr},${rr} 0 0 1 ${x3},${y1} V${y2} A${rr},${rr} 0 0 1 ${x2},${y3} H${x1} A${rr},${rr} 0 0 1 ${x0},${y2} V${y1} A${rr},${rr} 0 0 1 ${x1},${y0} Z`;
  }

  @HostListener('window:resize')
  onWindowResizeForTutorial(): void {
    if (this.tutorialOpen) {
      this.updateTutorialPanelPlacement();
    }
  }

  get filteredItems(): ChecklistItem[] {
    const scoped = this.itemsInChecklistScope;
    const baseItems =
      this.selectedCategoryIds.length === 0
        ? scoped
        : scoped.filter((item) => this.selectedCategoryIds.includes(item.cat));
    if (this.activeChecklistFilters.length === 0) return baseItems;
    return baseItems.filter((item) => this.matchesChecklistFilters(item));
  }

  get groupedItems(): Array<{ cat: string; items: ChecklistItem[] }> {
    if (this.selectedCategoryIds.length === 0) {
      const groups = new Map<string, ChecklistItem[]>();
      this.filteredItems.forEach((item) => {
        const list = groups.get(item.cat) ?? [];
        list.push(item);
        groups.set(item.cat, list);
      });
      return Array.from(groups.entries()).map(([cat, items]) => ({ cat, items }));
    }
    return this.selectedCategoryIds
      .map((cat) => ({
        cat,
        items: this.filteredItems.filter((item) => item.cat === cat)
      }))
      .filter((g) => g.items.length > 0);
  }

  get totalCount(): number {
    return this.items.length;
  }

  get doneCount(): number {
    return this.countDoneForRecord(this.activeRecord);
  }

  get flaggedCount(): number {
    return this.countFlaggedForRecord(this.activeRecord);
  }

  /** 已確認 = 已勾選 + 已標記問題 */
  get confirmedCount(): number {
    return this.doneCount + this.flaggedCount;
  }

  get leftCount(): number {
    return this.totalCount - this.confirmedCount;
  }

  get progressPercent(): number {
    return Math.round((this.confirmedCount / this.totalCount) * 100);
  }

  /** 100 分制：房源品質分數，採五分類加權平均（見 `categoryScoreWeightByAxis`） */
  get reportScore100(): number {
    return this.getRecordScore(this.activeRecord);
  }

  /** 僅供匯出 JSON（AI／外部處理），不在畫面上顯示 */
  get reportOverallCategoryWeights(): Array<{ axisId: string; label: string; weight: number }> {
    return this.radarAxisIds.map((axisId) => ({
      axisId,
      label: this.categoryMap[axisId] ?? axisId,
      weight: this.categoryScoreWeightByAxis[axisId]
    }));
  }

  get reportConfidencePercent(): number {
    return this.getRecordConfidencePercent(this.activeRecord);
  }

  get reportConfidenceLabel(): string {
    if (this.reportConfidencePercent >= 80) return '資料完整';
    if (this.reportConfidencePercent >= 50) return '資料尚可';
    return '資料不足';
  }

  get reportConfidenceHint(): string {
    const pendingHighRiskCount = this.getRecordPendingHighRiskItems(this.activeRecord).length;
    if (pendingHighRiskCount > 0) {
      return `仍有 ${pendingHighRiskCount} 個高權重項目待確認`;
    }
    if (this.reportConfidencePercent >= 80) return '目前資料足以支撐初步判斷';
    return '建議補齊關鍵項目後再下結論';
  }

  get candidateAverageScore(): number | null {
    const activeId = this.activeRecord.id;
    const fromCompare = this.compareIds
      .filter((id) => id !== activeId)
      .map((id) => this.records.find((r) => r.id === id))
      .filter((r): r is HouseRecord => Boolean(r));
    if (fromCompare.length > 0) {
      const total = fromCompare.reduce((sum, r) => sum + this.getRecordScore(r), 0);
      return Math.round(total / fromCompare.length);
    }
    const fallback = this.records.filter((record) => {
      if (record.id === activeId) return false;
      return this.countDoneForRecord(record) + this.countFlaggedForRecord(record) > 0;
    });
    if (fallback.length === 0) return null;
    const total = fallback.reduce((sum, record) => sum + this.getRecordScore(record), 0);
    return Math.round(total / fallback.length);
  }

  /** Phase 6：是否有有效「比較清單」紀錄可供計算平均 */
  get candidateAverageUsesCompareList(): boolean {
    const activeId = this.activeRecord.id;
    return this.compareIds.some((id) => id !== activeId && this.records.some((r) => r.id === id));
  }

  get candidateAverageBasis(): 'compare_list' | 'other_records' | 'none' {
    if (this.candidateAverageScore === null) return 'none';
    return this.candidateAverageUsesCompareList ? 'compare_list' : 'other_records';
  }

  /** 說明計算方式；勿解讀為市場行情 */
  get candidateAverageHint(): string {
    const activeId = this.activeRecord.id;
    const fromCompare = this.compareIds
      .filter((id) => id !== activeId)
      .map((id) => this.records.find((r) => r.id === id))
      .filter((r): r is HouseRecord => Boolean(r));
    if (fromCompare.length > 0) {
      return `依比較清單 ${fromCompare.length} 筆計算（非市場平均）`;
    }
    if (this.candidateAverageScore === null) {
      return '請加入比較房源或於其他紀錄勾選查核後再試';
    }
    const n = this.records.filter(
      (r) => r.id !== activeId && this.countDoneForRecord(r) + this.countFlaggedForRecord(r) > 0
    ).length;
    return `依其他 ${n} 筆有進度紀錄概估（未指定比較清單；非市場平均）`;
  }

  get candidateAverageLabel(): string {
    return this.candidateAverageScore === null ? '資料不足' : `${this.candidateAverageScore}`;
  }

  /** A/B/C：A = 可優先、B = 可考慮、C = 需謹慎 */
  get reportGrade(): 'A' | 'B' | 'C' {
    const score = this.reportScore100;
    if (score >= 85) return 'A';
    if (score >= 65) return 'B';
    return 'C';
  }

  get reportGradeText(): string {
    if (this.reportGrade === 'A') return '條件完整，建議優先考慮';
    if (this.reportGrade === 'B') return '條件中上，可列入候選';
    return '風險偏高，需謹慎評估';
  }

  get reportRiskLevel(): 'low' | 'medium' | 'high' {
    const flaggedRatio = this.flaggedCount / Math.max(this.totalCount, 1);
    if (this.reportScore100 >= 80 && flaggedRatio <= 0.15) return 'low';
    if (this.reportScore100 >= 60 && flaggedRatio <= 0.3) return 'medium';
    return 'high';
  }

  get reportRiskLevelLabel(): string {
    if (this.reportRiskLevel === 'low') return '低風險';
    if (this.reportRiskLevel === 'medium') return '中風險';
    return '高風險';
  }

  get reportKeyRiskSummary(): string {
    const weak = this.reportWeakCategoryLabels.slice(0, 3);
    if (weak.length === 0) return '目前未出現明顯高風險分類';
    return weak.join('、');
  }

  get reportDecisionTitle(): string {
    if (this.reportRiskLevel === 'low') return '建議：優先考慮';
    if (this.reportRiskLevel === 'medium') return '建議：列入候選，議價後再決定';
    return '建議：暫緩決定，優先比較其他房源';
  }

  get reportDecisionDesc(): string {
    if (this.reportRiskLevel === 'low') {
      return this.leftCount > 0
        ? `整體條件穩定，建議補完剩餘 ${this.leftCount} 項確認後進入談約。`
        : '整體條件穩定，可優先進入談約與租約條款確認。';
    }
    if (this.reportRiskLevel === 'medium') {
      return `主要風險在 ${this.reportKeyRiskSummary}，建議先談可改善項目與租金條件再評估。`;
    }
    return `風險集中在 ${this.reportKeyRiskSummary}，建議避免直接簽約，先找替代房源比對。`;
  }

  get flaggedItems(): ChecklistItem[] {
    return this.items.filter((item) => this.state[item.id]?.flagged);
  }

  isCategorySelected(catId: string): boolean {
    return this.selectedCategoryIds.includes(catId);
  }

  toggleCategory(catId: string): void {
    const idx = this.selectedCategoryIds.indexOf(catId);
    if (idx === -1) {
      this.selectedCategoryIds = [...this.selectedCategoryIds, catId];
    } else {
      this.selectedCategoryIds = this.selectedCategoryIds.filter((id) => id !== catId);
    }
  }

  getCategoryDisplayLabel(catId: string): string {
    if (!catId) return `全部（${this.doneCount}/${this.totalCount}）`;
    const cat = this.categories.find((item) => item.id === catId);
    if (!cat) return '全部';
    return `${cat.label}（${this.countDoneByCategory(cat.id)}）`;
  }

  setPage(page: 'checklist' | 'report' | 'settings'): void {
    if (page !== 'report') {
      this.reportToolsExpanded = false;
    }
    if (page !== 'checklist') {
      this.closeChecklistFilterPanel();
    }
    this.closeRecordMenu();
    this.currentPage = page;
    if (page === 'report') {
      void this.loadAttachmentThumbs();
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.cdr.markForCheck();
  }

  setReportViewMode(mode: 'friendly' | 'compact'): void {
    this.reportViewMode = mode;
  }

  onChecklistItemRowClick(id: string, event: Event): void {
    const el = event.target as HTMLElement | null;
    if (el?.closest('button, textarea, input, a, label, .item-note-wrap')) return;
    const current = this.state[id];
    if (!current) return;
    current.expanded = !current.expanded;
    this.touchActiveRecord();
  }

  toggleExpand(id: string, event: Event): void {
    event.stopPropagation();
    const current = this.state[id];
    if (!current) return;
    current.expanded = !current.expanded;
    this.touchActiveRecord();
  }

  updateItemNote(id: string, note: string): void {
    const current = this.state[id];
    if (!current) return;
    current.note = note;
    this.touchActiveRecord();
  }

  setItemQuickStatus(id: string, status: QuickStatus, event: Event): void {
    event.stopPropagation();
    const current = this.state[id];
    if (!current) return;
    if (current.quickStatus === status) {
      current.selectedOptions = [];
      this.syncQuickStatusFromOptions(current);
      if (this.propertySyncChecklistIds.has(id)) {
        this.syncPropertyFieldsFromLinkedChecklist(id, current);
      }
      this.touchActiveRecord();
      return;
    }
    current.quickStatus = status;
    current.checked = status === 'good' || status === 'ok';
    current.flagged = status === 'attention' || status === 'bad';
    this.touchActiveRecord();
  }

  getItemOptions(id: string): string[] {
    return this.itemOptionConfig[id] ?? [];
  }

  getItemNotePlaceholder(id: string): string {
    const row = this.items.find((it) => it.id === id);
    return row?.notePlaceholder ?? '補充現場觀察或待釐清事項';
  }

  /**
   * InBody Phase 2：`answerType` 為查核項結構化輸入類型（同步於 AI JSON）。
   * - `multiSelect`：具細節 chips，`answers`／`selectedOptions` 為複選結果。
   * - `singleSelect`：無細節 chips，以快速狀態四選一為主要結構化輸入。
   */
  getItemAnswerType(id: string): ChecklistAnswerType {
    return this.itemOptionConfig[id]?.length ? 'multiSelect' : 'singleSelect';
  }

  toggleItemOption(id: string, option: string, event: Event): void {
    event.stopPropagation();
    const current = this.state[id];
    if (!current) return;
    const selected = new Set(current.selectedOptions ?? []);
    if (selected.has(option)) {
      selected.delete(option);
    } else {
      selected.add(option);
    }
    current.selectedOptions = Array.from(selected);
    this.syncQuickStatusFromOptions(current);
    if (this.propertySyncChecklistIds.has(id)) {
      this.syncPropertyFieldsFromLinkedChecklist(id, current);
    }
    this.touchActiveRecord();
  }

  isRiskOption(option: string): boolean {
    if (this.nonRiskDetailOptions.has(option)) return false;
    return this.riskOptionKeywords.some((keyword) => option.includes(keyword));
  }

  countDoneByCategory(cat: string): string {
    const items = this.itemsInChecklistScope.filter((item) => item.cat === cat);
    if (items.length === 0) return '—';
    const confirmed = items.filter(
      (item) => this.state[item.id]?.checked || this.state[item.id]?.flagged
    ).length;
    return `${confirmed}/${items.length}`;
  }

  private closeRecordMenu(): void {
    this.isRecordMenuOpen = false;
    this.recordMenuRenameOpen = false;
  }

  switchRecord(recordId: string): void {
    if (!this.records.some((record) => record.id === recordId)) return;
    this.closeMapPicker();
    this.clearAttachmentUiState();
    this.activeRecordId = recordId;
    this.syncEditingRecordName();
    this.reconcileLinkedChecklistFromProperty();
    this.closeRecordMenu();
    this.overviewDropdownOpen = null;
    this.overviewLayoutExtraExpanded = false;
    this.overviewPropertyMoreExpanded = false;
    this.saveState();
    void this.loadAttachmentThumbs();
  }

  toggleRecordMenu(event: Event): void {
    event.stopPropagation();
    if (this.isRecordMenuOpen) {
      this.closeRecordMenu();
      this.cdr.markForCheck();
      return;
    }
    this.isRecordMenuOpen = true;
    this.recordMenuRenameOpen = false;
    this.syncEditingRecordName();
    this.isCategoryMenuOpen = false;
    this.overviewDropdownOpen = null;
    this.cdr.markForCheck();
  }

  toggleRecordMenuRename(): void {
    this.recordMenuRenameOpen = !this.recordMenuRenameOpen;
    if (this.recordMenuRenameOpen) {
      this.syncEditingRecordName();
    }
    this.cdr.markForCheck();
  }

  selectRecordOption(recordId: string): void {
    this.switchRecord(recordId);
  }

  toggleCategoryMenu(event: Event): void {
    event.stopPropagation();
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
    if (this.isCategoryMenuOpen) {
      this.closeRecordMenu();
    }
  }

  selectCategoryOption(catId: string): void {
    this.selectedCategoryIds = [catId];
    this.isCategoryMenuOpen = false;
  }

  toggleChecklistFilterPanel(): void {
    if (this.checklistFilterPanelOpen) {
      this.closeChecklistFilterPanel();
      return;
    }
    this.checklistFilterPanelOpen = true;
    this.draftChecklistFilters = [...this.activeChecklistFilters];
  }

  closeChecklistFilterPanel(): void {
    this.checklistFilterPanelOpen = false;
    this.draftChecklistFilters = [...this.activeChecklistFilters];
  }

  toggleChecklistFilter(filterId: ChecklistFilterId): void {
    const selected = new Set(this.draftChecklistFilters);
    if (selected.has(filterId)) {
      selected.delete(filterId);
    } else {
      selected.add(filterId);
    }
    this.draftChecklistFilters = Array.from(selected);
  }

  clearChecklistFilters(): void {
    if (this.checklistFilterPanelOpen) {
      this.draftChecklistFilters = [];
      return;
    }
    this.activeChecklistFilters = [];
    this.draftChecklistFilters = [];
  }

  applyChecklistFilters(): void {
    this.activeChecklistFilters = [...this.draftChecklistFilters];
    this.closeChecklistFilterPanel();
  }

  getFiltersByGroup(groupId: ChecklistFilterGroupId): Array<{ id: ChecklistFilterId; label: string; group: ChecklistFilterGroupId }> {
    return this.checklistFilterOptions.filter((option) => option.group === groupId);
  }

  openMapPicker(): void {
    this.showMapPicker = true;
    this.mapPickerStatus = this.hasMapLocation ? '可重新點選地圖更新位置。' : '點一下地圖，會自動帶入相似地址。';
    window.setTimeout(() => {
      this.initMapPicker();
      document.querySelector('.map-picker-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  openMapPickerFromReport(): void {
    this.setPage('checklist');
    this.openMapPicker();
  }

  closeMapPicker(): void {
    this.showMapPicker = false;
    this.destroyMapPicker();
  }

  onBrandClick(): void {
    this.closeMapPicker();
    this.closeRecordMenu();
    this.isCategoryMenuOpen = false;
    this.overviewDropdownOpen = null;
    this.overviewLayoutExtraExpanded = false;
    this.overviewPropertyMoreExpanded = false;
    this.showAiImportPanel = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleOverviewExtra(): void {
    this.overviewExtraExpanded = !this.overviewExtraExpanded;
    this.overviewDropdownOpen = null;
    if (!this.overviewExtraExpanded) {
      this.overviewLayoutExtraExpanded = false;
      this.overviewPropertyMoreExpanded = false;
    }
  }

  toggleOverviewNotesMedia(): void {
    this.overviewNotesMediaExpanded = !this.overviewNotesMediaExpanded;
    if (!this.overviewNotesMediaExpanded) {
      this.attachmentSelectionMode = false;
      this.selectedAttachmentIds = [];
      this.closeAttachmentPreview();
    }
  }

  toggleOverviewDropdown(which: 'layoutType' | 'kitchenType', event: Event): void {
    event.stopPropagation();
    this.overviewDropdownOpen = this.overviewDropdownOpen === which ? null : which;
  }

  pickOverviewLayoutType(value: string, event: Event): void {
    event.stopPropagation();
    this.layoutType = value;
    this.applyLayoutTypeSideEffects(value);
    this.overviewDropdownOpen = null;
    this.cdr.detectChanges();
  }

  pickOverviewKitchenType(value: string, event: Event): void {
    event.stopPropagation();
    this.layoutKitchenType = value;
    this.overviewDropdownOpen = null;
    this.cdr.detectChanges();
  }

  async locateCurrentPosition(): Promise<void> {
    if (!navigator.geolocation) {
      this.mapPickerStatus = '此裝置不支援定位，請改用地圖點選。';
      this.cdr.detectChanges();
      return;
    }
    this.zone.run(() => {
      this.isLocating = true;
      this.mapPickerStatus = '正在取得目前位置...';
    });
    this.cdr.detectChanges();
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => this.zone.run(() => resolve(pos)),
          (err) => this.zone.run(() => reject(err)),
          {
            enableHighAccuracy: true,
            timeout: 10000
          }
        );
      });
      await this.selectMapPoint(position.coords.latitude, position.coords.longitude);
      this.zone.run(() => {
        this.mapInstance?.setView([position.coords.latitude, position.coords.longitude], 17);
      });
    } catch {
      this.zone.run(() => {
        this.mapPickerStatus = '定位失敗，請確認權限後重試或直接點地圖。';
      });
    } finally {
      this.zone.run(() => {
        this.isLocating = false;
      });
      this.cdr.detectChanges();
    }
  }

  clearMapLocation(): void {
    if (!this.activeRecord) return;
    this.activeRecord.latitude = null;
    this.activeRecord.longitude = null;
    if (this.mapMarker && this.mapInstance) {
      this.mapInstance.removeLayer(this.mapMarker);
      this.mapMarker = null;
    }
    this.mapInstance?.setView(this.defaultMapCenter, 13);
    this.mapPickerStatus = '已清除地圖位置，可重新點選。';
    this.touchActiveRecord();
  }

  private initMapPicker(): void {
    const element = document.getElementById('mapPickerCanvas');
    if (!element) return;

    const center: L.LatLngTuple = this.hasMapLocation
      ? [this.activeRecord.latitude ?? this.defaultMapCenter[0], this.activeRecord.longitude ?? this.defaultMapCenter[1]]
      : this.defaultMapCenter;

    if (this.mapInstance) {
      this.mapInstance.setView(center, this.hasMapLocation ? 17 : 13);
      this.syncMapMarker();
      this.mapInstance.invalidateSize();
      return;
    }

    this.mapInstance = L.map(element, {
      zoomControl: true,
      attributionControl: true
    }).setView(center, this.hasMapLocation ? 17 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.mapInstance);

    this.mapInstance.on('click', (event: L.LeafletMouseEvent) => {
      this.zone.run(() => {
        void this.selectMapPoint(event.latlng.lat, event.latlng.lng);
      });
    });

    this.syncMapMarker();
    window.setTimeout(() => this.mapInstance?.invalidateSize(), 100);
  }

  private async selectMapPoint(lat: number, lng: number): Promise<void> {
    if (!this.activeRecord) return;

    this.zone.run(() => {
      this.activeRecord!.latitude = Number(lat.toFixed(6));
      this.activeRecord!.longitude = Number(lng.toFixed(6));
      this.syncMapMarker();
      this.mapPickerStatus = '正在查詢相似地址...';
      this.isReverseGeocoding = true;
    });

    try {
      const address = await this.reverseGeocode(lat, lng);
      this.zone.run(() => {
        if (!this.activeRecord) return;
        if (address) {
          this.activeRecord.address = address;
          this.mapPickerStatus = '已帶入相似地址，可再手動修正。';
        } else {
          this.mapPickerStatus = '已選擇位置，但沒有查到相似地址。';
        }
      });
    } catch {
      this.zone.run(() => {
        this.mapPickerStatus = '已選擇位置；地址反查暫時失敗，可手動輸入。';
      });
    } finally {
      this.zone.run(() => {
        this.isReverseGeocoding = false;
        this.touchActiveRecord();
      });
      this.cdr.detectChanges();
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      'accept-language': 'zh-TW'
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!response.ok) return '';
    const result = (await response.json()) as NominatimReverseResult;
    return result.display_name?.trim() ?? '';
  }

  private syncMapMarker(): void {
    if (!this.mapInstance || !this.hasMapLocation) return;
    const latLng: L.LatLngTuple = [this.activeRecord.latitude ?? 0, this.activeRecord.longitude ?? 0];
    if (!this.mapMarker) {
      this.mapMarker = L.circleMarker(latLng, {
        radius: 9,
        color: '#b05848',
        weight: 3,
        fillColor: '#d97b6c',
        fillOpacity: 0.9
      }).addTo(this.mapInstance);
      return;
    }
    this.mapMarker.setLatLng(latLng);
  }

  private destroyMapPicker(): void {
    this.mapMarker = null;
    if (!this.mapInstance) return;
    this.mapInstance.remove();
    this.mapInstance = null;
  }

  createRecord(): void {
    this.clearAttachmentUiState();
    const index = this.records.length + 1;
    const name = this.draftRecordName.trim() || `看房紀錄 ${index}`;
    const record: HouseRecord = {
      id: this.createId(),
      name,
      address: '',
      latitude: null,
      longitude: null,
      monthlyRent: '',
      layoutType: '',
      layoutRooms: '',
      layoutLivingRooms: '',
      layoutBathrooms: '',
      layoutKitchenType: '',
      layoutAreaPing: '',
      layoutNotes: '',
      buildingType: '',
      floorLevel: '',
      buildingAgeRange: '',
      hasElevator: '',
      hasManager: '',
      managementFeeType: '',
      depositMonths: '',
      minLeaseTerm: '',
      canCook: '',
      canPet: '',
      subsidyAvailable: '',
      attachments: [],
      aiReportContent: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: this.createEmptyState()
    };
    this.records.unshift(record);
    this.activeRecordId = record.id;
    this.draftRecordName = '';
    this.syncEditingRecordName();
    this.recordMenuRenameOpen = false;
    this.saveState();
    this.tryShowPwaInstallBanner();
    void this.loadAttachmentThumbs();
  }

  renameActiveRecord(): void {
    if (!this.activeRecord) return;
    const nextName = this.editingRecordName.trim();
    if (!nextName) {
      this.editingRecordName = this.activeRecord.name;
      return;
    }
    this.activeRecord.name = nextName;
    this.touchActiveRecord();
    this.recordMenuRenameOpen = false;
    this.cdr.markForCheck();
  }

  async deleteActiveRecord(): Promise<void> {
    if (this.records.length <= 1) {
      window.alert('至少需要保留一筆看房紀錄。');
      return;
    }
    if (!(await this.openAppConfirm(`確定要刪除「${this.activeRecord.name}」嗎？\n刪除後無法復原。`, '刪除紀錄'))) return;
    const removedId = this.activeRecordId;
    this.records = this.records.filter((record) => record.id !== removedId);
    this.compareIds = this.compareIds.filter((id) => id !== removedId);
    this.activeRecordId = this.records[0].id;
    this.syncEditingRecordName();
    this.saveState();
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  toggleCompareRecord(recordId: string): void {
    if (this.compareIds.includes(recordId)) {
      this.compareIds = this.compareIds.filter((id) => id !== recordId);
    } else {
      this.compareIds = [...this.compareIds, recordId];
    }
    this.saveState();
  }

  openReportPage(): void {
    this.setPage('report');
    this.reportViewMode = 'friendly';
  }

  async shareAppLink(): Promise<void> {
    const url = this.appShareUrl;
    const payload = {
      title: 'Rental Buddy',
      text: '看房查核清單，幫你租屋不踩雷',
      url
    };
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share(payload);
        this.settingsActionMessage = '已開啟分享';
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.settingsActionMessage = '已複製連結';
      } else {
        this.settingsActionMessage = url;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      this.settingsActionMessage = '分享失敗，請稍後再試';
    }
    this.cdr.markForCheck();
    window.setTimeout(() => {
      if (this.settingsActionMessage === '已開啟分享' || this.settingsActionMessage === '已複製連結') {
        this.settingsActionMessage = '';
        this.cdr.markForCheck();
      }
    }, 2200);
  }

  startTutorialFromSettings(): void {
    this.setPage('checklist');
    window.setTimeout(() => this.replayTutorial(), 0);
  }

  saveNow(): void {
    this.touchActiveRecord();
  }

  async resetAll(): Promise<void> {
    if (!(await this.openAppConfirm('將清除本筆紀錄的所有勾選、備註與戶型欄位。確定要重置嗎？', '重置查核'))) return;
    this.items.forEach((item) => {
      this.state[item.id] = {
        checked: false,
        flagged: false,
        expanded: false,
        note: '',
        quickStatus: 'unknown',
        selectedOptions: []
      };
    });
    this.activeRecord.address = '';
    this.activeRecord.monthlyRent = '';
    this.activeRecord.layoutType = '';
    this.activeRecord.layoutRooms = '';
    this.activeRecord.layoutLivingRooms = '';
    this.activeRecord.layoutBathrooms = '';
    this.activeRecord.layoutKitchenType = '';
    this.activeRecord.layoutAreaPing = '';
    this.activeRecord.layoutNotes = '';
    this.activeRecord.buildingType = '';
    this.activeRecord.floorLevel = '';
    this.activeRecord.buildingAgeRange = '';
    this.activeRecord.hasElevator = '';
    this.activeRecord.hasManager = '';
    this.activeRecord.managementFeeType = '';
    this.activeRecord.depositMonths = '';
    this.activeRecord.minLeaseTerm = '';
    this.activeRecord.canCook = '';
    this.activeRecord.canPet = '';
    this.activeRecord.subsidyAvailable = '';
    this.touchActiveRecord();
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  async onAttachmentFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (files.length === 0) return;

    const remaining = this.activeAttachmentRemaining;
    if (remaining <= 0) {
      window.alert(`每筆紀錄最多 ${this.attachmentLimit} 張附件。`);
      if (input) input.value = '';
      return;
    }

    const selected = files.slice(0, remaining).filter((file) => file.type.startsWith('image/'));
    if (selected.length === 0) {
      window.alert('請選擇圖片檔（jpg/png/webp 等）。');
      if (input) input.value = '';
      return;
    }

    const now = Date.now();
    this.zone.run(() => {
      this.attachmentUploadBusy = true;
      this.cdr.detectChanges();
    });
    try {
      for (const file of selected) {
        const attachmentId = this.createAttachmentId();
        await this.putAttachmentBlob(attachmentId, file);
        this.activeRecord.attachments.push({
          id: attachmentId,
          name: file.name,
          type: file.type || 'image/*',
          size: file.size,
          createdAt: now
        });
      }

      this.touchActiveRecord();
      if (input) input.value = '';
      this.clearAttachmentSelection();
      await this.loadAttachmentThumbs();
    } finally {
      this.attachmentUploadBusy = false;
      this.zone.run(() => {
        this.cdr.detectChanges();
        this.appRef.tick();
      });
    }
  }

  async requestRemoveAttachment(event: Event, attachmentId: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!(await this.openAppConfirm('刪除後無法復原。仍要移除此照片嗎？', '移除此照片'))) return;
    await this.removeAttachment(attachmentId);
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    const target = this.activeRecord.attachments.find((item) => item.id === attachmentId);
    if (!target) return;
    this.activeRecord.attachments = this.activeRecord.attachments.filter((item) => item.id !== attachmentId);
    await this.deleteAttachmentBlob(attachmentId);
    this.selectedAttachmentIds = this.selectedAttachmentIds.filter((id) => id !== attachmentId);
    this.touchActiveRecord();
    await this.loadAttachmentThumbs();
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  toggleAttachmentSelectionMode(): void {
    this.attachmentSelectionMode = !this.attachmentSelectionMode;
    if (!this.attachmentSelectionMode) {
      this.clearAttachmentSelection();
    }
  }

  toggleAttachmentSelected(attachmentId: string): void {
    if (!this.attachmentSelectionMode) return;
    const selected = new Set(this.selectedAttachmentIds);
    if (selected.has(attachmentId)) {
      selected.delete(attachmentId);
    } else {
      selected.add(attachmentId);
    }
    this.selectedAttachmentIds = Array.from(selected);
  }

  isAttachmentSelected(attachmentId: string): boolean {
    return this.selectedAttachmentIds.includes(attachmentId);
  }

  async removeSelectedAttachments(): Promise<void> {
    if (!this.hasSelectedAttachments) return;
    if (
      !(await this.openAppConfirm(
        `將刪除 ${this.selectedAttachmentIds.length} 張照片，且無法復原。`,
        '刪除附件'
      ))
    ) {
      return;
    }
    const selected = new Set(this.selectedAttachmentIds);
    this.activeRecord.attachments = this.activeRecord.attachments.filter((item) => !selected.has(item.id));
    for (const id of selected) {
      await this.deleteAttachmentBlob(id);
    }
    this.clearAttachmentSelection();
    this.attachmentSelectionMode = false;
    this.touchActiveRecord();
    await this.loadAttachmentThumbs();
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  openAttachmentPreview(thumb: AttachmentThumb): void {
    this.attachmentPreviewUrl = thumb.url;
    this.attachmentPreviewName = thumb.name;
  }

  closeAttachmentPreview(): void {
    this.attachmentPreviewUrl = '';
    this.attachmentPreviewName = '';
  }

  openAppConfirm(message: string, title = '請確認'): Promise<boolean> {
    return new Promise((resolve) => {
      this.zone.run(() => {
        this.appConfirmTitle = title;
        this.appConfirmMessage = message;
        this.appConfirmOpen = true;
        this.appConfirmResolver = resolve;
        this.cdr.detectChanges();
        this.appRef.tick();
      });
    });
  }

  closeAppConfirm(ok: boolean): void {
    if (!this.appConfirmOpen) return;
    this.appConfirmOpen = false;
    const r = this.appConfirmResolver;
    this.appConfirmResolver = null;
    this.appConfirmMessage = '';
    this.appConfirmTitle = '請確認';
    if (r) r(ok);
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  get reportLabel(): string {
    if (this.progressPercent >= 80) return '確認相當完整，可以好好評估這間';
    if (this.progressPercent >= 50) return '已確認大半，記得補完剩餘項目';
    return '還有不少項目未確認，建議再多看一輪';
  }

  get reportSummary(): string {
    if (this.flaggedCount === 0) {
      return '目前沒有標記問題，建議把剩餘項目也檢查完再做決定。';
    }
    return `目前有 ${this.flaggedCount} 個項目需注意，建議與房東逐項確認。`;
  }

  /** 報告頁螢幕版：根據房屋條件產生綜合評價（匯出正式版會隱藏） */
  get reportEvaluationTitle(): string {
    const weak = this.reportWeakCategoryLabels;
    const strong = this.reportStrongCategoryLabels;

    if (this.progressPercent < 35) return '資料不足，暫時不建議下結論';
    if (this.flaggedCount === 0 && this.progressPercent >= 85) return '非常合適的租屋選項';
    if (weak.length === 0 && strong.length >= 3 && this.progressPercent >= 70) return '整體條件均衡，值得優先考慮';
    if (weak.length > 0 && strong.length > 0) return `${weak[0]}需留意，${strong[0]}表現不錯`;
    if (weak.length > 0) return `${weak[0]}是主要風險`;
    if (this.progressPercent >= 60) return '條件大致達標，可以列入候選';
    return '條件尚未明朗，需要再確認';
  }

  get reportEvaluationDesc(): string {
    const weak = this.reportWeakCategoryLabels;
    const strong = this.reportStrongCategoryLabels;
    const pendingText = this.leftCount > 0 ? `另有 ${this.leftCount} 項尚未確認，建議補齊後再做最後決定。` : '';

    if (this.progressPercent < 35) {
      return `目前只完成 ${this.doneCount} 項，資訊還不足以判斷這間房是否合適。建議先補完合約、設備、安全與生活機能等關鍵項目。`;
    }

    if (this.flaggedCount === 0 && this.progressPercent >= 85) {
      return `各項標準大多達標，且目前沒有明顯問題，是非常合適的租屋選項。恭喜你，可以把這間列為高優先候選。${pendingText}`;
    }

    if (weak.includes('生活機能') && strong.length > 0) {
      return `生活機能不佳，但${this.formatCategoryList(strong)}表現不錯；如果你有自己的交通工具，或能接受通勤與採買成本，仍是可以考慮的選擇。${pendingText}`;
    }

    if (weak.includes('環境鄰居') && strong.length > 0) {
      return `環境與鄰居條件需要特別留意，但${this.formatCategoryList(strong)}相對加分；若噪音、鄰里或管理問題不是你的硬性地雷，可以列入備選。${pendingText}`;
    }

    if (weak.length > 0 && strong.length > 0) {
      return `${this.formatCategoryList(weak)}較不理想，但${this.formatCategoryList(strong)}表現不錯。若這些缺點能接受或可改善，這間仍有考慮空間；反之建議優先比較其他房源。${pendingText}`;
    }

    if (weak.length > 0) {
      return `${this.formatCategoryList(weak)}出現較多疑慮，這間房目前不宜直接決定。建議向房東確認原因、改善方式與是否能寫進合約。${pendingText}`;
    }

    if (strong.length > 0) {
      return `${this.formatCategoryList(strong)}達標度高，整體條件不錯，可以列入候選名單。${pendingText}`;
    }

    return `目前沒有特別突出的優勢或重大缺點，屬於中性選項。建議用比較功能和其他房源並排評估。${pendingText}`;
  }

  private get reportStrongCategoryLabels(): string[] {
    return this.getCategoryEvaluationStats()
      .filter((stat) => stat.score >= 80 && stat.flaggedRatio <= 0.15)
      .sort((a, b) => b.score - a.score)
      .map((stat) => stat.label);
  }

  private get reportWeakCategoryLabels(): string[] {
    return this.getCategoryEvaluationStats()
      .filter((stat) => stat.score < 65 || stat.flaggedRatio >= 0.25 || stat.flagged >= 2)
      .sort((a, b) => a.score - b.score || b.flaggedRatio - a.flaggedRatio)
      .map((stat) => stat.label);
  }

  private getCategoryEvaluationStats(): CategoryEvaluationStat[] {
    return this.radarAxisIds.map((axisId) => this.getCategoryEvaluationStat(axisId));
  }

  private formatCategoryList(labels: string[]): string {
    const picked = labels.slice(0, 2);
    if (picked.length === 0) return '整體條件';
    return picked.join('、');
  }

  private getCategoryEvaluationStat(axisId: string): CategoryEvaluationStat {
    const items = this.items.filter((item) => item.cat === axisId);
    const total = Math.max(items.length, 1);
    const done = items.filter((item) => this.state[item.id]?.checked).length;
    const flagged = items.filter((item) => this.state[item.id]?.flagged).length;
    const pending = Math.max(total - done - flagged, 0);
    const confirmed = done + flagged;
    const score = this.getCategoryScore(axisId);
    const pendingHighRiskCount = items.filter((item) => {
      const state = this.state[item.id];
      const config = this.getItemRiskConfig(item);
      return !state?.checked && !state?.flagged && config.weight >= 4;
    }).length;

    return {
      label: this.categoryMap[axisId],
      total,
      done,
      flagged,
      pending,
      confirmed,
      score,
      analysis: this.getCategoryAnalysisText(score, flagged, pendingHighRiskCount),
      doneRatio: done / total,
      flaggedRatio: flagged / total
    };
  }

  private getCategoryScore(axisId: string): number {
    return Math.round(this.getRecordCategoryScoreRatio(this.activeRecord, axisId) * 100);
  }

  private getCategoryAnalysisText(score: number, flagged: number, pendingHighRiskCount: number): string {
    if (flagged >= 2 || score < 60) return '風險偏高，建議優先複查';
    if (pendingHighRiskCount > 0) return '關鍵項目待確認';
    if (score >= 85) return '條件良好';
    if (score >= 70) return '可列入候選';
    return '尚可，但需補查';
  }

  /** 列印版：分類統計表（像報告表格一樣呈現） */
  get reportCategoryStats(): CategoryEvaluationStat[] {
    return this.radarAxisIds.map((axisId) => this.getCategoryEvaluationStat(axisId));
  }

  /** 雷達強項拆成標籤，螢幕版快速閱讀用 */
  get reportStrengthChips(): string[] {
    const raw = this.getRadarStrengthText(this.activeRecord);
    if (!raw || raw === '—') return [];
    return raw
      .split('、')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  get reportPros(): ReportRow[] {
    return this.items
      .filter((item) => this.state[item.id]?.checked)
      .map((item) => ({
        title: item.title,
        note: this.state[item.id]?.note?.trim() || ''
      }));
  }

  get reportCons(): ReportRow[] {
    return this.items
      .filter((item) => this.state[item.id]?.flagged)
      .map((item) => ({
        title: item.title,
        note: this.state[item.id]?.note?.trim() || ''
      }));
  }

  get reportPending(): ReportRow[] {
    return this.items
      .filter((item) => !this.state[item.id]?.checked && !this.state[item.id]?.flagged)
      .map((item) => ({
        title: item.title,
        note: this.state[item.id]?.note?.trim() || ''
      }));
  }

  get reportImportantChecklistRows(): ReportChecklistRow[] {
    return this.items
      .map((item) => {
        const state = this.state[item.id];
        const config = this.getItemRiskConfig(item);
        const status: ReportChecklistStatus = state?.flagged ? 'flagged' : state?.checked ? 'checked' : 'pending';
        const boost = this.itemReportPriorityBoost[item.id] ?? 0;
        const priority =
          (status === 'flagged' ? 300 : status === 'pending' ? 200 : 100) +
          config.weight * 10 +
          boost +
          (state?.note?.trim() ? 5 : 0);
        return {
          category: this.categoryMap[item.cat] ?? item.cat,
          title: item.title,
          status,
          statusLabel: this.getChecklistStatusLabel(status),
          note: this.formatChecklistNote(state, status),
          priority
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);
  }

  get reportSummaryStrengths(): ReportSummaryBullet[] {
    const strengths = this.items
      .filter((item) => this.state[item.id]?.checked)
      .map((item) => {
        const config = this.getItemRiskConfig(item);
        return {
          title: item.title,
          description: this.state[item.id]?.note?.trim() || this.getStrengthDescription(item),
          priority: config.weight
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    if (strengths.length > 0) return strengths;

    return [{
      title: '尚未形成明確優勢',
      description: '建議先完成高權重項目，報告會更容易判斷優勢。',
      priority: 0
    }];
  }

  get reportSummaryRisks(): ReportSummaryBullet[] {
    const risks = this.items
      .filter((item) => this.state[item.id]?.flagged)
      .map((item) => {
        const config = this.getItemRiskConfig(item);
        return {
          title: item.title,
          description: this.state[item.id]?.note?.trim() || this.getRiskDescription(item),
          priority: config.weight
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    if (risks.length > 0) return risks;

    return [{
      title: '目前未標記重大風險',
      description: '仍需留意待確認項目，特別是高權重安全與合約題。',
      priority: 0
    }];
  }

  get displayReportConclusionTitle(): string {
    return this.activeRecord.aiReportContent?.conclusion.title || this.reportDecisionTitle;
  }

  get displayReportConclusionDesc(): string {
    return this.activeRecord.aiReportContent?.conclusion.description || this.reportDecisionDesc;
  }

  get displayReportStrengths(): ReportSummaryBullet[] {
    const strengths = this.activeRecord.aiReportContent?.strengths ?? [];
    if (strengths.length === 0) return this.reportSummaryStrengths;
    return strengths.map((item, index) => ({
      title: item.title,
      description: item.description,
      priority: strengths.length - index
    }));
  }

  get displayReportRisks(): ReportSummaryBullet[] {
    const risks = this.activeRecord.aiReportContent?.risks ?? [];
    if (risks.length === 0) return this.reportSummaryRisks;
    return risks.map((item, index) => ({
      title: item.title,
      description: item.description,
      priority: risks.length - index
    }));
  }

  get reportNextActions(): ReportNextAction[] {
    const aiActions = this.activeRecord.aiReportContent?.nextActions ?? [];
    if (aiActions.length > 0) return aiActions.slice(0, 3);
    return this.getRuleBasedNextActions();
  }

  private getRuleBasedNextActions(): ReportNextAction[] {
    const flaggedRows = this.reportImportantChecklistRows.filter((row) => row.status === 'flagged');
    const pendingRows = this.reportImportantChecklistRows.filter((row) => row.status === 'pending');
    const actions: ReportNextAction[] = [];

    flaggedRows.slice(0, 2).forEach((row) => {
      const item = this.items.find((candidate) => candidate.title === row.title);
      actions.push({
        title: `複查：${row.title}`,
        description: item && this.itemReportCopyConfig[item.id]?.nextAction
          ? this.itemReportCopyConfig[item.id].nextAction
          : row.note === '已標記風險，建議與房東確認改善方式。'
          ? '針對此風險與房東確認原因、改善方式，必要時寫進租約。'
          : row.note
      });
    });

    pendingRows.slice(0, 2).forEach((row) => {
      const item = this.items.find((candidate) => candidate.title === row.title);
      actions.push({
        title: `補查：${row.title}`,
        description: item && this.itemReportCopyConfig[item.id]?.nextAction
          ? this.itemReportCopyConfig[item.id].nextAction
          : '下次看房或簽約前補齊確認，避免分數建立在資料不足上。'
      });
    });

    if (actions.length < 3 && this.reportWeakCategoryLabels.length > 0) {
      actions.push({
        title: `比較：${this.reportWeakCategoryLabels[0]}`,
        description: '把這個弱項和其他候選房源並排比較，確認是否為可接受缺點。'
      });
    }

    if (actions.length < 3) {
      actions.push({
        title: '確認租約條件',
        description: '簽約前再次確認費用、押金、提前解約與設備維修責任。'
      });
    }

    return actions.slice(0, 3);
  }

  get reportDataForAi(): ReportDataPayload {
    const record = this.activeRecord;
    return {
      recordName: record.name,
      address: record.address || '未填寫',
      location: {
        latitude: record.latitude,
        longitude: record.longitude,
        source: record.latitude !== null && record.longitude !== null ? 'map_picker' : 'manual_or_empty'
      },
      monthlyRent: record.monthlyRent || '未填寫',
      updatedAt: this.formatDateTime(record.updatedAt),
      layout: {
        layoutType: record.layoutType || '未填寫',
        rooms: record.layoutRooms || '未填寫',
        livingRooms: record.layoutLivingRooms || '未填寫',
        bathrooms: record.layoutBathrooms || '未填寫',
        kitchenType: record.layoutKitchenType || '未填寫',
        areaPing: record.layoutAreaPing || '未填寫',
        notes: record.layoutNotes || ''
      },
      property: {
        summary: this.propertySummaryText,
        buildingType: record.buildingType || '未填寫',
        floorLevel: record.floorLevel || '未填寫',
        buildingAgeRange: record.buildingAgeRange || '未填寫',
        hasElevator: record.hasElevator || '未填寫',
        hasManager: record.hasManager || '未填寫',
        managementFeeType: record.managementFeeType || '未填寫',
        depositMonths: record.depositMonths || '未填寫',
        minLeaseTerm: record.minLeaseTerm || '未填寫',
        canCook: record.canCook || '未填寫',
        canPet: record.canPet || '未填寫',
        subsidyAvailable: record.subsidyAvailable || '未填寫'
      },
      score: {
        overall: this.reportScore100,
        overallScoreMethod: 'weighted_category_average',
        overallCategoryWeights: this.reportOverallCategoryWeights,
        grade: this.reportGrade,
        gradeText: this.reportGradeText,
        riskLevel: this.reportRiskLevelLabel,
        confidencePercent: this.reportConfidencePercent,
        confidenceLabel: this.reportConfidenceLabel,
        confidenceHint: this.reportConfidenceHint,
        decisionTitle: this.reportDecisionTitle,
        decisionDescription: this.reportDecisionDesc,
        candidateAverageScore: this.candidateAverageScore,
        candidateAverageBasis: this.candidateAverageBasis,
        candidateAverageHint: this.candidateAverageHint
      },
      summary: {
        confirmedCount: this.confirmedCount,
        checkedCount: this.doneCount,
        flaggedCount: this.flaggedCount,
        totalCount: this.totalCount,
        pendingCount: this.leftCount,
        keyRiskSummary: this.reportKeyRiskSummary
      },
      categoryScores: this.radarAxisIds.map((axisId) => {
        const stat = this.getCategoryEvaluationStat(axisId);
        return {
          axisId,
          name: stat.label,
          score: stat.score,
          weightInOverall: this.categoryScoreWeightByAxis[axisId],
          confirmed: stat.confirmed,
          total: stat.total,
          flagged: stat.flagged,
          pending: stat.pending,
          analysis: stat.analysis
        };
      }),
      aiSummaryFallback: {
        conclusion: {
          title: this.reportDecisionTitle,
          description: this.reportDecisionDesc
        },
        strengths: this.reportSummaryStrengths.map(({ title, description }) => ({ title, description })),
        risks: this.reportSummaryRisks.map(({ title, description }) => ({ title, description }))
      },
      checklistTable: this.items.map((item) => {
        const state = this.state[item.id];
        const config = this.getItemRiskConfig(item);
        const status: ReportChecklistStatus = state?.flagged ? 'flagged' : state?.checked ? 'checked' : 'pending';
        const answers = state?.selectedOptions ?? [];
        return {
          itemId: item.id,
          category: this.categoryMap[item.cat] ?? item.cat,
          item: item.title,
          answerType: this.getItemAnswerType(item.id),
          answers,
          status,
          statusLabel: this.getChecklistStatusLabel(status),
          quickStatus: state?.quickStatus ?? 'unknown',
          selectedOptions: answers,
          note: this.formatChecklistNote(state, status),
          weight: config.weight,
          riskLevel: config.riskLevel
        };
      }),
      importantChecklistTable: this.reportImportantChecklistRows.map(({ category, title, status, statusLabel, note }) => ({
        category,
        item: title,
        status,
        statusLabel,
        note
      })),
      nextActions: this.reportNextActions.map(({ title, description }) => ({ title, description }))
    };
  }

  get reportDataJson(): string {
    return JSON.stringify(this.reportDataForAi, null, 2);
  }

  get aiReportPrompt(): string {
    return `你是一位「租屋決策顧問」。請依我提供的 JSON，產出一份 InBody 風格的看房報告。

【輸出要求】
1) 使用繁體中文。
2) 版型要結構化、短句、可直接轉 PDF。
3) 嚴格使用以下章節順序：
   - 報告抬頭
   - Overview（總覽）
   - 風險等級摘要條
   - 決策建議區
   - 戶型配置
   - 分類分數摘要（可對應雷達圖）
   - Checklist 明細表
   - 結論與下一步
4) 「confirmed」= checked + flagged。
5) 對 flagged 項目要有風險提示語。
6) 不要輸出多餘前言，不要解釋你怎麼思考。

【輸出格式細節】
- 報告抬頭：顯示紀錄名稱、地址、月租金、更新時間。
- Overview：顯示 overall score、grade、confirmed/total、pending、confidence。
- 風險等級摘要條：用一句話描述風險等級與重點風險。
- 決策建議區：顯示 decisionTitle + 2~3 句 decisionDescription。
- 戶型配置：列出 layoutType、房/廳/衛、kitchenType、areaPing、layout notes。
- 房源基本條件：用 property.summary 補充建物、押金、租期、開伙、寵物與補助條件。
- 分類分數摘要：以條列列出各分類 score 與 confirmed/total，並補一句高低分解讀。
- Checklist 明細表：欄位為「分類｜項目｜狀態｜備註」，狀態顯示「通過/風險/待確認」。
- 結論與下一步：提供 3 點可執行建議（例如二次看房、談判條件、補件清單）。

【注意】
- checklistTable 是完整原始資料；importantChecklistTable 是前端已挑出的重要項目。
- 每列含 answerType（singleSelect=以 quickStatus 為主；multiSelect=另有 answers 細節選項）、answers 與 selectedOptions（兩者相同陣列）、quickStatus。
- selectedOptions／answers 請優先引用具體內容。
- score.candidateAverageHint 說明「同區候選平均」如何計算：僅為使用者自建紀錄／比較清單，勿宣稱市場或區域行情。
- 若資料不足，請明確提醒 confidence 與 pending 項目，不要過度下結論。

以下是資料 JSON：
${this.reportDataJson}`;
  }

  get aiImportPrompt(): string {
    return `你是一位「租屋決策顧問」。請依我提供的 JSON，產出可匯入 Rental Buddy 前端報告的 AI 分析 JSON。

【輸出規則】
1) 只回傳 JSON，不要 Markdown，不要使用 code fence。
2) 使用繁體中文，短句，適合放進 A4 報告。
3) 不要改動分數、grade、confirmed、pending 等數字，只能依資料生成文字。
4) 若 confidence 偏低，conclusion 與 nextActions 必須提醒資料不足。
5) strengths 與 risks 最多各 3 項；nextActions 固定 3 項。

【回傳 JSON schema】
{
  "conclusion": {
    "title": "整體結論標題",
    "description": "2 到 3 句決策說明"
  },
  "strengths": [
    { "title": "主要優勢", "description": "具體原因" }
  ],
  "risks": [
    { "title": "主要風險", "description": "具體風險提示" }
  ],
  "nextActions": [
    { "title": "下一步標題", "description": "具體可執行建議" }
  ]
}

以下是資料 JSON：
${this.reportDataJson}`;
  }

  async copyReportDataJson(): Promise<void> {
    await this.copyReportText(this.reportDataJson, '已複製 AI JSON');
  }

  async copyAiReportPrompt(): Promise<void> {
    await this.copyReportText(this.aiReportPrompt, '已複製 ChatGPT Prompt');
  }

  async copyAiImportPrompt(): Promise<void> {
    await this.copyReportText(this.aiImportPrompt, '已複製可匯入 Prompt');
  }

  toggleAiImportPanel(): void {
    this.showAiImportPanel = !this.showAiImportPanel;
    this.aiReportImportMessage = '';
    if (this.showAiImportPanel) {
      this.reportToolsExpanded = true;
    }
  }

  toggleReportTools(): void {
    this.reportToolsExpanded = !this.reportToolsExpanded;
  }

  @HostListener('window:online')
  onNetworkOnline(): void {
    this.isOffline = false;
    this.showReconnectBanner = true;
    if (this.swUpdate.isEnabled) {
      void this.swUpdate.checkForUpdate();
    }
    if (this.reconnectBannerTimer) {
      window.clearTimeout(this.reconnectBannerTimer);
    }
    this.reconnectBannerTimer = window.setTimeout(() => {
      this.showReconnectBanner = false;
      this.reconnectBannerTimer = null;
    }, 4000);
  }

  @HostListener('window:offline')
  onNetworkOffline(): void {
    this.isOffline = true;
    this.showReconnectBanner = false;
    if (this.reconnectBannerTimer) {
      window.clearTimeout(this.reconnectBannerTimer);
      this.reconnectBannerTimer = null;
    }
  }

  reloadApp(): void {
    window.location.reload();
  }

  async refreshForUpdate(): Promise<void> {
    if (this.swUpdate.isEnabled) {
      try {
        await this.swUpdate.activateUpdate();
      } catch {
        // Ignore activation failures and fallback to hard reload.
      }
    }
    window.location.reload();
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.installPromptEvent = event as BeforeInstallPromptEventLike;
    this.tryShowPwaInstallBanner();
  }

  private isStandaloneDisplay(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  private isIosTouchDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }

  /** 產品預設僅手機／平板觸控；排除桌面瀏覽器 */
  private isMobileTouchClient(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    if (this.isIosTouchDevice()) return true;
    if (/Android/i.test(navigator.userAgent)) return true;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  /** @param immediate 教學剛按「完成」等：不延遲 1 秒再顯示 */
  tryShowPwaInstallBanner(immediate = false): void {
    if (this.pwaInstallRevealTimer) {
      window.clearTimeout(this.pwaInstallRevealTimer);
      this.pwaInstallRevealTimer = null;
    }
    if (!this.canOfferPwaInstall()) {
      this.showPwaInstallBanner = false;
      return;
    }
    const chromiumInstall = !!this.installPromptEvent && this.isMobileTouchClient();
    const iosManual = this.isIosTouchDevice() && !chromiumInstall;
    const shouldOffer = chromiumInstall || iosManual;
    if (!shouldOffer) {
      this.showPwaInstallBanner = false;
      return;
    }
    if (immediate) {
      this.revealPwaInstallBannerIfEligible();
      return;
    }
    this.pwaInstallRevealTimer = window.setTimeout(() => {
      this.pwaInstallRevealTimer = null;
      this.revealPwaInstallBannerIfEligible();
    }, this.pwaInstallRevealDelayMs);
  }

  private revealPwaInstallBannerIfEligible(): void {
    if (!this.canOfferPwaInstall()) return;
    const chromium = !!this.installPromptEvent && this.isMobileTouchClient();
    const ios = this.isIosTouchDevice() && !chromium;
    if (!(chromium || ios)) return;
    this.showPwaInstallBanner = true;
    this.cdr.markForCheck();
  }

  private canOfferPwaInstall(): boolean {
    if (this.showIntro) return false;
    if (this.tutorialOpen) return false;
    if (this.isStandaloneDisplay()) return false;
    if (localStorage.getItem(this.pwaInstallNeverKey) === '1') return false;
    const snoozeUntil = localStorage.getItem(this.pwaInstallSnoozeKey);
    if (snoozeUntil && !Number.isNaN(Number(snoozeUntil)) && Date.now() < Number(snoozeUntil)) {
      return false;
    }
    return this.records.length >= 1;
  }

  async promptPwaInstall(): Promise<void> {
    const ev = this.installPromptEvent;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } finally {
      this.installPromptEvent = null;
      this.showPwaInstallBanner = false;
      this.tryShowPwaInstallBanner();
    }
  }

  snoozePwaInstall(): void {
    if (this.pwaInstallRevealTimer) {
      window.clearTimeout(this.pwaInstallRevealTimer);
      this.pwaInstallRevealTimer = null;
    }
    localStorage.setItem(this.pwaInstallSnoozeKey, String(Date.now() + this.pwaInstallSnoozeMs));
    this.showPwaInstallBanner = false;
  }

  dismissPwaInstallForever(): void {
    if (this.pwaInstallRevealTimer) {
      window.clearTimeout(this.pwaInstallRevealTimer);
      this.pwaInstallRevealTimer = null;
    }
    localStorage.setItem(this.pwaInstallNeverKey, '1');
    this.showPwaInstallBanner = false;
  }

  applyAiReportJson(): void {
    try {
      const parsed = JSON.parse(this.stripJsonCodeFence(this.aiReportDraftInput)) as Partial<AiReportContent>;
      const normalized = this.normalizeAiReportContent(parsed);
      if (!normalized) {
        this.aiReportImportMessage = '格式不完整，請確認有 conclusion、strengths、risks、nextActions。';
        return;
      }
      this.activeRecord.aiReportContent = normalized;
      this.aiReportImportMessage = '已套用 AI 分析內容';
      this.touchActiveRecord();
    } catch {
      this.aiReportImportMessage = 'JSON 解析失敗，請貼上 ChatGPT 回傳的純 JSON。';
    }
  }

  clearAiReportContent(): void {
    this.activeRecord.aiReportContent = null;
    this.aiReportDraftInput = '';
    this.aiReportImportMessage = '已清除 AI 分析內容，報告改用規則版 fallback。';
    this.touchActiveRecord();
  }

  private loadState(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '{}') as {
        records?: HouseRecord[];
        activeRecordId?: string;
        compareIds?: string[];
        checklistScopeMode?: ChecklistScopeMode;
      };
      this.records = (saved.records ?? []).map((record) => this.normalizeRecord(record));
      this.activeRecordId = saved.activeRecordId ?? '';
      this.compareIds = (saved.compareIds ?? []).filter((id) =>
        this.records.some((record) => record.id === id)
      );
      const sm = saved.checklistScopeMode;
      if (sm === 'compact' || sm === 'standard' || sm === 'full') {
        this.checklistScopeMode = sm;
      } else {
        this.checklistScopeMode = 'compact';
      }
    } catch {
      this.records = [];
      this.activeRecordId = '';
      this.compareIds = [];
    }

    if (this.records.length === 0) {
      this.records = [this.createSeedHouseRecord()];
    }

    if (!this.records.some((record) => record.id === this.activeRecordId)) {
      this.activeRecordId = this.records[0].id;
    }

    this.syncEditingRecordName();
    this.saveState();
  }

  private touchActiveRecord(): void {
    if (this.activeRecord) {
      this.activeRecord.updatedAt = Date.now();
    }
    this.saveState();
  }

  private saveState(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        records: this.records,
        activeRecordId: this.activeRecordId,
        compareIds: this.compareIds,
        checklistScopeMode: this.checklistScopeMode
      })
    );
  }

  async exportDataBackup(): Promise<void> {
    if (this.backupExportBusy || this.backupImportBusy) return;
    this.backupExportBusy = true;
    try {
      const ids = new Set<string>();
      for (const record of this.records) {
        for (const att of record.attachments ?? []) {
          ids.add(att.id);
        }
      }
      const attachmentPayloads: BackupAttachmentPayload[] = [];
      for (const id of ids) {
        const blob = await this.getAttachmentBlob(id);
        if (!blob) continue;
        try {
          const base64 = await this.blobToBase64(blob);
          attachmentPayloads.push({
            id,
            mimeType: blob.type || 'application/octet-stream',
            base64
          });
        } catch {
          // skip unreadable blobs
        }
      }
      const payload: BackupFileV2 = {
        backupFormatVersion: this.backupFormatVersion,
        app: 'rental-buddy',
        exportedAt: Date.now(),
        data: {
          records: this.records,
          activeRecordId: this.activeRecordId,
          compareIds: this.compareIds,
          checklistScopeMode: this.checklistScopeMode
        },
        attachmentPayloads
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `rental-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.closeRecordMenu();
    } catch {
      window.alert('匯出失敗，請稍後再試。');
    } finally {
      this.backupExportBusy = false;
    }
  }

  async importDataBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    if (this.backupExportBusy || this.backupImportBusy) return;
    this.backupImportBusy = true;
    try {
      const text = await file.text();
      const parsed = this.parseBackupPayload(text);
      if (!parsed) {
        window.alert('備份檔格式不正確或已損毀。');
        return;
      }
      const hint =
        '還原將取代目前的紀錄與比較設定。若備份含附件資料，會一併寫回本機（IndexedDB）。';
      if (!(await this.openAppConfirm(`${hint}\n\n仍要還原備份嗎？`, '還原備份'))) {
        return;
      }
      await this.applyImportedBackup(parsed);
      const n = parsed.attachmentPayloads?.length ?? 0;
      window.alert(n > 0 ? `已還原備份（含 ${n} 個附件檔）。` : '已還原備份。');
    } catch {
      window.alert('無法讀取檔案。');
    } finally {
      this.backupImportBusy = false;
      if (input) input.value = '';
      this.closeRecordMenu();
    }
  }

  private parseBackupPayload(raw: string): ParsedBackupPayload | null {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return null;
      const root = parsed as Record<string, unknown>;
      let inner: Record<string, unknown> | null = null;
      if ('records' in root && Array.isArray(root['records'])) {
        inner = root;
      } else if ('data' in root && root['data'] && typeof root['data'] === 'object') {
        inner = root['data'] as Record<string, unknown>;
      }
      if (!inner || !Array.isArray(inner['records'])) return null;
      const records = (inner['records'] as HouseRecord[]).map((r) => this.normalizeRecord(r));
      const activeRecordId = typeof inner['activeRecordId'] === 'string' ? inner['activeRecordId'] : '';
      const compareIds = Array.isArray(inner['compareIds'])
        ? (inner['compareIds'] as unknown[]).filter((id): id is string => typeof id === 'string')
        : [];
      const rawScope = inner['checklistScopeMode'];
      const checklistScopeMode: ChecklistScopeMode | undefined =
        rawScope === 'compact' || rawScope === 'standard' || rawScope === 'full' ? rawScope : undefined;

      let attachmentPayloads: BackupAttachmentPayload[] | undefined;
      const rawAtt = root['attachmentPayloads'];
      if (Array.isArray(rawAtt)) {
        attachmentPayloads = rawAtt
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const o = item as Record<string, unknown>;
            const id = typeof o['id'] === 'string' ? o['id'] : '';
            const base64 = typeof o['base64'] === 'string' ? o['base64'] : '';
            const mimeType = typeof o['mimeType'] === 'string' ? o['mimeType'] : 'image/jpeg';
            if (!id || !base64) return null;
            return { id, mimeType, base64 };
          })
          .filter((item): item is BackupAttachmentPayload => item !== null);
      }

      return { records, activeRecordId, compareIds, attachmentPayloads, checklistScopeMode };
    } catch {
      return null;
    }
  }

  private async applyImportedBackup(data: ParsedBackupPayload): Promise<void> {
    let records = data.records;
    if (records.length === 0) {
      records = [this.createSeedHouseRecord()];
    }
    this.records = records;
    this.compareIds = data.compareIds.filter((id) => records.some((r) => r.id === id));
    this.activeRecordId = records.some((r) => r.id === data.activeRecordId) ? data.activeRecordId : records[0].id;
    if (data.checklistScopeMode === 'compact' || data.checklistScopeMode === 'standard' || data.checklistScopeMode === 'full') {
      this.checklistScopeMode = data.checklistScopeMode;
    }
    this.syncEditingRecordName();
    this.saveState();

    if (data.attachmentPayloads && data.attachmentPayloads.length > 0) {
      for (const p of data.attachmentPayloads) {
        try {
          const blob = this.base64ToBlob(p.base64, p.mimeType);
          await this.putAttachmentBlob(p.id, blob);
        } catch {
          // skip broken payloads
        }
      }
    }

    this.clearAttachmentUiState();
    await this.loadAttachmentThumbs();
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        const dataUrl = reader.result as string;
        const comma = dataUrl.indexOf(',');
        resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
      };
      reader.onerror = (): void => reject(reader.error ?? new Error('read failed'));
      reader.readAsDataURL(blob);
    });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  }

  private createSeedHouseRecord(): HouseRecord {
    return this.normalizeRecord({
      id: this.createId(),
      name: '看房紀錄 1',
      address: '',
      latitude: null,
      longitude: null,
      monthlyRent: '',
      layoutType: '',
      layoutRooms: '',
      layoutLivingRooms: '',
      layoutBathrooms: '',
      layoutKitchenType: '',
      layoutAreaPing: '',
      layoutNotes: '',
      buildingType: '',
      floorLevel: '',
      buildingAgeRange: '',
      hasElevator: '',
      hasManager: '',
      managementFeeType: '',
      depositMonths: '',
      minLeaseTerm: '',
      canCook: '',
      canPet: '',
      subsidyAvailable: '',
      attachments: [],
      aiReportContent: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: {} as Record<string, ItemState>
    });
  }

  private normalizeAiReportContent(content: Partial<AiReportContent> | null | undefined): AiReportContent | null {
    if (!content) return null;
    const conclusionTitle = this.asTrimmedString(content.conclusion?.title);
    const conclusionDescription = this.asTrimmedString(content.conclusion?.description);
    const strengths = this.normalizeAiBullets(content.strengths, 3);
    const risks = this.normalizeAiBullets(content.risks, 3);
    const nextActions = this.normalizeAiBullets(content.nextActions, 3);
    if (!conclusionTitle || !conclusionDescription || strengths.length === 0 || risks.length === 0 || nextActions.length === 0) {
      return null;
    }
    return {
      conclusion: {
        title: conclusionTitle,
        description: conclusionDescription
      },
      strengths,
      risks,
      nextActions
    };
  }

  private normalizeAiBullets(items: AiReportBullet[] | undefined, limit: number): AiReportBullet[] {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({
        title: this.asTrimmedString(item?.title),
        description: this.asTrimmedString(item?.description)
      }))
      .filter((item) => item.title && item.description)
      .slice(0, limit);
  }

  private asTrimmedString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private stripJsonCodeFence(value: string): string {
    return value
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
  }

  private normalizeRecord(record: HouseRecord): HouseRecord {
    const normalizedState = {
      ...this.createEmptyState(),
      ...(record.state ?? {})
    };
    const allowedQuick = new Set<QuickStatus>(['good', 'ok', 'attention', 'bad', 'unknown']);
    this.items.forEach((item) => {
      const state = normalizedState[item.id];
      const rawQs = state.quickStatus as unknown;
      if (typeof rawQs !== 'string' || !allowedQuick.has(rawQs as QuickStatus)) {
        state.quickStatus = state.flagged ? 'attention' : state.checked ? 'good' : 'unknown';
      } else {
        state.quickStatus = rawQs as QuickStatus;
      }
      state.selectedOptions = state.selectedOptions ?? [];
    });

    const prunedState: Record<string, ItemState> = {};
    this.items.forEach((item) => {
      prunedState[item.id] = normalizedState[item.id];
    });

    return {
      id: record.id,
      name: record.name || '未命名',
      address: record.address || '',
      latitude: typeof record.latitude === 'number' ? record.latitude : null,
      longitude: typeof record.longitude === 'number' ? record.longitude : null,
      monthlyRent: record.monthlyRent || '',
      layoutType: record.layoutType || '',
      layoutRooms: record.layoutRooms || '',
      layoutLivingRooms: record.layoutLivingRooms || '',
      layoutBathrooms: record.layoutBathrooms || '',
      layoutKitchenType: record.layoutKitchenType || '',
      layoutAreaPing: record.layoutAreaPing || '',
      layoutNotes: record.layoutNotes || '',
      buildingType: record.buildingType || '',
      floorLevel: record.floorLevel || '',
      buildingAgeRange: record.buildingAgeRange || '',
      hasElevator: record.hasElevator || '',
      hasManager: record.hasManager || '',
      managementFeeType: record.managementFeeType || '',
      depositMonths: record.depositMonths || '',
      minLeaseTerm: record.minLeaseTerm || '',
      canCook: record.canCook || '',
      canPet: record.canPet || '',
      subsidyAvailable: record.subsidyAvailable || '',
      attachments: Array.isArray(record.attachments)
        ? record.attachments
            .filter((item) => !!item?.id)
            .map((item) => ({
              id: item.id,
              name: item.name || '未命名照片',
              type: item.type || 'image/*',
              size: typeof item.size === 'number' ? item.size : 0,
              createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now()
            }))
            .slice(0, this.attachmentLimit)
        : [],
      aiReportContent: this.normalizeAiReportContent(record.aiReportContent) ?? null,
      createdAt: record.createdAt || Date.now(),
      updatedAt: record.updatedAt || Date.now(),
      state: prunedState
    };
  }

  private createEmptyState(): Record<string, ItemState> {
    const nextState: Record<string, ItemState> = {};
    this.items.forEach((item) => {
      nextState[item.id] = {
        checked: false,
        flagged: false,
        expanded: false,
        note: '',
        quickStatus: 'unknown',
        selectedOptions: []
      };
    });
    return nextState;
  }

  private countDoneForRecord(record: HouseRecord): number {
    return this.items.filter((item) => record.state[item.id]?.checked).length;
  }

  private countFlaggedForRecord(record: HouseRecord): number {
    return this.items.filter((item) => record.state[item.id]?.flagged).length;
  }

  private getItemRiskConfig(item: ChecklistItem): ItemRiskConfig {
    return this.itemRiskConfig[item.id] ?? { weight: 2, riskLevel: 'medium' };
  }

  private getRiskPenaltyMultiplier(riskLevel: RiskLevel): number {
    if (riskLevel === 'high') return 5;
    if (riskLevel === 'medium') return 4;
    return 3;
  }

  private getTotalWeight(): number {
    return this.items.reduce((sum, item) => sum + this.getItemRiskConfig(item).weight, 0);
  }

  private getRecordConfirmedWeight(record: HouseRecord): number {
    return this.items.reduce((sum, item) => {
      const state = record.state[item.id];
      if (!state?.checked && !state?.flagged) return sum;
      return sum + this.getItemRiskConfig(item).weight;
    }, 0);
  }

  private getRecordFlaggedPenalty(record: HouseRecord): number {
    return this.items.reduce((sum, item) => {
      if (!record.state[item.id]?.flagged) return sum;
      const config = this.getItemRiskConfig(item);
      return sum + config.weight * this.getRiskPenaltyMultiplier(config.riskLevel);
    }, 0);
  }

  private getRecordPendingHighRiskItems(record: HouseRecord): ChecklistItem[] {
    return this.items.filter((item) => {
      const state = record.state[item.id];
      const config = this.getItemRiskConfig(item);
      return !state?.checked && !state?.flagged && config.weight >= 4;
    });
  }

  private getRecordPendingPenalty(record: HouseRecord): number {
    return this.getRecordPendingHighRiskItems(record).reduce((sum, item) => {
      return sum + Math.ceil(this.getItemRiskConfig(item).weight * 0.8);
    }, 0);
  }

  private getRecordConfidencePercent(record: HouseRecord): number {
    return Math.round((this.getRecordConfirmedWeight(record) / Math.max(this.getTotalWeight(), 1)) * 100);
  }

  private getChecklistStatusLabel(status: ReportChecklistStatus): string {
    if (status === 'checked') return '通過';
    if (status === 'flagged') return '風險';
    return '待確認';
  }

  private getDefaultChecklistNote(status: ReportChecklistStatus): string {
    if (status === 'checked') return '已確認通過';
    if (status === 'flagged') return '已標記風險，建議與房東確認改善方式。';
    return '尚未確認';
  }

  private getQuickStatusLabel(status: QuickStatus): string {
    if (status === 'unknown') return '尚未確認';
    return this.quickStatusOptions.find((option) => option.value === status)?.label ?? '尚未確認';
  }

  private formatChecklistNote(state: ItemState | undefined, status: ReportChecklistStatus): string {
    const note = state?.note?.trim();
    const selectedOptions = state?.selectedOptions?.length ? `細節：${state.selectedOptions.join('、')}` : '';
    if (note && selectedOptions) return `${note}（${selectedOptions}）`;
    if (note) return note;
    if (selectedOptions) return selectedOptions;
    if (state?.quickStatus && state.quickStatus !== 'unknown') {
      return `評等：${this.getQuickStatusLabel(state.quickStatus)}`;
    }
    return this.getDefaultChecklistNote(status);
  }

  private syncQuickStatusFromOptions(state: ItemState): void {
    if (state.selectedOptions.length === 0) {
      state.quickStatus = 'unknown';
      state.checked = false;
      state.flagged = false;
      return;
    }
    if (state.selectedOptions.some((option) => this.isRiskOption(option))) {
      state.quickStatus = 'attention';
      state.checked = false;
      state.flagged = true;
      return;
    }
    state.quickStatus = 'ok';
    state.checked = true;
    state.flagged = false;
  }

  private getStrengthDescription(item: ChecklistItem): string {
    const copy = this.itemReportCopyConfig[item.id];
    if (copy?.positiveText) return copy.positiveText;
    return `${this.categoryMap[item.cat] ?? '此分類'}條件已確認，對整體評估有加分。`;
  }

  private getRiskDescription(item: ChecklistItem): string {
    const copy = this.itemReportCopyConfig[item.id];
    if (copy?.riskText) return copy.riskText;
    const config = this.getItemRiskConfig(item);
    if (config.riskLevel === 'high') return '屬於高權重風險，建議簽約前優先複查。';
    if (config.riskLevel === 'medium') return '此項可能影響居住品質，建議與房東確認改善方式。';
    return '此項影響較小，但仍建議納入比較。';
  }

  getRecordDone(record: HouseRecord): number {
    return this.countDoneForRecord(record);
  }

  getRecordFlagged(record: HouseRecord): number {
    return this.countFlaggedForRecord(record);
  }

  getRecordScore(record: HouseRecord): number {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const axisId of this.radarAxisIds) {
      const w = this.categoryScoreWeightByAxis[axisId];
      weightedSum += this.getRecordCategoryScoreRatio(record, axisId) * 100 * w;
      weightTotal += w;
    }
    if (weightTotal <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round(weightedSum / weightTotal)));
  }

  getRadarValues(record: HouseRecord): number[] {
    return this.radarAxisIds.map((axisId) => this.getRecordCategoryScoreRatio(record, axisId));
  }

  getRadarPolygonPoints(values: number[]): string {
    const n = this.radarAxisIds.length;
    const step = (Math.PI * 2) / n;
    // SVG 座標 y 往下為正，所以用 -PI/2 讓第 1 軸朝上。
    const start = -Math.PI / 2;
    return values
      .map((v, i) => {
        const angle = start + i * step;
        const r = this.radarRadius * v;
        const x = this.radarCenter + r * Math.cos(angle);
        const y = this.radarCenter + r * Math.sin(angle);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  getRadarPointsAtRatio(ratio: number): string {
    const n = this.radarAxisIds.length;
    const values = Array.from({ length: n }, () => ratio);
    return this.getRadarPolygonPoints(values);
  }

  /**
   * Per-item score factor 0–1: good = full, ok = partial, attention / bad / unknown = no credit.
   * Legacy rows with checked but no quickStatus are treated like good.
   */
  private getItemQuickScoreFactor(state: ItemState | undefined): number {
    if (!state) return 0;
    const qs = state.quickStatus ?? 'unknown';
    if (state.flagged || qs === 'attention' || qs === 'bad') return 0;
    if (qs === 'good') return 1;
    if (qs === 'ok') return 0.65;
    if (state.checked && !state.flagged) return 1;
    return 0;
  }

  getRecordCategoryScoreRatio(record: HouseRecord, axisId: string): number {
    const catItems = this.items.filter((item) => item.cat === axisId);
    if (catItems.length === 0) return 0;
    let earned = 0;
    let maxWeight = 0;
    for (const item of catItems) {
      const config = this.getItemRiskConfig(item);
      const w = config.weight;
      maxWeight += w;
      earned += w * this.getItemQuickScoreFactor(record.state[item.id]);
    }
    if (maxWeight <= 0) return 0;
    return Math.max(0, Math.min(1, earned / maxWeight));
  }

  getRadarAxisXEnd(axisId: string): number {
    const idx = this.radarAxisIds.indexOf(axisId as (typeof this.radarAxisIds)[number]);
    const n = this.radarAxisIds.length;
    const step = (Math.PI * 2) / n;
    const start = -Math.PI / 2;
    const angle = start + idx * step;
    const x = this.radarCenter + this.radarRadius * Math.cos(angle);
    return x;
  }

  getRadarAxisYEnd(axisId: string): number {
    const idx = this.radarAxisIds.indexOf(axisId as (typeof this.radarAxisIds)[number]);
    const n = this.radarAxisIds.length;
    const step = (Math.PI * 2) / n;
    const start = -Math.PI / 2;
    const angle = start + idx * step;
    const y = this.radarCenter + this.radarRadius * Math.sin(angle);
    return y;
  }

  getRadarAxisXLabel(axisId: string): number {
    const idx = this.radarAxisIds.indexOf(axisId as (typeof this.radarAxisIds)[number]);
    const n = this.radarAxisIds.length;
    const step = (Math.PI * 2) / n;
    const start = -Math.PI / 2;
    const angle = start + idx * step;
    const labelR = this.radarRadius + 18;
    return this.radarCenter + labelR * Math.cos(angle);
  }

  getRadarAxisYLabel(axisId: string): number {
    const idx = this.radarAxisIds.indexOf(axisId as (typeof this.radarAxisIds)[number]);
    const n = this.radarAxisIds.length;
    const step = (Math.PI * 2) / n;
    const start = -Math.PI / 2;
    const angle = start + idx * step;
    const labelR = this.radarRadius + 18;
    return this.radarCenter + labelR * Math.sin(angle);
  }

  getRadarAxisLabelAnchor(axisId: string): string {
    const idx = this.radarAxisIds.indexOf(axisId as (typeof this.radarAxisIds)[number]);
    const n = this.radarAxisIds.length;
    const step = (Math.PI * 2) / n;
    const start = -Math.PI / 2;
    const angle = start + idx * step;
    const cos = Math.cos(angle);
    if (cos > 0.35) return 'start';
    if (cos < -0.35) return 'end';
    return 'middle';
  }

  private getRadarRanked(record: HouseRecord): Array<{ axisId: string; pct: number }> {
    return this.radarAxisIds
      .map((axisId) => ({
        axisId,
        pct: Math.round(this.getRecordCategoryScoreRatio(record, axisId) * 100)
      }))
      .sort((a, b) => b.pct - a.pct);
  }

  getRadarStrengthText(record: HouseRecord): string {
    const ranked = this.getRadarRanked(record);
    const top = ranked.slice(0, 2);
    if (top.length === 0) return '—';
    return top.map((x) => `${this.categoryMap[x.axisId]} ${x.pct}%`).join('、');
  }

  getRadarWeaknessText(record: HouseRecord): string {
    const ranked = this.getRadarRanked(record);
    const bottom = ranked.slice(-2).reverse();
    if (bottom.length === 0) return '—';
    return bottom.map((x) => `${this.categoryMap[x.axisId]} ${x.pct}%`).join('、');
  }

  /** 同一房源在所有區塊（pill / 雷達）固定同色，不依「目前選誰」改變 */
  getRadarColorForRecord(record: HouseRecord): string {
    const idx = this.records.findIndex((r) => r.id === record.id);
    return this.radarColors[(idx >= 0 ? idx : 0) % this.radarColors.length];
  }

  /** 疊在一起時用虛線樣式再區分（第一條實線） */
  getRadarStrokeDash(record: HouseRecord): string | null {
    const idx = this.chartRecords.findIndex((r) => r.id === record.id);
    if (idx <= 0) return null;
    if (idx === 1) return '10 7';
    if (idx === 2) return '4 5';
    return '2 4';
  }

  getRadarStrokeWidth(record: HouseRecord): number {
    const idx = this.chartRecords.findIndex((r) => r.id === record.id);
    return idx === 0 ? 2.4 : 2;
  }

  async exportReportAsDocument(): Promise<void> {
    const reportElement = document.getElementById('reportExportArea');
    if (!reportElement) return;

    await this.loadAttachmentThumbs();

    reportElement.classList.add('report-export-formal');
    document.body.classList.add('printing-report');
    document.documentElement.classList.add('printing-report');
    const previousTitle = document.title;
    document.title = `${this.activeRecord.name}-report`;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const cleanup = (): void => {
      reportElement.classList.remove('report-export-formal');
      document.body.classList.remove('printing-report');
      document.documentElement.classList.remove('printing-report');
      document.title = previousTitle;
    };

    try {
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          resolve();
        };
        window.addEventListener('afterprint', finish, { once: true });
        window.print();
        // 某些瀏覽器不一定觸發 afterprint，避免卡住。
        window.setTimeout(finish, 1200);
      });
    } catch {
      cleanup();
      return;
    }

    cleanup();
  }

  private copyTextWithFallback(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private async copyReportText(text: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.copyTextWithFallback(text);
    }
    this.reportDataCopyState = successMessage;
    window.setTimeout(() => {
      this.reportDataCopyState = '';
    }, 1800);
  }

  private formatDateTime(timestamp: number): string {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(timestamp));
  }

  private createId(): string {
    return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private syncEditingRecordName(): void {
    this.editingRecordName = this.activeRecord?.name ?? '';
  }

  private createAttachmentId(): string {
    return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private async getAttachmentDb(): Promise<IDBDatabase> {
    if (this.attachmentDbPromise) return this.attachmentDbPromise;
    this.attachmentDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('rental-buddy-attachments-v1', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
    });
    return this.attachmentDbPromise;
  }

  private async putAttachmentBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.getAttachmentDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('attachments', 'readwrite');
      tx.objectStore('attachments').put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('indexedDB write failed'));
    });
  }

  private async getAttachmentBlob(id: string): Promise<Blob | null> {
    const db = await this.getAttachmentDb();
    return new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction('attachments', 'readonly');
      const req = tx.objectStore('attachments').get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('indexedDB read failed'));
    });
  }

  private async deleteAttachmentBlob(id: string): Promise<void> {
    const db = await this.getAttachmentDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('attachments', 'readwrite');
      tx.objectStore('attachments').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('indexedDB delete failed'));
    });
  }

  private revokeAttachmentObjectUrls(): void {
    this.attachmentObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.attachmentObjectUrls = [];
    this.attachmentThumbs = [];
    this.closeAttachmentPreview();
  }

  private async loadAttachmentThumbs(): Promise<void> {
    this.revokeAttachmentObjectUrls();
    const picks = this.activeAttachments.slice(0, this.attachmentLimit);
    const nextUrls: string[] = [];
    const nextThumbs: AttachmentThumb[] = [];
    for (const item of picks) {
      try {
        const blob = await this.getAttachmentBlob(item.id);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        nextUrls.push(url);
        nextThumbs.push({ id: item.id, url, name: item.name });
      } catch {
        // ignore preview failures
      }
    }
    this.zone.run(() => {
      this.attachmentObjectUrls = nextUrls;
      this.attachmentThumbs = nextThumbs;
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  private clearAttachmentSelection(): void {
    this.selectedAttachmentIds = [];
  }

  private clearAttachmentUiState(): void {
    this.attachmentSelectionMode = false;
    this.clearAttachmentSelection();
    this.closeAttachmentPreview();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.custom-select') && !target?.closest('.record-menu')) {
      this.closeRecordMenu();
      this.isCategoryMenuOpen = false;
      this.overviewDropdownOpen = null;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (this.tutorialOpen && event.key === 'Escape') {
      event.preventDefault();
      this.finishTutorial(true);
      return;
    }
    if (!this.appConfirmOpen || event.key !== 'Escape') return;
    event.preventDefault();
    this.closeAppConfirm(false);
  }

  private matchesChecklistFilters(item: ChecklistItem): boolean {
    const state = this.state[item.id];
    if (!state) return false;
    const isConfirmed = state.checked || state.flagged;
    const quickStatus = state.quickStatus ?? 'unknown';
    const riskConfig = this.getItemRiskConfig(item);
    const statusFilters = this.activeChecklistFilters.filter((filter) => this.getChecklistFilterGroup(filter) === 'status');
    const quickFilters = this.activeChecklistFilters.filter((filter) => this.getChecklistFilterGroup(filter) === 'quick');
    const priorityFilters = this.activeChecklistFilters.filter((filter) => this.getChecklistFilterGroup(filter) === 'priority');
    const statusMatched = statusFilters.length === 0 || statusFilters.some((filter) => {
      if (filter === 'pending') return !isConfirmed;
      return isConfirmed;
    });
    const quickMatched = quickFilters.length === 0 || quickFilters.some((filter) => quickStatus === filter);
    const priorityMatched = priorityFilters.length === 0 || priorityFilters.some((filter) => {
      const tier = item.riskTier;
      if (filter === 'priority_high') return tier === 'must';
      if (filter === 'priority_normal') return tier === 'should';
      return tier === 'later';
    });
    return statusMatched && quickMatched && priorityMatched;
  }

  private getChecklistFilterGroup(filterId: ChecklistFilterId): ChecklistFilterGroupId {
    if (filterId === 'pending' || filterId === 'confirmed') return 'status';
    if (filterId === 'good' || filterId === 'ok' || filterId === 'attention' || filterId === 'bad') return 'quick';
    return 'priority';
  }
}

type ChecklistRiskTier = 'must' | 'should' | 'later';

interface ChecklistItem {
  id: string;
  cat: string;
  title: string;
  tip: string;
  /** PDF 每題備註 placeholder */
  notePlaceholder: string;
  /** PDF：必查／建議確認／可後補 */
  riskTier: ChecklistRiskTier;
}

/** InBody Phase 2：查核項結構化輸入類型（規格允許 number／text；目前查核題未使用） */
type ChecklistAnswerType = 'singleSelect' | 'multiSelect' | 'number' | 'text';

type RiskLevel = 'low' | 'medium' | 'high';

interface ItemRiskConfig {
  weight: number;
  riskLevel: RiskLevel;
}

interface ItemReportCopyConfig {
  positiveText: string;
  riskText: string;
  nextAction: string;
}

type QuickStatus = 'good' | 'ok' | 'attention' | 'bad' | 'unknown';

interface ItemState {
  checked: boolean;
  flagged: boolean;
  expanded: boolean;
  note: string;
  quickStatus: QuickStatus;
  selectedOptions: string[];
}

type ChecklistFilterId =
  | 'pending'
  | 'confirmed'
  | 'good'
  | 'ok'
  | 'attention'
  | 'bad'
  | 'priority_high'
  | 'priority_normal'
  | 'priority_later';
type ChecklistFilterGroupId = 'status' | 'quick' | 'priority';

type PropertyChoiceField =
  | 'buildingType'
  | 'floorLevel'
  | 'buildingAgeRange'
  | 'hasElevator'
  | 'hasManager'
  | 'managementFeeType'
  | 'depositMonths'
  | 'minLeaseTerm'
  | 'canCook'
  | 'canPet'
  | 'subsidyAvailable';

interface HouseRecord {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  monthlyRent: string;
  layoutType: string;
  layoutRooms: string;
  layoutLivingRooms: string;
  layoutBathrooms: string;
  layoutKitchenType: string;
  layoutAreaPing: string;
  layoutNotes: string;
  buildingType: string;
  floorLevel: string;
  buildingAgeRange: string;
  hasElevator: string;
  hasManager: string;
  managementFeeType: string;
  depositMonths: string;
  minLeaseTerm: string;
  canCook: string;
  canPet: string;
  subsidyAvailable: string;
  attachments: AttachmentMeta[];
  aiReportContent: AiReportContent | null;
  createdAt: number;
  updatedAt: number;
  state: Record<string, ItemState>;
}

interface AttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
}

interface AttachmentThumb {
  id: string;
  url: string;
  name: string;
}

interface BackupAttachmentPayload {
  id: string;
  mimeType: string;
  base64: string;
}

interface ParsedBackupPayload {
  records: HouseRecord[];
  activeRecordId: string;
  compareIds: string[];
  attachmentPayloads?: BackupAttachmentPayload[];
  checklistScopeMode?: ChecklistScopeMode;
}

interface BackupFileV1 {
  backupFormatVersion: number;
  app: string;
  exportedAt: number;
  data: {
    records: HouseRecord[];
    activeRecordId: string;
    compareIds: string[];
    checklistScopeMode?: ChecklistScopeMode;
  };
}

interface BackupFileV2 extends BackupFileV1 {
  backupFormatVersion: number;
  attachmentPayloads: BackupAttachmentPayload[];
}

interface ReportRow {
  title: string;
  note: string;
}

type ReportChecklistStatus = 'checked' | 'flagged' | 'pending';

interface ReportChecklistRow {
  category: string;
  title: string;
  status: ReportChecklistStatus;
  statusLabel: string;
  note: string;
  priority: number;
}

interface ReportNextAction {
  title: string;
  description: string;
}

interface AiReportBullet {
  title: string;
  description: string;
}

interface AiReportContent {
  conclusion: AiReportBullet;
  strengths: AiReportBullet[];
  risks: AiReportBullet[];
  nextActions: AiReportBullet[];
}

interface NominatimReverseResult {
  display_name?: string;
}

interface ReportSummaryBullet {
  title: string;
  description: string;
  priority: number;
}

interface ReportDataPayload {
  recordName: string;
  address: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    source: string;
  };
  monthlyRent: string;
  updatedAt: string;
  layout: Record<string, string>;
  property: Record<string, string>;
  score: {
    overall: number;
    overallScoreMethod: 'weighted_category_average';
    overallCategoryWeights: Array<{ axisId: string; label: string; weight: number }>;
    grade: 'A' | 'B' | 'C';
    gradeText: string;
    riskLevel: string;
    confidencePercent: number;
    confidenceLabel: string;
    confidenceHint: string;
    decisionTitle: string;
    decisionDescription: string;
    candidateAverageScore: number | null;
    candidateAverageBasis: 'compare_list' | 'other_records' | 'none';
    candidateAverageHint: string;
  };
  summary: {
    confirmedCount: number;
    checkedCount: number;
    flaggedCount: number;
    totalCount: number;
    pendingCount: number;
    keyRiskSummary: string;
  };
  categoryScores: Array<{
    axisId: string;
    name: string;
    score: number;
    weightInOverall: number;
    confirmed: number;
    total: number;
    flagged: number;
    pending: number;
    analysis: string;
  }>;
  aiSummaryFallback: {
    conclusion: {
      title: string;
      description: string;
    };
    strengths: Array<{ title: string; description: string }>;
    risks: Array<{ title: string; description: string }>;
  };
  checklistTable: Array<{
    itemId: string;
    category: string;
    item: string;
    answerType: ChecklistAnswerType;
    answers: string[];
    status: ReportChecklistStatus;
    statusLabel: string;
    quickStatus: QuickStatus;
    selectedOptions: string[];
    note: string;
    weight: number;
    riskLevel: RiskLevel;
  }>;
  importantChecklistTable: Array<{
    category: string;
    item: string;
    status: ReportChecklistStatus;
    statusLabel: string;
    note: string;
  }>;
  nextActions: Array<{ title: string; description: string }>;
}

interface CategoryEvaluationStat {
  label: string;
  total: number;
  done: number;
  flagged: number;
  pending: number;
  confirmed: number;
  score: number;
  analysis: string;
  doneRatio: number;
  flaggedRatio: number;
}
