/** receiptisan --preview --format=json の出力に対応する型定義 */

/** トップレベル: DigitalizedReceipt の配列 */
export type ReceiptisanJsonOutput = DigitalizedReceipt[];

export interface DigitalizedReceipt {
  seikyuu_ym: YearMonth;
  audit_payer: AuditPayer;
  hospital: Hospital;
  prefecture: Prefecture;
  receipts: Receipt[];
}

export interface Receipt {
  id: number;
  shinryou_ym: YearMonth;
  nyuugai: string;
  audit_payer: AuditPayer;
  prefecture: Prefecture;
  hospital: Hospital;
  type: ReceiptType;
  patient: Patient;
  tokki_jikous: TokkiJikou[];
  hokens: Hokens;
  classification: string;
  shoubyoumeis: ShoubyoumeiGroup[];
  tekiyou: Tekiyou;
  ryouyou_no_kyuufu: RyouyouNoKyuufu;
  tensuu_shuukei: TensuuShuukei;
  nyuuin_date: DateValue | null;
  nyuuinryou_abbrev_labels: string[];
  byoushou_types: string[];
  kijun_marks: unknown | null;
}

// 共通型

export interface Gengou {
  code: number;
  name: string;
  short_name: string;
  alphabet: string;
  base_year: number;
}

export interface Wareki {
  gengou: Gengou;
  year: number;
  month: number;
  day?: number;
  text: string;
}

export interface YearMonth {
  year: number;
  month: number;
  wareki: Wareki;
}

export interface DateValue {
  year: number;
  month: number;
  day: number;
  wareki: Wareki;
}

export interface CodeName {
  code: number | string;
  name: string;
}

export interface CodeNameShort extends CodeName {
  short_name: string;
}

// 医療機関・保険者

export interface AuditPayer extends CodeNameShort {}

export interface Prefecture extends CodeNameShort {}

export interface Hospital {
  code: string;
  name: string | null;
  tel: string;
  location: string;
  bed_count: number;
  is_hospital: boolean;
}

// レセプト種別

export interface ReceiptType {
  tensuu_hyou_type: CodeName;
  main_hoken_type: CodeName;
  hoken_multiple_type: CodeName;
  patient_age_type: CodeName;
}

// 患者

export interface Patient {
  id: string | null;
  name: string;
  name_kana: string | null;
  sex: CodeNameShort;
  birth_date: DateValue;
}

// 特記事項

export type TokkiJikou = CodeName;

// 保険

export interface Hokens {
  iryou_hoken: IryouHoken | null;
  kouhi_futan_iryous: KouhiFutanIryou[];
  main: string;
}

export interface IryouHoken {
  hokenja_bangou: string;
  kigou: string | null;
  bangou: string;
  edaban: string | null;
  kyuufu_wariai: number | null;
  teishotoku_type: string | null;
}

export interface KouhiFutanIryou {
  futansha_bangou: string;
  jukyuusha_bangou: string;
}

// 傷病名

export interface ShoubyoumeiGroup {
  start_date: DateValue;
  tenki: CodeName;
  is_main: boolean;
  shoubyoumeis: ShoubyoumeiEntry[];
}

export interface ShoubyoumeiEntry {
  master_shoubyoumei: MasterShoubyoumei;
  master_shuushokugos: MasterShuushokugo[];
  text: string;
  full_text: string;
  is_main: boolean;
  is_worpro: boolean;
  start_date: DateValue;
  tenki: CodeName;
  comment: string | null;
}

export interface MasterShoubyoumei {
  code: string;
  name: string;
}

export interface MasterShuushokugo {
  code: string;
  name: string;
}

// 適用欄

export interface Tekiyou {
  shinryou_shikibetsu_sections: ShinryouShikibetsuSection[];
}

export interface ShinryouShikibetsuSection {
  shinryou_shikibetsu: CodeName;
  ichiren_units: IchirenUnit[];
}

export interface IchirenUnit {
  futan_kubun: string;
  santei_units: SanteiUnit[];
}

export interface SanteiUnit {
  tensuu: number;
  kaisuu: number;
  items: TekiyouItem[];
}

// 適用欄の明細アイテム（discriminated union）

export type TekiyouItem = ShinryouKouiItem | IyakuhinItem | TokuteiKizaiItem | CommentItem;

interface TekiyouItemBase {
  type: string;
  text: ItemText | string;
}

export interface ItemText {
  product_name: string | null;
  master_name: string;
  unit_price: string | null;
  shiyouryou: string | null;
}

export interface ShinryouKouiItem extends TekiyouItemBase {
  type: 'shinryou_koui';
  master: { type: 'shinryou_koui'; code: string; name: string };
  text: ItemText;
  shiyouryou: number | null;
  unit: CodeName | null;
  tensuu: number;
  kaisuu: number;
}

export interface IyakuhinItem extends TekiyouItemBase {
  type: 'iyakuhin';
  master: { type: 'iyakuhin'; code: string; name: string };
  text: ItemText;
  shiyouryou: number | null;
  unit: CodeName | null;
  tensuu: number;
  kaisuu: number;
}

export interface TokuteiKizaiItem extends TekiyouItemBase {
  type: 'tokutei_kizai';
  master: { type: 'tokutei_kizai'; code: string; name: string };
  text: ItemText;
  shiyouryou: number | null;
  unit: CodeName | null;
  tensuu: number;
  kaisuu: number;
}

export interface CommentItem extends TekiyouItemBase {
  type: 'comment';
  master: { code: string; pattern: string; name: string };
  text: string;
  appended_content: { text: string } | null;
}

// 療養の給付

export interface RyouyouNoKyuufu {
  iryou_hoken: RyouyouIryouHoken | null;
  kouhi_futan_iryous: RyouyouKouhi[];
}

export interface RyouyouIryouHoken {
  goukei_tensuu: number;
  shinryou_jitsunissuu: number;
  ichibu_futankin: number | null;
  kyuufu_taishou_ichibu_futankin: number | null;
  shokuji_seikatsu_ryouyou_kaisuu: number | null;
  shokuji_seikatsu_ryouyou_goukei_kingaku: number | null;
  shokuji_seikatsu_ryouyou_hyoujun_futangaku: number;
}

export interface RyouyouKouhi {
  goukei_tensuu: number;
  shinryou_jitsunissuu: number;
  ichibu_futankin: number | null;
  kyuufu_taishou_ichibu_futankin: number | null;
  shokuji_seikatsu_ryouyou_kaisuu: number | null;
  shokuji_seikatsu_ryouyou_goukei_kingaku: number | null;
  shokuji_seikatsu_ryouyou_hyoujun_futangaku: number;
}

// 点数集計

export interface TensuuShuukei {
  sections: Record<string, TensuuShuukeiSection>;
}

export interface TensuuShuukeiSection {
  section: string;
  hokens: Record<string, TensuuShuukeiHoken>;
}

export interface TensuuShuukeiHoken {
  tensuu: number | null;
  total_kaisuu: number | null;
  total_tensuu: number | null;
  units: TensuuShuukeiUnit[];
}

export interface TensuuShuukeiUnit {
  tensuu: number;
  total_kaisuu: number;
  total_tensuu: number;
}
