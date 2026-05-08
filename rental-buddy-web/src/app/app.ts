import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly storageKey = 'rental-buddy-records-v1';
  readonly categories = [
    { id: 'all', label: '全部' },
    { id: 'contract', label: '合約條件' },
    { id: 'facility', label: '設備狀態' },
    { id: 'safety', label: '安全採光' },
    { id: 'living', label: '生活機能' },
    { id: 'neighbor', label: '環境鄰居' }
  ];

  readonly categoryMap: Record<string, string> = {
    contract: '合約條件',
    facility: '設備狀態',
    safety: '安全採光',
    living: '生活機能',
    neighbor: '環境鄰居'
  };

  // 5 個分類對應到「五角形」雷達圖軸
  readonly radarAxisIds = ['contract', 'facility', 'safety', 'living', 'neighbor'] as const;
  readonly radarRingRatios = [0.25, 0.5, 0.75] as const;
  /** 比較雷達圖：色相差距大，避免紅棕綠相近難辨識 */
  readonly radarColors = ['#D97B6C', '#2563EB', '#059669', '#CA8A04', '#7C3AED'];

  readonly radarCenter = 150;
  readonly radarRadius = 86;
  readonly quickStatusOptions: Array<{ value: QuickStatus; label: string }> = [
    { value: 'good', label: '良好' },
    { value: 'ok', label: '可接受' },
    { value: 'attention', label: '需注意' },
    { value: 'unknown', label: '尚未確認' }
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

  readonly items: ChecklistItem[] = [
    { id: 'c1', cat: 'contract', title: '租屋補助資格', tip: '部分房東不願配合申請租屋補助，租前務必確認。' },
    { id: 'c2', cat: 'contract', title: '水電費計算方式', tip: '確認是台電計價或房東自訂價。' },
    { id: 'c3', cat: 'contract', title: '押金金額', tip: '依法押金不得超過兩個月租金。' },
    { id: 'c4', cat: 'contract', title: '管理費另計嗎', tip: '確認管理費金額與繳費方式。' },
    { id: 'c5', cat: 'contract', title: '合約期限與違約金', tip: '先確認提前解約條件，避免後續爭議。' },
    { id: 'c6', cat: 'contract', title: '網路費用', tip: '確認是否含網路，若不含是否可自行安裝。' },
    { id: 'c7', cat: 'contract', title: '可否養寵物 / 開伙', tip: '租前先談清楚，避免入住後衝突。' },
    { id: 'f1', cat: 'facility', title: '冷氣是否為變頻款', tip: '變頻通常更省電，長住差很多。' },
    { id: 'f2', cat: 'facility', title: '熱水能持續多久', tip: '現場實測 30 秒以上確認穩定。' },
    { id: 'f3', cat: 'facility', title: '飲水機 / 濾水設備', tip: '若沒有，需自行添購並估算成本。' },
    { id: 'f4', cat: 'facility', title: 'WiFi 是否穩定', tip: '可用手機現場測速。' },
    { id: 'f5', cat: 'facility', title: '洗曬衣空間', tip: '確認獨立或共用，是否有額外費用。' },
    { id: 'f6', cat: 'facility', title: '廚房設備', tip: '確認冰箱、爐具、抽風等是否正常。' },
    { id: 'f7', cat: 'facility', title: '工作空間', tip: '若常在家工作，桌面與插座很重要。' },
    { id: 'f8', cat: 'facility', title: '停車空間', tip: '確認位置、費用、進出動線。' },
    { id: 'f9', cat: 'facility', title: '插座與電力配置', tip: '確認插座數量、位置與是否老舊，避免延長線過多。' },
    { id: 'f10', cat: 'facility', title: '收納空間', tip: '確認衣櫃、鞋櫃與雜物空間是否足夠。' },
    { id: 's1', cat: 'safety', title: '對外窗方向', tip: '採光與通風會直接影響居住舒適度。' },
    { id: 's2', cat: 'safety', title: '是否有壁癌 / 漏水', tip: '注意牆角、窗框與天花板痕跡。' },
    { id: 's3', cat: 'safety', title: '頂加 / 違建確認', tip: '評估噪音、熱度與潛在風險。' },
    { id: 's4', cat: 'safety', title: '門鎖安全性', tip: '確認鎖具狀況，是否可換鎖。' },
    { id: 's5', cat: 'safety', title: '滅火器 / 逃生設備', tip: '確認逃生動線與設施可用性。' },
    { id: 's6', cat: 'safety', title: '隔音狀況', tip: '現場安靜不代表夜晚安靜，建議多問。' },
    { id: 's7', cat: 'safety', title: '浴室通風與乾濕狀況', tip: '確認是否有對外窗或抽風設備，並觀察潮濕與霉味。' },
    { id: 'l1', cat: 'living', title: '附近超市 / 便利商店', tip: '步行 5 分鐘內有採買點最方便。' },
    { id: 'l2', cat: 'living', title: '通勤路線確認', tip: '建議實際走一趟通勤路線。' },
    { id: 'l3', cat: 'living', title: '垃圾處理方式', tip: '確認垃圾車時間與分類方式。' },
    { id: 'l4', cat: 'living', title: '洗衣機排水問題', tip: '注意排水孔與浴室地排是否順。' },
    { id: 'l5', cat: 'living', title: '手機訊號強度', tip: '不同角落都測一下比較準。' },
    { id: 'n1', cat: 'neighbor', title: '鄰居組成', tip: '觀察生活作息是否與自己相容。' },
    { id: 'n2', cat: 'neighbor', title: '房東溝通風格', tip: '看房互動能反映未來溝通品質。' },
    { id: 'n3', cat: 'neighbor', title: '周邊噪音來源', tip: '注意夜市、酒吧、工地等噪音風險。' },
    { id: 'n4', cat: 'neighbor', title: '大樓管理員', tip: '有管理員通常更安全也更便利。' },
    { id: 'n5', cat: 'neighbor', title: '室內氣味', tip: '留意菸味、油煙味、霉味或寵物味，這些通常不容易短期改善。' },
    { id: 'n6', cat: 'neighbor', title: '蟲害跡象', tip: '檢查廚房、浴室、排水孔與櫃體角落是否有蟑螂、螞蟻或蟲卵痕跡。' }
  ];

  readonly itemRiskConfig: Record<string, ItemRiskConfig> = {
    c1: { weight: 3, riskLevel: 'medium' },
    c2: { weight: 4, riskLevel: 'medium' },
    c3: { weight: 4, riskLevel: 'high' },
    c4: { weight: 3, riskLevel: 'medium' },
    c5: { weight: 5, riskLevel: 'high' },
    c6: { weight: 2, riskLevel: 'low' },
    c7: { weight: 3, riskLevel: 'medium' },
    f1: { weight: 3, riskLevel: 'medium' },
    f2: { weight: 4, riskLevel: 'high' },
    f3: { weight: 1, riskLevel: 'low' },
    f4: { weight: 2, riskLevel: 'medium' },
    f5: { weight: 3, riskLevel: 'medium' },
    f6: { weight: 3, riskLevel: 'medium' },
    f7: { weight: 2, riskLevel: 'low' },
    f8: { weight: 2, riskLevel: 'low' },
    f9: { weight: 3, riskLevel: 'medium' },
    f10: { weight: 2, riskLevel: 'low' },
    s1: { weight: 3, riskLevel: 'medium' },
    s2: { weight: 5, riskLevel: 'high' },
    s3: { weight: 5, riskLevel: 'high' },
    s4: { weight: 5, riskLevel: 'high' },
    s5: { weight: 5, riskLevel: 'high' },
    s6: { weight: 4, riskLevel: 'medium' },
    s7: { weight: 4, riskLevel: 'medium' },
    l1: { weight: 2, riskLevel: 'low' },
    l2: { weight: 4, riskLevel: 'medium' },
    l3: { weight: 3, riskLevel: 'medium' },
    l4: { weight: 4, riskLevel: 'high' },
    l5: { weight: 2, riskLevel: 'low' },
    n1: { weight: 3, riskLevel: 'medium' },
    n2: { weight: 4, riskLevel: 'high' },
    n3: { weight: 4, riskLevel: 'high' },
    n4: { weight: 3, riskLevel: 'medium' },
    n5: { weight: 4, riskLevel: 'medium' },
    n6: { weight: 5, riskLevel: 'high' }
  };

  readonly itemReportCopyConfig: Record<string, ItemReportCopyConfig> = {
    c2: {
      positiveText: '費用計算方式清楚，可降低入住後帳單爭議。',
      riskText: '水電計價不明容易造成長期支出超出預期。',
      nextAction: '請房東提供水電計價方式，並確認是否可寫進租約。'
    },
    c3: {
      positiveText: '押金條件已確認，簽約金額較可控。',
      riskText: '押金條件異常可能增加簽約風險與退租爭議。',
      nextAction: '確認押金月數、退還條件與扣款規則。'
    },
    c5: {
      positiveText: '合約期限與違約金已確認，租期風險較低。',
      riskText: '提前解約或違約金不清楚，可能影響搬遷彈性。',
      nextAction: '要求提前解約條件與違約金計算方式白紙黑字列入合約。'
    },
    f2: {
      positiveText: '熱水穩定，基本生活舒適度較有保障。',
      riskText: '熱水不穩會直接影響日常使用，尤其冬天風險較高。',
      nextAction: '現場連續測試熱水 1 到 2 分鐘，確認水溫與水壓。'
    },
    f6: {
      positiveText: '廚房設備已確認，日常使用與開伙需求較明確。',
      riskText: '廚房設備不明可能帶來油煙、用電與維修責任問題。',
      nextAction: '確認爐具、抽風、冰箱與維修責任。'
    },
    f9: {
      positiveText: '插座與電力配置足夠，日常使用與工作需求較穩定。',
      riskText: '插座不足或線路老舊可能造成使用不便與用電安全疑慮。',
      nextAction: '檢查主要使用區的插座數量、位置與是否有燒焦或鬆動痕跡。'
    },
    f10: {
      positiveText: '收納空間已確認，長住時物品擺放壓力較小。',
      riskText: '收納不足會讓小坪數房源更容易雜亂，影響長住舒適度。',
      nextAction: '確認衣櫃、鞋櫃與床下或高處收納是否足夠。'
    },
    s2: {
      positiveText: '目前未見明顯漏水或壁癌，屋況風險較低。',
      riskText: '壁癌或漏水屬重大屋況風險，可能影響健康與修繕成本。',
      nextAction: '拍照記錄牆角、窗框與天花板，並詢問是否曾漏水。'
    },
    s3: {
      positiveText: '建物狀態已確認，法規與安全疑慮較少。',
      riskText: '頂加或違建可能帶來隔熱、防火與租約保障風險。',
      nextAction: '確認是否為合法使用空間，必要時避免簽長約。'
    },
    s4: {
      positiveText: '門鎖安全已確認，入住安全性較高。',
      riskText: '門鎖或門框不穩會直接影響人身與財物安全。',
      nextAction: '確認是否可換鎖，並檢查門框、鎖舌與防盜鏈。'
    },
    s5: {
      positiveText: '逃生與消防設備已確認，安全基礎較完整。',
      riskText: '逃生設備不足屬高風險項目，不建議忽略。',
      nextAction: '實際走一次逃生路線，確認滅火器、警報器與出口。'
    },
    s6: {
      positiveText: '隔音狀況可接受，居住穩定性較高。',
      riskText: '隔音問題可能長期影響睡眠與生活品質。',
      nextAction: '建議晚上或尖峰時段再訪，確認車流與鄰戶噪音。'
    },
    s7: {
      positiveText: '浴室通風狀況已確認，潮濕與霉味風險較低。',
      riskText: '浴室通風不佳容易造成潮濕、霉味與清潔負擔。',
      nextAction: '確認是否有對外窗或抽風機，並觀察天花板、矽利康與牆角是否發霉。'
    },
    l2: {
      positiveText: '通勤路線已確認，日常移動成本較可預期。',
      riskText: '通勤不明會放大時間成本，入住後較難改善。',
      nextAction: '用實際通勤時間測試尖峰與離峰路線。'
    },
    l3: {
      positiveText: '垃圾處理方式已確認，日常生活銜接較順。',
      riskText: '垃圾處理不便會造成長期生活負擔。',
      nextAction: '確認垃圾車時間、代收方式與是否需專用垃圾袋。'
    },
    l4: {
      positiveText: '排水狀況已確認，浴室與洗衣使用風險較低。',
      riskText: '排水不良容易造成積水、異味與潮濕問題。',
      nextAction: '現場測試排水速度，並查看地排是否有異味。'
    },
    n2: {
      positiveText: '房東溝通順暢，後續維修與協調風險較低。',
      riskText: '房東溝通不佳可能讓維修、押金與合約問題放大。',
      nextAction: '觀察房東是否願意明確回答費用、修繕與合約細節。'
    },
    n3: {
      positiveText: '周邊噪音來源已確認，生活品質較可預期。',
      riskText: '周邊噪音可能長期影響睡眠與居住舒適度。',
      nextAction: '晚上 20:00 後再訪一次，並確認附近是否有酒吧、工地或車流。'
    },
    n5: {
      positiveText: '室內氣味狀況可接受，入住後清潔與適應成本較低。',
      riskText: '菸味、油煙味、霉味或寵物味通常不容易短期改善。',
      nextAction: '關窗停留數分鐘後再次確認氣味來源，必要時詢問是否可深度清潔。'
    },
    n6: {
      positiveText: '目前未見明顯蟲害跡象，衛生風險較低。',
      riskText: '蟲害通常代表環境或管線問題，入住後處理成本高。',
      nextAction: '檢查廚房、浴室、排水孔與櫃體角落，並詢問是否定期消毒。'
    }
  };

  readonly itemOptionConfig: Record<string, string[]> = {
    c2: ['台水台電', '房東自訂', '包水電', '需確認'],
    c3: ['1個月', '2個月', '超過2個月', '需確認'],
    c5: ['一年約', '半年約', '可提前解約', '違約金需確認'],
    f2: ['熱水穩定', '水壓偏弱', '忽冷忽熱', '需現場測試'],
    f4: ['訊號穩定', '速度偏慢', '需測速', '可自行申辦'],
    f6: ['有冰箱', '有爐具', '抽風佳', '油煙需注意'],
    f9: ['插座足夠', '位置不便', '線路老舊', '需延長線'],
    f10: ['衣櫃足夠', '鞋櫃不足', '雜物空間少', '可接受'],
    s2: ['無明顯痕跡', '牆角潮濕', '窗框水痕', '天花板異常'],
    s4: ['門鎖穩固', '可換鎖', '門框鬆動', '需加強'],
    s6: ['安靜', '車流聲', '鄰戶聲', '晚上需複查'],
    s7: ['有對外窗', '有抽風機', '霉味明顯', '排水需確認'],
    l2: ['步行可到捷運', '需轉乘', '通勤偏久', '尖峰需測試'],
    l3: ['垃圾代收', '追垃圾車', '固定時段', '需確認'],
    l4: ['排水順', '排水慢', '有異味', '需測試'],
    n2: ['回覆清楚', '態度保留', '條件模糊', '需白紙黑字'],
    n3: ['環境安靜', '車流噪音', '店家噪音', '夜間需複查'],
    n5: ['無異味', '菸味', '霉味', '油煙味', '寵物味'],
    n6: ['無明顯痕跡', '蟑螂跡象', '螞蟻', '排水孔可疑']
  };

  readonly riskOptionKeywords = [
    '需確認',
    '需測試',
    '需複查',
    '需注意',
    '不明',
    '偏弱',
    '偏慢',
    '不便',
    '不足',
    '老舊',
    '鬆動',
    '潮濕',
    '水痕',
    '異常',
    '車流',
    '鄰戶',
    '噪音',
    '霉味',
    '異味',
    '菸味',
    '油煙',
    '寵物味',
    '蟑螂',
    '螞蟻',
    '可疑',
    '條件模糊',
    '態度保留',
    '通勤偏久',
    '轉乘',
    '追垃圾車',
    '排水慢',
    '延長線'
  ];

  records: HouseRecord[] = [];
  activeRecordId = '';
  compareIds: string[] = [];
  draftRecordName = '';
  editingRecordName = '';
  isRecordMenuOpen = false;
  isCategoryMenuOpen = false;
  currentCat = 'all';
  currentPage: 'checklist' | 'report' = 'checklist';
  reportViewMode: 'friendly' | 'compact' = 'friendly';
  reportDataCopyState = '';
  showAiImportPanel = false;
  aiReportDraftInput = '';
  aiReportImportMessage = '';
  showIntro = true;

  constructor() {
    this.loadState();
  }

  startApp(): void {
    this.showIntro = false;
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

  getPropertyChoiceValue(field: PropertyChoiceField): string {
    return this.activeRecord?.[field] ?? '';
  }

  setPropertyChoice(field: PropertyChoiceField, value: string): void {
    if (!this.activeRecord) return;
    this.activeRecord[field] = this.activeRecord[field] === value ? '' : value;
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
      this.activeRecord?.subsidyAvailable || ''
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : '未填寫';
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

  get filteredItems(): ChecklistItem[] {
    return this.currentCat === 'all'
      ? this.items
      : this.items.filter((item) => item.cat === this.currentCat);
  }

  get groupedItems(): Array<{ cat: string; items: ChecklistItem[] }> {
    const groups = new Map<string, ChecklistItem[]>();
    this.filteredItems.forEach((item) => {
      const list = groups.get(item.cat) ?? [];
      list.push(item);
      groups.set(item.cat, list);
    });
    return Array.from(groups.entries()).map(([cat, items]) => ({ cat, items }));
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

  /** 100 分制：房源品質分數，風險扣分為主，資料不足只針對高權重項目少量扣分 */
  get reportScore100(): number {
    return this.getRecordScore(this.activeRecord);
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
    const candidates = this.records.filter((record) => {
      if (record.id === this.activeRecord.id) return false;
      return this.countDoneForRecord(record) + this.countFlaggedForRecord(record) > 0;
    });
    if (candidates.length === 0) return null;
    const total = candidates.reduce((sum, record) => sum + this.getRecordScore(record), 0);
    return Math.round(total / candidates.length);
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

  setCategory(cat: string): void {
    this.currentCat = cat;
  }

  getCategoryDisplayLabel(catId: string): string {
    const cat = this.categories.find((item) => item.id === catId);
    if (!cat) return '全部';
    if (cat.id === 'all') return `${cat.label}（${this.doneCount}/${this.totalCount}）`;
    return `${cat.label}（${this.countDoneByCategory(cat.id)}）`;
  }

  setPage(page: 'checklist' | 'report'): void {
    this.currentPage = page;
  }

  setReportViewMode(mode: 'friendly' | 'compact'): void {
    this.reportViewMode = mode;
  }

  toggleCheck(id: string): void {
    const current = this.state[id];
    if (!current) return;
    current.checked = !current.checked;
    if (current.checked) current.flagged = false;
    current.quickStatus = current.checked ? 'good' : 'unknown';
    this.touchActiveRecord();
  }

  toggleFlag(id: string, event: Event): void {
    event.stopPropagation();
    const current = this.state[id];
    if (!current) return;
    current.flagged = !current.flagged;
    if (current.flagged) current.checked = false;
    current.quickStatus = current.flagged ? 'attention' : 'unknown';
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
    current.quickStatus = status;
    current.checked = status === 'good' || status === 'ok';
    current.flagged = status === 'attention';
    this.touchActiveRecord();
  }

  getItemOptions(id: string): string[] {
    return this.itemOptionConfig[id] ?? [];
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
    this.touchActiveRecord();
  }

  isRiskOption(option: string): boolean {
    return this.riskOptionKeywords.some((keyword) => option.includes(keyword));
  }

  countDoneByCategory(cat: string): string {
    const items = this.items.filter((item) => item.cat === cat);
    const confirmed = items.filter((item) => this.state[item.id]?.checked || this.state[item.id]?.flagged).length;
    return `${confirmed}/${items.length}`;
  }

  switchRecord(recordId: string): void {
    if (!this.records.some((record) => record.id === recordId)) return;
    this.activeRecordId = recordId;
    this.syncEditingRecordName();
    this.isRecordMenuOpen = false;
    this.saveState();
  }

  toggleRecordMenu(event: Event): void {
    event.stopPropagation();
    this.isRecordMenuOpen = !this.isRecordMenuOpen;
    if (this.isRecordMenuOpen) this.isCategoryMenuOpen = false;
  }

  selectRecordOption(recordId: string): void {
    this.switchRecord(recordId);
    this.isRecordMenuOpen = false;
  }

  toggleCategoryMenu(event: Event): void {
    event.stopPropagation();
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
    if (this.isCategoryMenuOpen) {
      this.isRecordMenuOpen = false;
    }
  }

  selectCategoryOption(catId: string): void {
    this.setCategory(catId);
    this.isCategoryMenuOpen = false;
  }

  createRecord(): void {
    const index = this.records.length + 1;
    const name = this.draftRecordName.trim() || `看房紀錄 ${index}`;
    const record: HouseRecord = {
      id: this.createId(),
      name,
      address: '',
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
      aiReportContent: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: this.createEmptyState()
    };
    this.records.unshift(record);
    this.activeRecordId = record.id;
    this.draftRecordName = '';
    this.syncEditingRecordName();
    this.saveState();
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
  }

  deleteActiveRecord(): void {
    if (this.records.length <= 1) {
      window.alert('至少需要保留一筆看房紀錄。');
      return;
    }
    if (!window.confirm(`確定要刪除「${this.activeRecord.name}」嗎？`)) return;
    const removedId = this.activeRecordId;
    this.records = this.records.filter((record) => record.id !== removedId);
    this.compareIds = this.compareIds.filter((id) => id !== removedId);
    this.activeRecordId = this.records[0].id;
    this.syncEditingRecordName();
    this.saveState();
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
    this.currentPage = 'report';
    this.reportViewMode = 'friendly';
  }

  saveNow(): void {
    this.touchActiveRecord();
  }

  resetAll(): void {
    if (!window.confirm('確定要重置所有勾選記錄嗎？')) return;
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
    const items = this.items.filter((item) => item.cat === axisId);
    const penalty = items.reduce((sum, item) => {
      const state = this.state[item.id];
      const config = this.getItemRiskConfig(item);
      if (state?.flagged) return sum + config.weight * this.getRiskPenaltyMultiplier(config.riskLevel);
      if (!state?.checked && config.weight >= 4) return sum + Math.ceil(config.weight * 0.8);
      return sum;
    }, 0);
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
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
        const priority =
          (status === 'flagged' ? 300 : status === 'pending' ? 200 : 100) +
          config.weight * 10 +
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
        grade: this.reportGrade,
        gradeText: this.reportGradeText,
        riskLevel: this.reportRiskLevelLabel,
        confidencePercent: this.reportConfidencePercent,
        confidenceLabel: this.reportConfidenceLabel,
        confidenceHint: this.reportConfidenceHint,
        decisionTitle: this.reportDecisionTitle,
        decisionDescription: this.reportDecisionDesc,
        candidateAverageScore: this.candidateAverageScore
      },
      summary: {
        confirmedCount: this.confirmedCount,
        checkedCount: this.doneCount,
        flaggedCount: this.flaggedCount,
        totalCount: this.totalCount,
        pendingCount: this.leftCount,
        keyRiskSummary: this.reportKeyRiskSummary
      },
      categoryScores: this.reportCategoryStats.map((stat) => ({
        name: stat.label,
        score: stat.score,
        confirmed: stat.confirmed,
        total: stat.total,
        flagged: stat.flagged,
        pending: stat.pending,
        analysis: stat.analysis
      })),
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
        return {
          category: this.categoryMap[item.cat] ?? item.cat,
          item: item.title,
          status,
          statusLabel: this.getChecklistStatusLabel(status),
          quickStatus: state?.quickStatus ?? 'unknown',
          selectedOptions: state?.selectedOptions ?? [],
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
- selectedOptions 是現場快速點選的細節，請優先引用具體內容。
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
      };
      this.records = (saved.records ?? []).map((record) => this.normalizeRecord(record));
      this.activeRecordId = saved.activeRecordId ?? '';
      this.compareIds = (saved.compareIds ?? []).filter((id) =>
        this.records.some((record) => record.id === id)
      );
    } catch {
      this.records = [];
      this.activeRecordId = '';
      this.compareIds = [];
    }

    if (this.records.length === 0) {
      const firstRecord: HouseRecord = {
        id: this.createId(),
        name: '看房紀錄 1',
        address: '',
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
        aiReportContent: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: this.createEmptyState()
      };
      this.records = [firstRecord];
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
        compareIds: this.compareIds
      })
    );
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
    this.items.forEach((item) => {
      const state = normalizedState[item.id];
      if (!state.quickStatus) {
        state.quickStatus = state.flagged ? 'attention' : state.checked ? 'good' : 'unknown';
      }
      state.selectedOptions = state.selectedOptions ?? [];
    });

    return {
      id: record.id,
      name: record.name || '未命名',
      address: record.address || '',
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
      aiReportContent: this.normalizeAiReportContent(record.aiReportContent) ?? null,
      createdAt: record.createdAt || Date.now(),
      updatedAt: record.updatedAt || Date.now(),
      state: normalizedState
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
    return this.quickStatusOptions.find((option) => option.value === status)?.label ?? '尚未確認';
  }

  private formatChecklistNote(state: ItemState | undefined, status: ReportChecklistStatus): string {
    const note = state?.note?.trim();
    const selectedOptions = state?.selectedOptions?.length ? `細節：${state.selectedOptions.join('、')}` : '';
    if (note && selectedOptions) return `${note}（${selectedOptions}）`;
    if (note) return note;
    if (selectedOptions) return selectedOptions;
    if (state?.quickStatus && state.quickStatus !== 'unknown') {
      return `快速狀態：${this.getQuickStatusLabel(state.quickStatus)}`;
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
    const score = 100 - this.getRecordFlaggedPenalty(record) - this.getRecordPendingPenalty(record);
    return Math.max(0, Math.min(100, Math.round(score)));
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

  getRecordCategoryScoreRatio(record: HouseRecord, axisId: string): number {
    const catItems = this.items.filter((item) => item.cat === axisId);
    if (catItems.length === 0) return 0;
    const penalty = catItems.reduce((sum, item) => {
      const state = record.state[item.id];
      const config = this.getItemRiskConfig(item);
      if (state?.flagged) return sum + config.weight * this.getRiskPenaltyMultiplier(config.riskLevel);
      if (!state?.checked && config.weight >= 4) return sum + Math.ceil(config.weight * 0.8);
      return sum;
    }, 0);
    return Math.max(0, Math.min(1, (100 - penalty) / 100));
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.custom-select') && !target?.closest('.record-menu')) {
      this.isRecordMenuOpen = false;
      this.isCategoryMenuOpen = false;
    }
  }
}

interface ChecklistItem {
  id: string;
  cat: string;
  title: string;
  tip: string;
}

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

interface ItemState {
  checked: boolean;
  flagged: boolean;
  expanded: boolean;
  note: string;
  quickStatus: QuickStatus;
  selectedOptions: string[];
}

type QuickStatus = 'good' | 'ok' | 'attention' | 'unknown';

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
  aiReportContent: AiReportContent | null;
  createdAt: number;
  updatedAt: number;
  state: Record<string, ItemState>;
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

interface ReportSummaryBullet {
  title: string;
  description: string;
  priority: number;
}

interface ReportDataPayload {
  recordName: string;
  address: string;
  monthlyRent: string;
  updatedAt: string;
  layout: Record<string, string>;
  property: Record<string, string>;
  score: {
    overall: number;
    grade: 'A' | 'B' | 'C';
    gradeText: string;
    riskLevel: string;
    confidencePercent: number;
    confidenceLabel: string;
    confidenceHint: string;
    decisionTitle: string;
    decisionDescription: string;
    candidateAverageScore: number | null;
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
    name: string;
    score: number;
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
    category: string;
    item: string;
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
