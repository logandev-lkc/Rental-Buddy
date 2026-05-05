import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
    { id: 's1', cat: 'safety', title: '對外窗方向', tip: '採光與通風會直接影響居住舒適度。' },
    { id: 's2', cat: 'safety', title: '是否有壁癌 / 漏水', tip: '注意牆角、窗框與天花板痕跡。' },
    { id: 's3', cat: 'safety', title: '頂加 / 違建確認', tip: '評估噪音、熱度與潛在風險。' },
    { id: 's4', cat: 'safety', title: '門鎖安全性', tip: '確認鎖具狀況，是否可換鎖。' },
    { id: 's5', cat: 'safety', title: '滅火器 / 逃生設備', tip: '確認逃生動線與設施可用性。' },
    { id: 's6', cat: 'safety', title: '隔音狀況', tip: '現場安靜不代表夜晚安靜，建議多問。' },
    { id: 'l1', cat: 'living', title: '附近超市 / 便利商店', tip: '步行 5 分鐘內有採買點最方便。' },
    { id: 'l2', cat: 'living', title: '通勤路線確認', tip: '建議實際走一趟通勤路線。' },
    { id: 'l3', cat: 'living', title: '垃圾處理方式', tip: '確認垃圾車時間與分類方式。' },
    { id: 'l4', cat: 'living', title: '洗衣機排水問題', tip: '注意排水孔與浴室地排是否順。' },
    { id: 'l5', cat: 'living', title: '手機訊號強度', tip: '不同角落都測一下比較準。' },
    { id: 'n1', cat: 'neighbor', title: '鄰居組成', tip: '觀察生活作息是否與自己相容。' },
    { id: 'n2', cat: 'neighbor', title: '房東溝通風格', tip: '看房互動能反映未來溝通品質。' },
    { id: 'n3', cat: 'neighbor', title: '周邊噪音來源', tip: '注意夜市、酒吧、工地等噪音風險。' },
    { id: 'n4', cat: 'neighbor', title: '大樓管理員', tip: '有管理員通常更安全也更便利。' }
  ];

  records: HouseRecord[] = [];
  activeRecordId = '';
  compareIds: string[] = [];
  draftRecordName = '';
  currentCat = 'all';
  showIntro = true;
  reportOpen = false;

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

  get compareRecords(): HouseRecord[] {
    return this.compareIds
      .map((id) => this.records.find((record) => record.id === id))
      .filter((record): record is HouseRecord => Boolean(record));
  }

  get canCompare(): boolean {
    return this.compareRecords.length >= 2;
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

  get leftCount(): number {
    return this.totalCount - this.doneCount - this.flaggedCount;
  }

  get progressPercent(): number {
    return Math.round((this.doneCount / this.totalCount) * 100);
  }

  get flaggedItems(): ChecklistItem[] {
    return this.items.filter((item) => this.state[item.id]?.flagged);
  }

  setCategory(cat: string): void {
    this.currentCat = cat;
  }

  toggleCheck(id: string): void {
    const current = this.state[id];
    if (!current) return;
    current.checked = !current.checked;
    if (current.checked) current.flagged = false;
    this.touchActiveRecord();
  }

  toggleFlag(id: string, event: Event): void {
    event.stopPropagation();
    const current = this.state[id];
    if (!current) return;
    current.flagged = !current.flagged;
    if (current.flagged) current.checked = false;
    this.touchActiveRecord();
  }

  toggleExpand(id: string, event: Event): void {
    event.stopPropagation();
    const current = this.state[id];
    if (!current) return;
    current.expanded = !current.expanded;
    this.touchActiveRecord();
  }

  countDoneByCategory(cat: string): string {
    const items = this.items.filter((item) => item.cat === cat);
    const done = items.filter((item) => this.state[item.id]?.checked).length;
    return `${done}/${items.length}`;
  }

  switchRecord(recordId: string): void {
    if (!this.records.some((record) => record.id === recordId)) return;
    this.activeRecordId = recordId;
    this.saveState();
  }

  createRecord(): void {
    const index = this.records.length + 1;
    const name = this.draftRecordName.trim() || `看房紀錄 ${index}`;
    const record: HouseRecord = {
      id: this.createId(),
      name,
      address: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: this.createEmptyState()
    };
    this.records.unshift(record);
    this.activeRecordId = record.id;
    this.draftRecordName = '';
    this.saveState();
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

  openReport(): void {
    this.reportOpen = true;
  }

  closeReport(): void {
    this.reportOpen = false;
  }

  resetAll(): void {
    if (!window.confirm('確定要重置所有勾選記錄嗎？')) return;
    this.items.forEach((item) => {
      this.state[item.id] = { checked: false, flagged: false, expanded: false };
    });
    this.activeRecord.address = '';
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: this.createEmptyState()
      };
      this.records = [firstRecord];
    }

    if (!this.records.some((record) => record.id === this.activeRecordId)) {
      this.activeRecordId = this.records[0].id;
    }

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

  private normalizeRecord(record: HouseRecord): HouseRecord {
    return {
      id: record.id,
      name: record.name || '未命名',
      address: record.address || '',
      createdAt: record.createdAt || Date.now(),
      updatedAt: record.updatedAt || Date.now(),
      state: {
        ...this.createEmptyState(),
        ...(record.state ?? {})
      }
    };
  }

  private createEmptyState(): Record<string, ItemState> {
    const nextState: Record<string, ItemState> = {};
    this.items.forEach((item) => {
      nextState[item.id] = { checked: false, flagged: false, expanded: false };
    });
    return nextState;
  }

  private countDoneForRecord(record: HouseRecord): number {
    return this.items.filter((item) => record.state[item.id]?.checked).length;
  }

  private countFlaggedForRecord(record: HouseRecord): number {
    return this.items.filter((item) => record.state[item.id]?.flagged).length;
  }

  getRecordDone(record: HouseRecord): number {
    return this.countDoneForRecord(record);
  }

  getRecordFlagged(record: HouseRecord): number {
    return this.countFlaggedForRecord(record);
  }

  getRecordScore(record: HouseRecord): number {
    return Math.round((this.countDoneForRecord(record) / this.totalCount) * 100);
  }

  private createId(): string {
    return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

interface ChecklistItem {
  id: string;
  cat: string;
  title: string;
  tip: string;
}

interface ItemState {
  checked: boolean;
  flagged: boolean;
  expanded: boolean;
}

interface HouseRecord {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  updatedAt: number;
  state: Record<string, ItemState>;
}
