#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// アプリグループ設定を読み込む
function loadAppGroups() {
  const groupsPath = path.join(__dirname, 'design', 'app-groups.json');
  if (fs.existsSync(groupsPath)) {
    return JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
  }
  return { appGroups: {}, defaultGroup: null };
}

// アプリをフィルタリングする
function filterApps(criteria) {
  const appsDir = path.join(__dirname, 'design', 'apps');
  
  if (!fs.existsSync(appsDir)) {
    return [];
  }

  const allApps = fs.readdirSync(appsDir).filter(item => {
    const appPath = path.join(appsDir, item);
    const configPath = path.join(appPath, 'app.config.json');
    return fs.statSync(appPath).isDirectory() && fs.existsSync(configPath);
  });

  return allApps.filter(appName => {
    const configPath = path.join(appsDir, appName, 'app.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 有効性チェック
    if (criteria.enabled !== undefined && config.enabled !== criteria.enabled) {
      return false;
    }
    
    // タグフィルタ
    if (criteria.tags && criteria.tags.length > 0) {
      const appTags = config.tags || [];
      const hasMatchingTag = criteria.tags.some(tag => appTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    // 優先度フィルタ
    if (criteria.priority !== undefined && config.priority !== criteria.priority) {
      return false;
    }
    
    // 環境別有効性チェック
    if (criteria.environment) {
      const envConfig = config.environments[criteria.environment];
      if (!envConfig || envConfig.enabled === false) {
        return false;
      }
    }
    
    return true;
  });
}

// アプリ一覧を表示（フィルタリング機能付き）
function listApps(options = {}) {
  const appsDir = path.join(__dirname, 'design', 'apps');
  
  if (!fs.existsSync(appsDir)) {
    console.log('No apps found. Please create apps in design/apps/ directory.');
    return;
  }

  let apps = fs.readdirSync(appsDir).filter(item => {
    const appPath = path.join(appsDir, item);
    return fs.statSync(appPath).isDirectory();
  });

  // フィルタリング適用
  if (options.enabledOnly || options.tags || options.priority !== undefined || options.environment) {
    apps = filterApps({
      enabled: options.enabledOnly ? true : undefined,
      tags: options.tags,
      priority: options.priority,
      environment: options.environment
    });
  }

  if (apps.length === 0) {
    console.log('No apps found matching the criteria.');
    return;
  }

  console.log('📱 Available Apps:');
  console.log('================');

  // アプリグループ情報を読み込み
  const appGroups = loadAppGroups();

  apps.forEach(appName => {
    const configPath = path.join(appsDir, appName, 'app.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const statusIcon = config.enabled ? '🟢' : '🔴';
      
      console.log(`\n${statusIcon} ${appName}`);
      console.log(`   Description: ${config.description || 'No description'}`);
      if (config.tags && config.tags.length > 0) {
        console.log(`   Tags: ${config.tags.join(', ')}`);
      }
      if (config.priority !== undefined) {
        console.log(`   Priority: ${config.priority}`);
      }
      console.log(`   Dev App ID: ${config.environments.dev?.appId || 'Not set'} ${config.environments.dev?.enabled === false ? '(Disabled)' : ''}`);
      console.log(`   Prod App ID: ${config.environments.prod?.appId || 'Not set'} ${config.environments.prod?.enabled === false ? '(Disabled)' : ''}`);
      console.log(`   Last Export (dev): ${config.environments.dev?.lastExported || 'Never'}`);
      console.log(`   Last Export (prod): ${config.environments.prod?.lastExported || 'Never'}`);
    } else {
      console.log(`\n🔸 ${appName} (No config file)`);
    }
  });

  // アプリグループ情報を表示
  console.log('\n📂 App Groups:');
  Object.entries(appGroups.appGroups || {}).forEach(([groupName, group]) => {
    const groupApps = group.apps.filter(app => apps.includes(app));
    if (groupApps.length > 0) {
      console.log(`   ${groupName}: ${groupApps.join(', ')}`);
    }
  });

  console.log('\n💡 Usage Examples:');
  console.log(`   Export enabled apps: node ginue-manager.cjs export ${apps.filter(app => {
    const configPath = path.join(appsDir, app, 'app.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.enabled;
  }).join(',')} dev`);
}

// アプリの状態を確認
function checkAppStatus(appName) {
  const configPath = path.join(__dirname, 'design', 'apps', appName, 'app.config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ App config not found for '${appName}'`);
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log(`📊 Status for ${appName}:`);
  console.log('=========================');
  
  ['dev', 'prod'].forEach(env => {
    const envConfig = config.environments[env];
    const envDir = path.join(__dirname, 'design', 'apps', appName, env);
    const hasFiles = fs.existsSync(envDir) && fs.readdirSync(envDir).length > 0;
    
    console.log(`\n${env.toUpperCase()} Environment:`);
    console.log(`   App ID: ${envConfig?.appId || 'Not set'}`);
    console.log(`   Domain: ${envConfig?.domain || 'Not set'}`);
    console.log(`   Design Files: ${hasFiles ? '✅ Available' : '❌ Not found'}`);
    console.log(`   Last Export: ${envConfig?.lastExported || 'Never'}`);
    console.log(`   Last Import: ${envConfig?.lastImported || 'Never'}`);
    
    if (hasFiles) {
      const files = fs.readdirSync(envDir);
      console.log(`   Files: ${files.join(', ')}`);
    }
  });
}

// 新しいアプリの設定を生成
function generateAppConfig(appName, devAppId, prodAppId, description) {
  const appDir = path.join(__dirname, 'design', 'apps', appName);
  const configPath = path.join(appDir, 'app.config.json');
  
  if (fs.existsSync(configPath)) {
    console.error(`❌ App config already exists for '${appName}'`);
    return;
  }

  // ディレクトリを作成
  fs.mkdirSync(path.join(appDir, 'dev'), { recursive: true });
  fs.mkdirSync(path.join(appDir, 'prod'), { recursive: true });

  const config = {
    appName,
    description: description || `${appName}アプリの設計情報`,
    environments: {
      dev: {
        appId: devAppId,
        domain: "${KINTONE_DEV_DOMAIN}",
        lastExported: null,
        lastImported: null
      },
      prod: {
        appId: prodAppId,
        domain: "${KINTONE_PROD_DOMAIN}",
        lastExported: null,
        lastImported: null
      }
    },
    files: {
      fields: "fields.json",
      layout: "layout.json", 
      views: "views.json",
      settings: "settings.json"
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`✅ Created app config for '${appName}'`);
  console.log(`📁 Directory: ${appDir}`);
  console.log(`⚡ Next steps:`);
  console.log(`   1. Export design: node ginue-manager.cjs export ${appName} dev`);
  console.log(`   2. Commit to Git: git add design/apps/${appName}`);
}

// ヘルプを表示
function showHelp() {
  console.log('🛠️  ginue Helper Script');
  console.log('======================');
  console.log('');
  console.log('Commands:');
  console.log('  list [options]                - List apps with optional filtering');
  console.log('  status <appName>              - Show app status and design files');
  console.log('  create <appName> <devId> <prodId> [description] - Create new app config');
  console.log('  filter <criteria>             - Filter apps by criteria');
  console.log('  groups                        - Show app groups');
  console.log('  help                          - Show this help');
  console.log('');
  console.log('List Options:');
  console.log('  --enabled                     - Show only enabled apps');
  console.log('  --tags <tag1,tag2>           - Filter by tags');
  console.log('  --priority <number>          - Filter by priority');
  console.log('  --env <dev|prod>             - Filter by environment availability');
  console.log('');
  console.log('Examples:');
  console.log('  node helper.cjs list');
  console.log('  node helper.cjs list --enabled');
  console.log('  node helper.cjs list --tags core,master');
  console.log('  node helper.cjs status studentMaster');
  console.log('  node helper.cjs create newApp 123 456 "新しいアプリ"');
  console.log('  node helper.cjs filter --tags core --enabled');
  console.log('');
  console.log('Filter Examples for ginue-manager:');
  console.log('  node ginue-manager.cjs export all dev              # 全アプリ');
  console.log('  node ginue-manager.cjs export app1,app2 dev        # 指定アプリ');
  console.log('  node ginue-manager.cjs export studentMaster dev    # 単一アプリ');
}

// アプリグループを表示
function showGroups() {
  const appGroups = loadAppGroups();
  
  console.log('📂 App Groups:');
  console.log('=============');
  
  if (Object.keys(appGroups.appGroups || {}).length === 0) {
    console.log('No app groups defined.');
    return;
  }
  
  Object.entries(appGroups.appGroups).forEach(([groupName, group]) => {
    console.log(`\n🏷️  ${groupName}`);
    console.log(`   Description: ${group.description}`);
    console.log(`   Apps: ${group.apps.length > 0 ? group.apps.join(', ') : 'None'}`);
  });
  
  if (appGroups.defaultGroup) {
    console.log(`\n⭐ Default Group: ${appGroups.defaultGroup}`);
  }
}

// フィルタ機能
function filterCommand(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--enabled':
        options.enabledOnly = true;
        break;
      case '--tags':
        if (i + 1 < args.length) {
          options.tags = args[i + 1].split(',').map(t => t.trim());
          i++;
        }
        break;
      case '--priority':
        if (i + 1 < args.length) {
          options.priority = parseInt(args[i + 1]);
          i++;
        }
        break;
      case '--env':
        if (i + 1 < args.length) {
          options.environment = args[i + 1];
          i++;
        }
        break;
    }
  }
  
  const filteredApps = filterApps(options);
  
  console.log('🔍 Filtered Results:');
  console.log('==================');
  
  if (filteredApps.length === 0) {
    console.log('No apps match the filter criteria.');
    return;
  }
  
  console.log(`Found ${filteredApps.length} apps:`);
  filteredApps.forEach(app => console.log(`  - ${app}`));
  
  console.log('\n💡 Use with ginue-manager:');
  console.log(`   node ginue-manager.cjs export ${filteredApps.join(',')} dev`);
}

// メイン処理
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list': {
      // オプション解析
      const options = {};
      const restArgs = args.slice(1);
      
      for (let i = 0; i < restArgs.length; i++) {
        switch (restArgs[i]) {
          case '--enabled':
            options.enabledOnly = true;
            break;
          case '--tags':
            if (i + 1 < restArgs.length) {
              options.tags = restArgs[i + 1].split(',').map(t => t.trim());
              i++;
            }
            break;
          case '--priority':
            if (i + 1 < restArgs.length) {
              options.priority = parseInt(restArgs[i + 1]);
              i++;
            }
            break;
          case '--env':
            if (i + 1 < restArgs.length) {
              options.environment = restArgs[i + 1];
              i++;
            }
            break;
        }
      }
      
      listApps(options);
      break;
    }
    case 'status':
      if (args.length < 2) {
        console.error('❌ App name is required');
        console.log('Usage: node helper.cjs status <appName>');
        return;
      }
      checkAppStatus(args[1]);
      break;
    case 'create':
      if (args.length < 4) {
        console.error('❌ Required parameters missing');
        console.log('Usage: node helper.cjs create <appName> <devAppId> <prodAppId> [description]');
        return;
      }
      generateAppConfig(args[1], args[2], args[3], args[4]);
      break;
    case 'filter':
      filterCommand(args.slice(1));
      break;
    case 'groups':
      showGroups();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
  }
}

if (require.main === module) {
  main();
}
