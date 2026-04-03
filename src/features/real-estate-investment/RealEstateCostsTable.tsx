import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { TableRow, TableColumn } from '@/types/table';

const costs: TableRow[] = [
  {
    item: "頭金（10%）",
    amount: "200万円",
    note: "融資率90%の場合",
    isTotal: false
  },
  {
    item: "仲介手数料",
    amount: "66万円",
    note: "(2,000万円×3%+6万円)×1.1",
    isTotal: false
  },
  {
    item: "登記費用",
    amount: "20万円",
    note: "司法書士報酬含む",
    isTotal: false
  },
  {
    item: "ローン事務手数料",
    amount: "18万円",
    note: "融資額の1%程度",
    isTotal: false
  },
  {
    item: "火災保険料",
    amount: "20万円",
    note: "10年分一括",
    isTotal: false
  },
  {
    item: "固定資産税等精算",
    amount: "5万円",
    note: "年度途中取得の場合",
    isTotal: false
  },
  {
    item: "その他諸費用",
    amount: "21万円",
    note: "印紙代、銀行保証料等",
    isTotal: false
  },
  {
    item: "合計",
    amount: "350万円",
    note: "物件価格の約17.5%",
    isTotal: true
  }
];

// テーブルのカラム定義
const columns: TableColumn[] = [
  {
    key: 'item',
    label: '項目',
    align: 'center'
  },
  {
    key: 'amount',
    label: '金額',
    align: 'center'
  },
  {
    key: 'note',
    label: '備考',
    align: 'center'
  }
];

const RealEstateCostsTable: React.FC = () => {
  return (
    <DataTable
      data={costs}
      columns={columns}
      title={"2,000万円の区分マンションの場合"}
      size={'medium'}
      totalRowKey="isTotal"
    />
  );
};

export default RealEstateCostsTable; 