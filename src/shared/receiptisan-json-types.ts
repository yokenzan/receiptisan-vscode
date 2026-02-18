/** receiptisan --preview --format=json の出力に対応する型定義 */

/** トップレベル: DigitalizedReceipt の配列 */
export type ReceiptisanJsonOutput = DigitalizedReceipt[];

/** 請求データファイル単位のルートオブジェクト。 */
export interface DigitalizedReceipt {
  seikyuu_ym: YearMonth;
  audit_payer: AuditPayer;
  hospital: Hospital;
  prefecture: Prefecture;
  receipts: Receipt[];
}

/** 患者 1 件分のレセプト本体。 */
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
  // 未使用
  // tensuu_shuukei: TensuuShuukei;
  nyuuin_date: DateValue | null;
  nyuuinryou_abbrev_labels: string[];
  byoushou_types: CodeNameShort[];
  kijun_marks: unknown | null;
}

// 共通型

/** 元号情報。 */
export interface Gengou {
  code: number;
  name: string;
  short_name: string;
  alphabet: string;
  base_year: number;
}

/** 和暦表現付きの日付要素。 */
export interface Wareki {
  gengou: Gengou;
  year: number;
  month: number;
  day?: number;
  text: string;
}

/** 年月値。 */
export interface YearMonth {
  year: number;
  month: number;
  wareki: Wareki;
}

/** 年月日値。 */
export interface DateValue {
  year: number;
  month: number;
  day: number;
  wareki: Wareki;
}

/** コードと名称の組み合わせ。 */
export interface CodeName {
  code: number | string;
  name: string;
}

/** コード・名称・短縮名の組み合わせ。 */
export interface CodeNameShort extends CodeName {
  short_name: string;
}

// 医療機関・保険者

/** 審査支払機関。 */
export interface AuditPayer extends CodeNameShort {}

/** 都道府県。 */
export interface Prefecture extends CodeNameShort {}

/** 医療機関情報。 */
export interface Hospital {
  code: string;
  name: string | null;
  tel: string;
  location: string;
  bed_count: number;
  is_hospital: boolean;
}

// レセプト種別

/** レセプトの種別分類。 */
export interface ReceiptType {
  tensuu_hyou_type: CodeName;
  main_hoken_type: CodeName;
  hoken_multiple_type: CodeName;
  patient_age_type: CodeName;
}

// 患者

/** 患者情報。 */
export interface Patient {
  id: string | null;
  name: string;
  name_kana: string | null;
  sex: CodeNameShort;
  birth_date: DateValue;
}

// 特記事項

/** 特記事項コード。 */
export type TokkiJikou = CodeName;

// 保険

/** 保険情報セット。 */
export interface Hokens {
  iryou_hoken: IryouHoken | null;
  kouhi_futan_iryous: KouhiFutanIryou[];
  main: string;
}

/** 医療保険情報。 */
export interface IryouHoken {
  hokenja_bangou: string;
  kigou: string | null;
  bangou: string;
  edaban: string | null;
  kyuufu_wariai: number | null;
  teishotoku_type: string | null;
}

/** 公費負担医療情報。 */
export interface KouhiFutanIryou {
  futansha_bangou: string;
  jukyuusha_bangou: string;
}

// 傷病名

/** 傷病名グループ。 */
export interface ShoubyoumeiGroup {
  start_date: DateValue;
  tenki: CodeName;
  is_main: boolean;
  shoubyoumeis: ShoubyoumeiEntry[];
}

/** 傷病名明細。 */
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

/** 傷病名マスタ。 */
export interface MasterShoubyoumei {
  code: string;
  name: string;
}

/** 傷病名修飾語マスタ。 */
export interface MasterShuushokugo {
  code: string;
  name: string;
}

// 適用欄

/** 摘要欄全体。 */
export interface Tekiyou {
  shinryou_shikibetsu_sections: ShinryouShikibetsuSection[];
}

/** 診療識別ごとの摘要セクション。 */
export interface ShinryouShikibetsuSection {
  shinryou_shikibetsu: CodeName;
  ichiren_units: IchirenUnit[];
}

/** 一連単位。 */
export interface IchirenUnit {
  futan_kubun: string;
  santei_units: SanteiUnit[];
}

/** 日別回数。 */
export interface DailyKaisuu {
  date: DateValue;
  kaisuu: number;
}

/** 算定単位。 */
export interface SanteiUnit {
  tensuu: number;
  kaisuu: number;
  daily_kaisuus?: DailyKaisuu[];
  items: TekiyouItem[];
}

// 適用欄の明細アイテム（discriminated union）

/** 摘要欄明細の Union 型。 */
export type TekiyouItem = ShinryouKouiItem | IyakuhinItem | TokuteiKizaiItem | CommentItem;

/** 摘要欄明細の共通形。 */
interface TekiyouItemBase {
  type: string;
  text: ItemText | string;
}

/** 摘要欄明細の表示テキスト要素。 */
export interface ItemText {
  product_name: string | null;
  master_name: string;
  unit_price: string | null;
  shiyouryou: string | null;
}

/** 診療行為明細。 */
export interface ShinryouKouiItem extends TekiyouItemBase {
  type: 'shinryou_koui';
  master: { type: 'shinryou_koui'; code: string; name: string };
  text: ItemText;
  shiyouryou: number | null;
  unit: CodeName | null;
  tensuu: number;
  kaisuu: number;
}

/** 医薬品明細。 */
export interface IyakuhinItem extends TekiyouItemBase {
  type: 'iyakuhin';
  master: { type: 'iyakuhin'; code: string; name: string };
  text: ItemText;
  shiyouryou: number | null;
  unit: CodeName | null;
  tensuu: number;
  kaisuu: number;
}

/** 特定器材明細。 */
export interface TokuteiKizaiItem extends TekiyouItemBase {
  type: 'tokutei_kizai';
  master: { type: 'tokutei_kizai'; code: string; name: string };
  text: ItemText;
  shiyouryou: number | null;
  unit: CodeName | null;
  tensuu: number;
  kaisuu: number;
}

/** コメント明細。 */
export interface CommentItem extends TekiyouItemBase {
  type: 'comment';
  master: { code: string; pattern: string; name: string };
  text: string;
  appended_content: { text: string } | null;
}

// 療養の給付

/** 療養の給付情報。 */
export interface RyouyouNoKyuufu {
  iryou_hoken: RyouyouIryouHoken | null;
  kouhi_futan_iryous: RyouyouKouhi[];
}

/** 医療保険の療養給付情報。 */
export interface RyouyouIryouHoken {
  goukei_tensuu: number;
  shinryou_jitsunissuu: number;
  ichibu_futankin: number | null;
  kyuufu_taishou_ichibu_futankin: number | null;
  shokuji_seikatsu_ryouyou_kaisuu: number | null;
  shokuji_seikatsu_ryouyou_goukei_kingaku: number | null;
  shokuji_seikatsu_ryouyou_hyoujun_futangaku: number;
}

/** 公費の療養給付情報。 */
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

/** 点数集計全体。 */
export interface TensuuShuukei {
  sections: Record<string, TensuuShuukeiSection>;
}

/** 点数集計セクション。 */
export interface TensuuShuukeiSection {
  section: string;
  hokens: Record<string, TensuuShuukeiHoken>;
}

/** 保険別の点数集計。 */
export interface TensuuShuukeiHoken {
  tensuu: number | null;
  total_kaisuu: number | null;
  total_tensuu: number | null;
  units: TensuuShuukeiUnit[];
}

/** 点数集計の単位明細。 */
export interface TensuuShuukeiUnit {
  tensuu: number;
  total_kaisuu: number;
  total_tensuu: number;
}
