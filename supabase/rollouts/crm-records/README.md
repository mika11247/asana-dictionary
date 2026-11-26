# 新しい所属での記録と旧管理の廃止

本番適用は別途承認後に行う。旧担当先・サービスの編集は切替前から停止する。旧表は参照履歴として保持し、CRMの通常操作からの書き込み権限を外す。旧顧客保存RPCの引数は互換のため残すが、渡されたサービス一覧で旧紐付けを更新しない。

1. 現行の顧客・所属・旧紐付け・カルテ・NUS情報と権限を読み取り照合する。旧実施記録が4件、Lilly×ヨガ3件、自主開催3rd place×ヨガ1件であることを確認する。
2. 変更をまたぐ時間を短くするため、`01-record-context.sql` と `02-import-record-context.sql` は同一トランザクションで適用する。01の外側のトランザクション境界は実行側で管理し、02の前に下記の照合値を `SET LOCAL crm.records_source_hash` に渡す。照合値は行内容を出力せずに集計する。
3. 既存の記録列・日時と旧紐付けの照合値、RLS・RPCの権限、新しい表示情報を確認し、画面を公開する。適用から公開までは旧画面での記録作成と旧設定・旧サービス紐付けの編集を止める。

```sql
select md5(jsonb_agg(to_jsonb(r) order by r.id)::text)
from public.crm_records r
where location_id is not null or service_id is not null;
```

01適用済みの環境で02を再検証する場合は、上記の `to_jsonb(r)` から追加4列 `record_group_code`、`record_brand_code`、`location_label`、`service_label` を除く。

画面を切り戻す際は新しい記録と旧テーブルを保持する。旧アプリは新しい記録の内容を読み取れないため、切り戻し中は記録の新規作成と新形式記録の旧画面での編集を停止する。既存旧IDとメモは保持される。旧設定への書き込み権限は再開しない。

隔離検証は空のSTEP 1用Composeで `node supabase/rollouts/crm-step-1/acceptance.cjs --seed --membership-a --common-name --record-context --browser` を実行する。
