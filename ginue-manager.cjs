#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// アプリレジストリを読み込む
function loadAppsRegistry() {
  const registryPath = path.join(__dirname, 'apps-registry.json');
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Apps registry not found: ${registryPath}`);
  }
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

// アプリ履歴を更新
function updateAppHistory(appName, action, environment) {
  const registryPath = path.join(__dirname, 'apps-registry.json');
  const registry = loadAppsRegistry();
  
  if (!registry.apps[appName]) {
    throw new Error(`App '${appName}' not found in registry`);
  }
  
  const timestamp = new Date().toISOString();
  
  if (action === 'export' || action === 'pull') {
    registry.apps[appName].history.lastExported = timestamp;
  } else if (action === 'import' || action === 'push') {
    registry.apps[appName].history.lastImported = timestamp;
  }
  
  registry.apps[appName].history.lastModified = timestamp;
  
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
// レジストリからアプリ情報を取得
function getAppInfo(appName) {
  const registry = loadAppsRegistry();
  const appInfo = registry.apps[appName];
  if (!appInfo) {
    throw new Error(`App '${appName}' not found in registry`);
  }
  return appInfo;
}

// 環境変数を展開する
function expandEnvVars(str) {
  return str.replace(/\$\{(\w+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
}

// エクスポート実行
function exportApp(appName, environment) {
  const appInfo = getAppInfo(appName);
  const envConfig = appInfo.environments[environment];
  
  if (!envConfig) {
    throw new Error(`Environment '${environment}' not found for app '${appName}'`);
  }

  const envPrefix = environment.toUpperCase();
  const domain = process.env[`KINTONE_${envPrefix}_DOMAIN`];
  const username = process.env[`KINTONE_${envPrefix}_USERNAME`];
  const password = process.env[`KINTONE_${envPrefix}_PASSWORD`];
  const basicUsername = process.env[`KINTONE_${envPrefix}_BASIC_USERNAME`];
  const basicPassword = process.env[`KINTONE_${envPrefix}_BASIC_PASSWORD`];

  const appId = envConfig.appId;
  const outputDir = path.join(__dirname, 'design', 'apps', appName, environment);
  
  // 出力ディレクトリを作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ginue pullコマンドを使用（正しいオプション名で）
  let command = `npx ginue pull --domain ${domain} --username "${username}" --password "${password}" --app ${appId}`;
  
  if (basicUsername && basicPassword) {
    command += ` --basic "${basicUsername}:${basicPassword}"`;
  }

  console.log(`Pulling ${appInfo.name} (${appName}) from ${environment} environment...`);
  console.log(`App ID: ${appId}, Domain: ${domain}`);
  
  try {
    // ginueコマンドを実行
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    
    // pullで取得されたファイルを適切なディレクトリに移動
    const defaultDir = path.join(__dirname, appId);
    if (fs.existsSync(defaultDir)) {
      // ファイルを移動
      const files = fs.readdirSync(defaultDir);
      files.forEach(file => {
        const sourcePath = path.join(defaultDir, file);
        const destPath = path.join(outputDir, file);
        fs.renameSync(sourcePath, destPath);
      });
      
      // 空のディレクトリを削除
      fs.rmdirSync(defaultDir);
    }
    
    // 履歴を更新
    updateAppHistory(appName, 'export', environment);
    
    console.log(`✅ Pull completed for ${appInfo.name} (${appName}) - ${environment}`);
  } catch (error) {
    console.error(`❌ Pull failed for ${appInfo.name} (${appName}) - ${environment}:`, error.message);
    process.exit(1);
  }
}

// インポート実行
function importApp(appName, environment) {
  const appInfo = getAppInfo(appName);
  const envConfig = appInfo.environments[environment];
  
  if (!envConfig) {
    throw new Error(`Environment '${environment}' not found for app '${appName}'`);
  }

  const envPrefix = environment.toUpperCase();
  const domain = process.env[`KINTONE_${envPrefix}_DOMAIN`];
  const username = process.env[`KINTONE_${envPrefix}_USERNAME`];
  const password = process.env[`KINTONE_${envPrefix}_PASSWORD`];
  const basicUsername = process.env[`KINTONE_${envPrefix}_BASIC_USERNAME`];
  const basicPassword = process.env[`KINTONE_${envPrefix}_BASIC_PASSWORD`];

  const appId = envConfig.appId;
  const inputDir = path.join(__dirname, 'design', 'apps', appName, 'dev'); // 開発環境の設定を本番に反映
  
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Design files not found in ${inputDir}. Please export from dev environment first.`);
  }

  // 設計ファイルを探す
  const designFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.json'));
  
  if (designFiles.length === 0) {
    throw new Error(`No design files found in ${inputDir}`);
  }

  console.log(`Pushing ${appInfo.name} (${appName}) to ${environment} environment...`);
  console.log(`App ID: ${appId}, Domain: ${domain}`);

  // 一時的にアプリIDと同じ名前のディレクトリを作成
  const tempDir = path.join(__dirname, 'temp');
  const tempAppDir = path.join(tempDir, appId);
  
  try {
    // 一時ディレクトリを作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    if (!fs.existsSync(tempAppDir)) {
      fs.mkdirSync(tempAppDir);
    }

    // 設計ファイルを一時ディレクトリにコピー
    for (const file of designFiles) {
      const sourceFile = path.join(inputDir, file);
      const destFile = path.join(tempAppDir, file);
      
      // app_form_fields.jsonの場合は関連レコードフィールドを除外
      if (file === 'app_form_fields.json') {
        const fieldsData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
        const filteredProperties = {};
        
        // 関連レコードフィールドを除外
        for (const [key, value] of Object.entries(fieldsData.properties)) {
          if (value.type !== 'REFERENCE_TABLE') {
            filteredProperties[key] = value;
          } else {
            console.log(`Skipping REFERENCE_TABLE field: ${key}`);
          }
        }
        
        const filteredData = {
          ...fieldsData,
          properties: filteredProperties
        };
        
        fs.writeFileSync(destFile, JSON.stringify(filteredData, null, 2));
      } else if (file === 'form.json') {
        // form.jsonからも関連レコードフィールドを除外
        const formData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
        const filteredProperties = formData.properties.filter(item => {
          if (item.type === 'REFERENCE_TABLE') {
            console.log(`Skipping REFERENCE_TABLE in form layout: ${item.code}`);
            return false;
          }
          return true;
        });
        
        const filteredFormData = {
          ...formData,
          properties: filteredProperties
        };
        
        fs.writeFileSync(destFile, JSON.stringify(filteredFormData, null, 2));
      } else {
        fs.copyFileSync(sourceFile, destFile);
      }
    }

    // ginue pushコマンドを実行
    let command = `npx ginue push --domain ${domain} --username "${username}" --password "${password}" --app ${appId}`;
    
    if (basicUsername && basicPassword) {
      command += ` --basic "${basicUsername}:${basicPassword}"`;
    }

    console.log(`Pushing ${appInfo.name} (${appName}) to ${environment} environment...`);
    
    try {
      execSync(command, { stdio: 'inherit', cwd: tempDir });
    } catch (error) {
      console.error(`❌ Push failed:`, error.message);
      throw error;
    }
  } finally {
    // 一時ディレクトリをクリーンアップ
    if (fs.existsSync(tempAppDir)) {
      fs.rmSync(tempAppDir, { recursive: true, force: true });
    }
    if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // 履歴を更新
  updateAppHistory(appName, 'import', environment);

  console.log(`✅ Push completed for ${appInfo.name} (${appName}) - ${environment}`);
}

// 複数アプリの処理
function processMultipleApps(command, appNames, environment) {
  const failedApps = [];
  
  for (const appName of appNames) {
    try {
      console.log(`\n🔄 Processing ${appName}...`);
      if (command === 'export') {
        exportApp(appName, environment);
      } else if (command === 'import') {
        importApp(appName, environment);
      }
    } catch (error) {
      console.error(`❌ Failed to process ${appName}:`, error.message);
      failedApps.push(appName);
    }
  }
  
  if (failedApps.length > 0) {
    console.log(`\n⚠️  Failed apps: ${failedApps.join(', ')}`);
    process.exit(1);
  } else {
    console.log(`\n✅ All apps processed successfully!`);
  }
}

// kintoneから実際のアプリ一覧を取得
function listKintoneApps(environment) {
  const registry = loadAppsRegistry();
  const envInfo = registry.environments[environment];
  
  if (!envInfo) {
    throw new Error(`Environment '${environment}' not found in registry`);
  }

  const envPrefix = environment.toUpperCase();
  const domain = process.env[`KINTONE_${envPrefix}_DOMAIN`];
  const username = process.env[`KINTONE_${envPrefix}_USERNAME`];
  const password = process.env[`KINTONE_${envPrefix}_PASSWORD`];
  const basicUsername = process.env[`KINTONE_${envPrefix}_BASIC_USERNAME`];
  const basicPassword = process.env[`KINTONE_${envPrefix}_BASIC_PASSWORD`];

  if (!domain || !username || !password) {
    throw new Error(`Environment variables for ${environment} are not properly set`);
  }

  console.log(`📱 Apps in ${envInfo.name} (${domain}):`);
  console.log('='.repeat(50));
  
  // レジストリに登録されているアプリの情報を表示
  const registeredApps = Object.entries(registry.apps).filter(([, appInfo]) => {
    return appInfo.environments[environment];
  });
  
  if (registeredApps.length > 0) {
    console.log('\n🔗 Registered Apps:');
    registeredApps.forEach(([appName, appInfo]) => {
      const envConfig = appInfo.environments[environment];
      console.log(`  - ${appInfo.name} (${appName})`);
      console.log(`    App ID: ${envConfig.appId}`);
      console.log(`    Category: ${appInfo.category || 'other'}`);
      if (appInfo.description) {
        console.log(`    Description: ${appInfo.description}`);
      }
    });
  }
  
  console.log('\n💡 To pull a specific app: node ginue-manager.cjs export <appName> ' + environment);
  console.log('💡 To explore kintone apps interactively, run:');
  console.log(`   npx ginue pull --domain ${domain} --username "${username}" --password "${password}"`);
}

// 新しいアプリをレジストリに追加
function addAppToRegistry(appName, appTitle, devAppId, prodAppId, category = 'other', description = '') {
  const registryPath = path.join(__dirname, 'apps-registry.json');
  const registry = loadAppsRegistry();
  
  if (registry.apps[appName]) {
    throw new Error(`App '${appName}' already exists in registry`);
  }
  
  registry.apps[appName] = {
    name: appTitle,
    description: description,
    environments: {
      dev: {
        appId: devAppId,
        domain: registry.environments.dev.domain
      },
      prod: {
        appId: prodAppId,
        domain: registry.environments.prod.domain
      }
    },
    category: category,
    tags: [category],
    enabled: true
  };
  
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`✅ App '${appName}' (${appTitle}) added to registry`);
  console.log(`   Dev App ID: ${devAppId}`);
  console.log(`   Prod App ID: ${prodAppId}`);
  console.log(`   Category: ${category}`);
}

// 利用可能なアプリ一覧を取得
function getAvailableApps() {
  const registry = loadAppsRegistry();
  return Object.keys(registry.apps).filter(appName => {
    const appInfo = registry.apps[appName];
    return appInfo.enabled !== false; // enabledがfalseでなければ含める
  });
}

// メイン処理
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node ginue-manager.cjs <command> <appName|all|list> [environment]');
    console.log('Commands: export, import, list, add');
    console.log('');
    console.log('Examples:');
    console.log('  node ginue-manager.cjs export studentMaster dev     # 単一アプリのpull');
    console.log('  node ginue-manager.cjs export all dev              # 全アプリのpull');
    console.log('  node ginue-manager.cjs export app1,app2 dev        # 複数アプリのpull');
    console.log('  node ginue-manager.cjs import studentMaster prod   # 単一アプリのpush');
    console.log('  node ginue-manager.cjs list                        # ローカルアプリ一覧');
    console.log('  node ginue-manager.cjs list dev                    # kintone開発環境アプリ一覧');
    console.log('  node ginue-manager.cjs list prod                   # kintone本番環境アプリ一覧');
    console.log('  node ginue-manager.cjs add                         # 新しいアプリを追加');
    process.exit(1);
  }

  const [command, target, environment] = args;
  
  // addコマンドの場合
  if (command === 'add') {
    console.log('🔧 Add new app to registry');
    console.log('==========================');
    
    // 対話式でアプリ情報を取得（実際の実装では readline等を使用）
    console.log('Enter app information:');
    console.log('Usage: node ginue-manager.cjs add <appName> <appTitle> <devAppId> <prodAppId> [category] [description]');
    console.log('Example: node ginue-manager.cjs add teacherMaster "教師マスタ" "125" "70" "master" "教師の基本情報管理"');
    return;
  }

  // listコマンドの場合
  if (command === 'list') {
    if (target && ['dev', 'prod'].includes(target)) {
      // 指定された環境のkintoneアプリ一覧を取得
      listKintoneApps(target);
    } else {
      // ローカルの設計ファイル一覧を表示
      const registry = loadAppsRegistry();
      const availableApps = getAvailableApps();
      
      console.log('📱 Available Apps Registry:');
      console.log('===========================');
      
      // カテゴリ別に表示
      const categories = {};
      availableApps.forEach(appName => {
        const appInfo = registry.apps[appName];
        const category = appInfo.category || 'other';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push({ appName, appInfo });
      });
      
      Object.entries(categories).forEach(([category, apps]) => {
        const categoryInfo = registry.categories[category];
        const categoryName = categoryInfo ? categoryInfo.name : category;
        console.log(`\n📂 ${categoryName}:`);
        
        apps.forEach(({ appName, appInfo }) => {
          console.log(`  - ${appName} (${appInfo.name})`);
          console.log(`    Dev App ID: ${appInfo.environments.dev?.appId || 'Not set'}`);
          console.log(`    Prod App ID: ${appInfo.environments.prod?.appId || 'Not set'}`);
          if (appInfo.description) {
            console.log(`    Description: ${appInfo.description}`);
          }
          if (appInfo.history?.lastExported) {
            console.log(`    Last Exported: ${new Date(appInfo.history.lastExported).toLocaleString()}`);
          }
          if (appInfo.history?.lastImported) {
            console.log(`    Last Imported: ${new Date(appInfo.history.lastImported).toLocaleString()}`);
          }
        });
      });
      
      console.log('');
      console.log('💡 To list kintone apps: node ginue-manager.cjs list dev|prod');
    }
    return;
  }
  
  if (args.length < 3 && !['list', 'add'].includes(command)) {
    console.log('❌ Environment is required for export/import commands');
    process.exit(1);
  }

  if (!['export', 'import', 'list', 'add'].includes(command)) {
    console.error('Invalid command. Use "export", "import", "list", or "add".');
    process.exit(1);
  }

  if (!['dev', 'prod'].includes(environment)) {
    console.error('Invalid environment. Use "dev" or "prod".');
    process.exit(1);
  }

  const availableApps = getAvailableApps();
  
  // ターゲットアプリの決定
  let targetApps = [];
  
  if (target === 'all') {
    targetApps = availableApps;
    console.log(`🎯 Processing all apps: ${targetApps.join(', ')}`);
  } else if (target.includes(',')) {
    // カンマ区切りの複数アプリ
    targetApps = target.split(',').map(app => app.trim());
    console.log(`🎯 Processing selected apps: ${targetApps.join(', ')}`);
    
    // 存在しないアプリをチェック
    const invalidApps = targetApps.filter(app => !availableApps.includes(app));
    if (invalidApps.length > 0) {
      console.error(`❌ Invalid apps: ${invalidApps.join(', ')}`);
      console.log(`Available apps: ${availableApps.join(', ')}`);
      process.exit(1);
    }
  } else {
    // 単一アプリ
    targetApps = [target];
    if (!availableApps.includes(target)) {
      console.error(`❌ App '${target}' not found.`);
      console.log(`Available apps: ${availableApps.join(', ')}`);
      process.exit(1);
    }
  }

  // 処理実行
  if (targetApps.length === 1) {
    // 単一アプリの場合は既存の関数を使用
    if (command === 'export') {
      exportApp(targetApps[0], environment);
    } else if (command === 'import') {
      importApp(targetApps[0], environment);
    }
  } else {
    // 複数アプリの場合は新しい関数を使用
    processMultipleApps(command, targetApps, environment);
  }
}

if (require.main === module) {
  main();
}
