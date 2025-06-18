// ES モジュール形式
import { execSync } from 'child_process';
import { config } from 'dotenv';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// 現在のファイルのディレクトリパスを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
config({ path: path.resolve(__dirname, '.env') });

// 環境に基づいて適切な環境変数を選択
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// 環境変数を取得
const domain = isProduction ? process.env.KINTONE_PROD_DOMAIN : process.env.KINTONE_DEV_DOMAIN;
const username = isProduction ? process.env.KINTONE_PROD_USERNAME : process.env.KINTONE_DEV_USERNAME;
const password = isProduction ? process.env.KINTONE_PROD_PASSWORD : process.env.KINTONE_DEV_PASSWORD;

// 環境変数が設定されているか確認
if (!domain || !username || !password) {
  console.error(`環境変数が設定されていません。.env ファイルを確認してください。`);
  console.error(`必要な環境変数: KINTONE_${isProduction ? 'PROD' : 'DEV'}_DOMAIN, KINTONE_${isProduction ? 'PROD' : 'DEV'}_USERNAME, KINTONE_${isProduction ? 'PROD' : 'DEV'}_PASSWORD`);
  process.exit(1);
}

// kintone URLを構築
const baseUrl = `https://${domain}`;

// 現在の環境を表示
console.log(`環境: ${isProduction ? 'PRO' : 'DEV'}`);
console.log(`Kintone URL: ${baseUrl}`);

// コマンドライン引数からアプリ名を取得
const appName = process.argv[2];

// アプリ名が指定されているか確認
if (!appName) {
  console.error('アプリ名を指定してください。例: npm run upload:dev -- appName');
  process.exit(1);
}

// アップロードするJSONファイルのパスを生成
const jsonFile = isProduction ? 'pro.json' : 'dev.json';
const entryPath = `src/apps/${appName}/${jsonFile}`;

// ファイルが存在するか確認
if (!fs.existsSync(entryPath)) {
  console.error(`ファイル ${entryPath} が見つかりません。`);
  process.exit(1);
}

console.log(`\nuploading... ${entryPath}`);

try {
  // kintone-customize-uploaderを実行
  execSync(
    `npx kintone-customize-uploader --base-url ${baseUrl} --username "${username}" --password "${password}" ${entryPath}`,
    { stdio: 'inherit' }
  );
  console.log(`${entryPath} のアップロードが完了しました！`);
} catch (error) {
  console.error(`${entryPath} のアップロード中にエラーが発生しました:`, error.message);
  process.exit(1);
}
