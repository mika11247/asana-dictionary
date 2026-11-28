# アーサナ画像保護の公開と復旧

各段階の本番変更は承認後に行う。画像本体、パス、所有者UUID、署名付きURL、サービスキーは作業ログに出さない。

**公開保留条件**

マネージドGatewayの合成画像試験で署名クエリの実値が記録されたため、配信を認証付きダウンロードとBlob URLに変更した。マネージド環境での認証付き取得とログの追加確認に合格するまで、実画像への適用は保留する。

別途承認後、既存ポリシーと分離した専用非公開バケットに合成WebPを1件だけ用意する。専用バケットに限定した所有者ポリシーを使い、アプリと同じSDKのダウンロード経路でユーザーAの成功、Bと匿名の拒否、期限切れJWTの拒否を確認する。Aの成功直後にBと匿名が同じパスを取得できないこと、レスポンスのキャッシュ制御とCDNの状態も確認する。時刻とリクエストIDでStorage・Gateway・閲覧可能なCDNログを絞り、URL、ヘッダー、本文、構造化項目にJWT実値があるかを真偽値だけで記録する。ログの閲覧範囲・転送先と、見られないCDNログの範囲も記録する。試験後は専用資源だけを撤去し既存設定・件数を照合する。

ダウンロードはブラウザのHTTPキャッシュを使わない。画面を離れるとBlobを解放するため、再訪時に再取得が発生する。既に発行されたJWTはログアウト後も有効期限内に利用できるので、現行の有効期間を確認し、変更は別途判断する。

1. **DB・Storage基盤**

   GitHub main・正規URLのProduction・Supabaseプロジェクトを照合する。旧バケット、オブジェクト、辞書行、CRM、Auth、既存RLS・権限を件数と照合値で記録し、秘密値や行の実値は出力しない。バケット名と列・インデックス・トリガー・関数2件・ポリシー2件が未使用であることを調べる。既存定義や出所不明の差分があれば作成前に停止する。

   作成前の衝突確認は次の各列がすべて `false` であることを確認する。

   ```sql
   select
     exists (select 1 from storage.buckets where id = 'asana-images-private' or name = 'asana-images-private') as bucket_exists,
     exists (select 1 from pg_attribute where attrelid = 'public.asanas'::regclass
       and attname = 'private_image_path' and not attisdropped) as column_exists,
     to_regclass('public.asanas_private_image_path_idx') is not null as index_name_exists,
     exists (select 1 from pg_trigger where tgrelid = 'public.asanas'::regclass
       and tgname = 'check_asana_private_image') as trigger_exists,
     (to_regprocedure('public.check_asana_private_image()') is not null
       or to_regprocedure('public.asana_image_migration_batch(text,integer)') is not null) as function_exists,
     exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
       and policyname in ('asana_private_read', 'asana_private_delete_unused')) as policy_exists;
   ```

   DashboardのStorage → New bucketから `asana-images-private` を作成する。これはStorage APIを使用する管理操作。Public bucketをオフにし、サイズ上限を **5 MiB（5,242,880バイト）**、許可MIMEを `image/webp` だけに設定する。既存バケットには触れない。作成応答が途切れた場合はバケット一覧と設定を読み直し、確認できるまで再作成しない。

   バケットの設定と空であることを読み取り確認し、`01-private-images.sql` を適用する。SQLはバケットを作成せず、設定と空状態を検査してから列・インデックス・トリガー・関数・ポリシーを1トランザクションで追加する。DDLロック待ちは5秒で中断する。既存定義に衝突した場合は全体をロールバックする。同じSQLの再送は安全に失敗する。応答不明時は定義を照合し、成功済みか全体が未適用か判定するまで再送しない。

   事後は、新バケットが非公開で空、非公開パスが全件NULL、移行RPCがservice_role専用、通常ユーザーに新バケットの直接INSERT・UPDATEがないことを確認する。既存辞書行は追加列を除外した照合値で比較する。旧バケット、画像、旧ポリシー、CRM・Authも照合し、現行Productionの辞書・シーケンス・プリセット・CRMを読み取りで確認する。空バケットの確認は実画像の認可試験の代用にしない。
2. **新旧両対応アプリ**

   DB追加後にアプリを公開する。初回は `NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS=false` とし、既存アプリと新UIの表示、選択、印刷を確認する。DB追加前に新UIを公開すると、シーケンス詳細の列指定が失敗する。

   公開対象は `app/api/asana-images/route.js`、辞書の一覧・新規・編集、今日のアーサナ、シーケンス詳細、プリセットの関連画面、`components/AsanaImage.js`、`lib/asana-image-*.mjs`、`lib/asana-images.js`、`lib/use-local-image-preview.js`、`lib/validate-asana-image.mjs` と、sharpを含むpackage差分。ランタイムとあわせて画像用の試験・手順を選択的にレビューする。作業ツリーにある別案件の `supabase/rollouts/crm-lilly/02-import-legacy.sql` と `supabase/rollouts/crm-lilly/verify-legacy-import.cjs` は公開対象外。既に適用済みの基盤SQLや後段のStorage SQLは、この公開の操作として実行しない。

   Productionのビルド環境にフラグの `false` を明示し、サーバー用アップロードキーの追加は後段へ残す。公開後は正規URL・READY・コミットに加え、無効状態のアップロードAPIが404を返すこと、旧公開画像の一覧・編集プレビュー・印刷、辞書・CRMの入口、空の非公開バケットと非公開パス登録0件を確認する。非公開画像の実データによる表示・編集・印刷は隔離環境で確認し、Productionでは既存データを書き換えずに判定する。互換版で非公開画像の辞書情報は編集できる。画像ファイルの差し替えは非公開アップロードを有効化した後に行う。

   この段階で問題が出た場合は、非公開パスと新バケット内の画像が0件であることを確認して、旧Productionデプロイへ戻す。DB・Storageの基盤と署名制限は保持する。公開画像での読み取り、印刷、既存のルートを再確認する。

   初回公開と同じフラグで隔離ブラウザ試験を行う。次は合成データ専用Docker環境が起動済みで、未シードの状態から実行するコマンド。

   ```powershell
   node supabase/rollouts/crm-step-1/acceptance.cjs --seed --membership-a --common-name --record-context --private-images --private-images-no-sign --image-compatibility --browser
   ```
3. **新規アップロード切替**

   Productionだけにサーバー環境変数 `SUPABASE_SERVICE_ROLE_KEY` を設定し、`NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS=true` で再ビルド・公開する。サービスキーはVercelの機密環境変数として管理する。クライアントへの直接アップロード権限は付与しない。稼働を確認してから `02-stop-legacy-uploads.sql` を適用する。旧画面を開きっぱなしのユーザーには再読込が必要になる。
4. **既存の参照移行**

   直前集計で所有者と辞書行の一致を再確認し、未参照・所有者不明・形式不一致を除外する。隔離検証済みのスクリプトに `ASANA_MIGRATION_ORIGIN`、保護されたプロセス環境の `ASANA_MIGRATION_SERVICE_KEY`、`ASANA_MIGRATION_BATCH`（既定10、最大25）を設定する。まず `node supabase/rollouts/asana-image-privacy/migrate.mjs` で合成環境と本番の候補集計を確認する。承認後のみ `ASANA_MIGRATION_CONFIRM_ORIGIN` に照合済みの接続先を設定し、`--apply` を付ける。バッチごとに件数を突合する。失敗・競合時は次のバッチを開始せず、参照を読み直して再実行する。コピー先の同名異内容は上書きしない。
5. **旧公開停止**

   全参照の切替、所有者表示、印刷、旧アプリとの互換期間終了、非公開対応済みの切り戻し用デプロイを確認してから `03-close-legacy-public.sql` を適用する。旧バケットは非公開のまま保存し、公開URLと旧Storageポリシーからの取得が止まったことを確認する。端末に保存済みのコピーや利用者のキャッシュは回収できない。

## 段階ごとの切り戻し

- 第1段階でSQLがロールバックした場合、今回作成したバケットであることと空状態を確認し、DashboardのStorageから削除する。SQL成功後は、追加した定義が計画どおりであることを照合し、アップロード・移行を停止したまま `01-rollback-empty-foundation.sql` を適用する。非公開パスまたはオブジェクトが1件でもある場合は停止する。DB撤去を確認してから空のバケットをStorage APIで削除し、旧状態との照合を行う。

- 基盤追加直後は、旧アプリに戻しても旧画像を使用できる。新しい画像が登録された後は、DB列・バケットを維持し、非公開対応済みのアプリに戻す。
- アップロード切替に問題がある場合は書き込みを一時停止し、非公開画像表示を維持してアップロード経路を修正する。旧バケットへの書き込み権限の復活は、旧画像の公開継続と新規画像の公開を伴うため別の判断とする。
- コピー済み参照の切り戻しは、旧公開停止前、かつ移行後の画像編集がないことを照合できる行に限る。旧URLを残しているため、対象行だけで新しいパスを解除できる。旧公開停止後は非公開側で参照と画像を復旧する。
- 認証付きダウンロード方式の公開済み・検証済みデプロイを切り戻し先に確保する。非公開パスを書き込み始めた後はその方式を維持し、必要に応じて画像編集とプリセット取り込みを一時停止する。
- 画像1件の上限はStorageで5 MiB。Vercelの入口上限を考慮し、アプリからの新規送信は4 MiB。画像本体を二重保持する間の保存容量と転送量は適用直前に確認する。既知の170件全体は約74.3 MBで、追加契約の導入を前提としない。

## 次の段階に進む条件

| 段階 | 進行条件と停止条件 |
|---|---|
| 基盤適用 | GitHub・Vercel・Supabaseの対象を確認。既存の旧バケット・ポリシー・データ件数が想定どおりで、新規バケットが非公開、匿名・他人の操作を拒否する。設定差分、既存データ差分、本人専用CRMの異常があれば停止する。 |
| 互換版公開 | 正規URLがREADYの互換版を指し、既存画像・新しいパス・印刷の両方を表示できる。非公開対応済みの切り戻し先を保存する。画像の読み取りや一般機能に異常があれば画面を戻し、追加DBは保持する。 |
| 新規アップロード切替 | 新規アップロードの秘密設定がProductionのサーバーだけにあり、非公開アップロードと画像置換の正常保存を確認する。失敗時はアップロードを停止し、非公開対応版で表示を維持する。 |
| バッチ移行 | 対象件数を再集計。各バッチで元参照・画像の内容・本人認可を照合し、失敗または変更済みの件数があれば調査する。見積サイズ・転送量が利用可能枠を超える場合や、契約変更が必要な場合は停止する。 |
| 旧公開停止 | 旧公開URLに依存する行が0件で、非公開・印刷・切り戻しの試験に合格。停止後は匿名で旧URLを取得できず、本人が認証付きで非公開画像を再取得できる。異常時は認証付きダウンロード対応版に切り戻す。 |

置換アップロード後に辞書保存が失敗したファイルは未参照で残る。元のファイルや辞書参照は維持し、未参照ファイルの整理は所有者確認と利用状況の照合後に行う。

## 所有者による署名URL発行

認証付きダウンロードを使うアプリの実装と、Storage APIで許可される操作は別。現在の所有者SELECTは、自分の画像に対する署名URL作成にも使える。発行後に利用されれば、先行試験で観測したGatewayログへの署名トークン露出が起こり得る。第1段階ではバケットが空のため、実画像が入る前に方針を確定する。

禁止する場合は、マネージド環境の操作制限ヘルパーで許可するSELECT操作を絞り、実際に使うSDKの `download()` と未参照画像の削除に付随するSELECTを維持する必要がある。署名の単体・一括作成拒否、本人ダウンロード、未参照削除、参照中の削除拒否、別ユーザー・匿名の拒否を合成画像で確認する。ローカルStorageとマネージド版の操作識別子の互換性を確認してから変更する。

実画像保存前の確認候補は、既存の所有者条件を保ち、`storage.allow_any_operation` で `object.get_authenticated`、`object.get_authenticated_info`、`object.delete`、`object.delete_many` にSELECTを限定すること。隔離受入試験の `--private-images-no-sign` はこの候補を適用して検証する。本番の第1段階SQLはこの候補を含まない。
