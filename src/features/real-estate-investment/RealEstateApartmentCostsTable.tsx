import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { TableRow, TableColumn } from '@/types/table';

const costs: TableRow[] = [
  {
    item: "頭金（20%）",
    amount: "700万円",
    note: "一棟物件は頭金多め",
    isTotal: false
  },
  {
    item: "仲介手数料",
    amount: "115.5万円",
    note: "",
    isTotal: false
  },
  {
    item: "登記費用",
    amount: "35万円",
    note: "",
    isTotal: false
  },
  {
    item: "ローン事務手数料",
    amount: "28万円",
    note: "",
    isTotal: false
  },
  {
    item: "火災保険料",
    amount: "50万円",
    note: "10年分一括",
    isTotal: false
  },
  {
    item: "その他諸費用",
    amount: "71.5万円",
    note: "",
    isTotal: false
  },
  {
    item: "合計",
    amount: "1,000万円",
    note: "物件価格の約28.6%",
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

const RealEstateApartmentCostsTable: React.FC = () => {
  return (
    <DataTable
      data={costs}
      columns={columns}
      title={"3,500万円の一棟アパートの場合"}
      size={'medium'}
      totalRowKey="isTotal"
    />
  );
};

export default RealEstateApartmentCostsTable;
