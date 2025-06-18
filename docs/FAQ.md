# よくある質問（FAQ）

kintone開発テンプレートの使用に関してよくある質問と回答をまとめました。

## 🚀 セットアップ関連

### Q1. 初回セットアップで何をすればよいですか？

**A**: 以下の手順で進めてください：

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd kintone-dev-template
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **環境変数の設定**
   ```bash
   cp .env.sample .env
   # .envファイルを編集してkintone環境情報を設定
   ```

4. **アプリレジストリの設定**
   ```bash
   # apps-registry.jsonを編集してアプリ情報を登録
   ```

### Q2. 環境変数がうまく設定できません

**A**: `.env`ファイルの設定を確認してください：

```env
# 例
KINTONE_DEV_DOMAIN=your-dev-domain.cybozu.com
KINTONE_DEV_USERNAME=your-username
KINTONE_DEV_PASSWORD=your-password
```

**注意点**:
- パスワードに特殊文字が含まれている場合は引用符で囲む
- ドメインには`https://`は含めない
- 空白や改行文字が含まれていないか確認

### Q3. ginueコマンドが見つかりません

**A**: ginueはnpmの依存関係として自動インストールされます：

```bash
# 確認方法
npx ginue --version

# 手動インストール（必要に応じて）
npm install -g ginue
```

## 🔧 開発関連

### Q4. 監視モードがうまく動きません

**A**: 以下を確認してください：

1. **Webpackの設定確認**
   ```bash
   # 設定ファイルの存在確認
   ls webpack.config.cjs
   ```

2. **ファイル変更の反映確認**
   ```bash
   # 監視モードの再起動
   npm run watch
   ```

3. **ポート競合の確認**
   ```bash
   # プロセスの確認
   lsof -i :8080
   ```

### Q5. ESLintエラーが解決できません

**A**: 段階的に解決してください：

1. **自動修正の実行**
   ```bash
   npm run fix
   ```

2. **手動修正が必要なエラーの確認**
   ```bash
   npm run lint
   ```

3. **設定の確認**
   ```bash
   # ESLint設定ファイルの確認
   cat .eslintrc.js
   ```

### Q6. ビルドでエラーが発生します

**A**: よくあるエラーと対処法：

**構文エラー**:
```bash
# 構文チェック
npm run lint
```

**依存関係エラー**:
```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

**Babelエラー**:
```bash
# Babel設定の確認
cat babel.config.js
```

## 📊 設計ファイル管理

### Q7. 設計のpullができません

**A**: 以下を確認してください：

1. **認証情報の確認**
   ```bash
   # 環境変数の確認
   echo $KINTONE_DEV_USERNAME
   echo $KINTONE_DEV_DOMAIN
   ```

2. **アプリIDの確認**
   ```bash
   # レジストリの確認
   cat apps-registry.json | grep appId
   ```

3. **権限の確認**
   - kintoneアプリの管理権限があるか
   - Basic認証が必要か

### Q8. 一部のフィールドが同期されません

**A**: 関連レコードフィールドは自動的に除外されます：

```javascript
// ginue-manager.cjsで自動除外される
if (value.type !== 'REFERENCE_TABLE') {
  filteredProperties[key] = value;
}
```

**手動で除外したい場合**:
```bash
# apps-registry.jsonで設定
"excludeFields": ["REFERENCE_TABLE", "FILE"]
```

### Q9. 設計pushでエラーが発生します

**A**: よくある原因と対処法：

**アプリIDの不一致**:
- 本番環境のアプリIDが正しいか確認
- apps-registry.jsonの設定を確認

**フィールドの競合**:
- 本番環境にない新しいフィールドがある場合は手動で作成

**権限不足**:
- 本番環境での管理権限を確認

## 🚀 デプロイ関連

### Q10. カスタマイズがアップロードできません

**A**: 段階的に確認してください：

1. **ビルドの確認**
   ```bash
   npm run build
   ls -la dist/
   ```

2. **アップロード設定の確認**
   ```bash
   # upload.jsの設定確認
   cat upload.js | grep -A 5 "production"
   ```

3. **手動アップロード**
   ```bash
   NODE_ENV=production node upload.js
   ```

### Q11. 本番環境で動作しません

**A**: デバッグ手順：

1. **ブラウザの開発者ツールでエラー確認**
2. **カスタマイズの適用確認**
3. **フィールドコードの確認**
4. **権限設定の確認**

### Q12. ロールバックが必要です

**A**: 緊急ロールバック手順：

```bash
# 1. バックアップからの復元
git checkout backup-tag

# 2. 設計の復元
npm run design:import:prod

# 3. カスタマイズの復元
npm run upload:prod
```

## 🔍 トラブルシューティング

### Q13. 「App not found」エラーが出ます

**A**: 確認ポイント：

1. **アプリIDの確認**
   ```bash
   # レジストリで確認
   grep -A 5 "yourAppName" apps-registry.json
   ```

2. **環境の確認**
   ```bash
   # 現在の環境確認
   echo $NODE_ENV
   ```

3. **アプリの存在確認**
   - kintone管理画面でアプリが存在するか確認

### Q14. 認証エラーが頻発します

**A**: 認証設定の見直し：

1. **パスワードの確認**
   - 特殊文字のエスケープが必要か確認
   - パスワードの期限切れがないか確認

2. **2要素認証の確認**
   - 2要素認証が有効になっていないか確認

3. **API トークンの利用検討**
   ```env
   # API トークンを使用する場合
   KINTONE_DEV_API_TOKEN=your-api-token
   ```

### Q15. メモリ不足エラーが発生します

**A**: メモリ使用量の最適化：

```bash
# Node.jsのメモリ制限を増やす
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 監視モードでのメモリ制限
NODE_OPTIONS="--max-old-space-size=2048" npm run watch
```

## 💡 ベストプラクティス

### Q16. 開発効率を上げるコツはありますか？

**A**: 以下を実践してください：

1. **監視モードの活用**
   ```bash
   npm run watch
   ```

2. **デバッグログの活用**
   ```javascript
   console.group('デバッグ情報');
   console.log('変数:', variable);
   console.groupEnd();
   ```

3. **共通機能の活用**
   ```javascript
   import { showNotification, validation } from '../../common/utils.js';
   ```

### Q17. セキュリティ面で注意すべき点は？

**A**: セキュリティのベストプラクティス：

1. **環境変数の管理**
   - `.env`ファイルをGitにコミットしない
   - 本番環境では環境変数を暗号化

2. **XSS対策**
   ```javascript
   // ユーザー入力値のエスケープ
   const escaped = escapeHtml(userInput);
   ```

3. **API呼び出しの制限**
   ```javascript
   // レート制限の実装
   const rateLimiter = new RateLimiter(100, 'per hour');
   ```

## 📞 サポート

### Q18. 問題が解決しない場合はどうすればよいですか？

**A**: 以下の順序でサポートを求めてください：

1. **ドキュメントの再確認**
   - README.md
   - 各種ガイドドキュメント

2. **Issue の確認**
   - 既存のIssueで同様の問題がないか確認

3. **新しいIssueの作成**
   - 問題の詳細
   - 再現手順
   - 環境情報
   - エラーメッセージ

4. **コミュニティの活用**
   - kintone developer network
   - Stack Overflow

### Q19. カスタマイズのアイデアが欲しいです

**A**: 参考リソース：

- [kintone カスタマイズ事例](https://developer.cybozu.io/hc/ja)
- [GitHub のサンプルコード](https://github.com/search?q=kintone)
- [コミュニティフォーラム](https://community.cybozu.dev/)

### 更新履歴

- **2024-06-18**: 初版作成
- 今後の更新予定：新しい質問と回答を随時追加
