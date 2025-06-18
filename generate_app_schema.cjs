#!/usr/bin/env node

/**
 * Kintoneアプリスキーマ生成スクリプト
 * 全フィールドとレイアウト情報を含む包括的なアプリ設計書をHTML形式で生成します。
 */

const fs = require('fs');
const path = require('path');

// 設定
const DESIGN_APPS_PATH = './design/apps';
const OUTPUT_DIR = './app_schema_output';
const APPS_REGISTRY_PATH = './apps-registry.json';

class AppSchemaGenerator {
    constructor() {
        this.apps = [];
        this.relationships = [];
        this.fieldAnalysis = {};
        this.categories = {};
        this.appsRegistry = null;
    }

    async generate() {
        console.log('🚀 Starting App Schema generation...');
        
        // 出力ディレクトリ作成
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR);
        }
        
        // 0. apps-registry.jsonからカテゴリ情報を読み込み
        await this.loadAppsRegistry();
        
        // 1. アプリ情報を収集
        await this.collectAppData();
        
        // 2. フィールド分析
        await this.analyzeFields();
        
        // 3. 関連性検出
        await this.detectRelationships();
        
        // 4. HTML生成
        await this.generateHTML();
        
        console.log('✅ App Schema generation completed!');
    }

    async loadAppsRegistry() {
        console.log('📚 Loading apps registry...');
        
        try {
            if (fs.existsSync(APPS_REGISTRY_PATH)) {
                const registryContent = fs.readFileSync(APPS_REGISTRY_PATH, 'utf8');
                this.appsRegistry = JSON.parse(registryContent);
                
                // カテゴリ情報を取得
                if (this.appsRegistry.categories) {
                    this.categories = this.appsRegistry.categories;
                    console.log(`📋 Loaded ${Object.keys(this.categories).length} categories from registry`);
                } else {
                    console.warn('⚠️  No categories found in apps-registry.json, using default categories');
                    this.categories = this.getDefaultCategories();
                }
            } else {
                console.warn('⚠️  apps-registry.json not found, using default categories');
                this.categories = this.getDefaultCategories();
            }
        } catch (error) {
            console.warn(`⚠️  Failed to parse apps-registry.json: ${error.message}, using default categories`);
            this.categories = this.getDefaultCategories();
        }
    }

    getDefaultCategories() {
        return {
            'master': {
                'name': 'マスタデータ',
                'description': 'マスタデータ管理アプリケーション'
            },
            'business': {
                'name': '業務管理',
                'description': '業務プロセス管理アプリケーション'
            },
            'finance': {
                'name': '財務・経理',
                'description': '財務・経理関連アプリケーション'
            },
            'report': {
                'name': 'レポート・分析',
                'description': '集計・分析・レポート機能'
            },
            'admin': {
                'name': 'システム管理',
                'description': 'システム管理・設定アプリケーション'
            },
            'other': {
                'name': 'その他',
                'description': 'その他のアプリケーション'
            }
        };
    }

    async collectAppData() {
        console.log('📊 Collecting app data...');
        
        const findFiles = (dir, fileName) => {
            const results = [];
            if (!fs.existsSync(dir)) return results;
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // ディレクトリの場合は再帰的に検索
                    results.push(...findFiles(fullPath, fileName));
                } else if (item === fileName) {
                    // ファイル名が一致する場合は結果に追加
                    results.push(fullPath);
                }
            }
            return results;
        };

        const fieldFiles = findFiles(DESIGN_APPS_PATH, 'app_form_fields.json');
        const layoutFiles = findFiles(DESIGN_APPS_PATH, 'app_form_layout.json');
        const appGroups = {};
        
        for (const filePath of fieldFiles) {
            const appName = this.extractAppName(filePath);
            if (!appGroups[appName]) {
                appGroups[appName] = {};
            }
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                appGroups[appName].fields = JSON.parse(content);
            } catch (error) {
                console.warn(`⚠️  Failed to parse ${filePath}: ${error.message}`);
            }
        }
        
        // レイアウトファイルも読み込み
        for (const filePath of layoutFiles) {
            const appName = this.extractAppName(filePath);
            if (!appGroups[appName]) {
                appGroups[appName] = {};
            }
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                appGroups[appName].layout = JSON.parse(content);
            } catch (error) {
                console.warn(`⚠️  Failed to parse layout ${filePath}: ${error.message}`);
            }
        }
        
        // アプリオブジェクトを作成
        for (const [appName, data] of Object.entries(appGroups)) {
            if (data.fields && data.fields.properties) {
                const extractedData = this.extractFields(data.fields.properties, data.layout);
                const app = {
                    name: appName,
                    sanitizedName: this.sanitizeAppName(appName),
                    fields: extractedData.fields,
                    layoutGroups: extractedData.layoutGroups || [],
                    category: this.categorizeApp(appName)
                };
                this.apps.push(app);
            }
        }
        
        console.log(`📈 Collected ${this.apps.length} apps`);
    }

    extractAppName(filePath) {
        const parts = filePath.split(path.sep);
        const appsIndex = parts.findIndex(part => part === 'apps');
        if (appsIndex >= 0 && appsIndex + 1 < parts.length) {
            return parts[appsIndex + 1];
        }
        return 'Unknown';
    }

    sanitizeAppName(name) {
        return name
            .replace(/【.*?】/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 25);
    }

    extractFields(properties, layout = null) {
        const fields = [];
        const layoutGroups = [];
        
        console.log(`🔍 Extracting fields for app, layout available: ${!!layout}`);
        
        if (layout && layout.layout) {
            console.log(`✅ Using layout-based field extraction with groups`);
            let groupIndex = 0;
            
            // レイアウトからグループとフィールドの順序を取得（GROUP単位でまとめる）
            const processLayoutItems = (layoutItems, groupName = null) => {
                let currentGroupFields = []; // 現在のグループのフィールドを蓄積
                
                for (const item of layoutItems) {
                    if (item.type === 'ROW' && item.fields && item.fields.length > 0) {
                        // ROW内のフィールドを処理
                        for (const field of item.fields) {
                            if (field.code && properties[field.code]) {
                                const fieldInfo = properties[field.code];
                                const fieldData = {
                                    code: field.code,
                                    label: fieldInfo.label || field.code,
                                    type: fieldInfo.type,
                                    required: fieldInfo.required || false,
                                    unique: fieldInfo.unique || false,
                                    groupIndex: groupIndex,
                                    groupName: groupName
                                };
                                currentGroupFields.push(fieldData);
                                fields.push(fieldData);
                            } else if (field.code) {
                                console.warn(`⚠️  Field '${field.code}' found in layout but not in field definitions`);
                            }
                        }
                    } else if (item.type === 'GROUP' && item.layout) {
                        // 現在蓄積しているフィールドがあれば、まずそれをグループとして追加
                        if (currentGroupFields.length > 0) {
                            layoutGroups.push({
                                index: groupIndex,
                                fields: currentGroupFields,
                                isMultiField: currentGroupFields.length > 1,
                                groupName: groupName || 'なし'
                            });
                            groupIndex++;
                            currentGroupFields = [];
                        }
                        
                        console.log(`📂 Processing GROUP: ${item.code}`);
                        // GROUP内のレイアウトを再帰的に処理（GROUP名を渡す）
                        processLayoutItems(item.layout, item.code);
                    } else if (item.type === 'SUBTABLE' && item.code && properties[item.code]) {
                        // 現在蓄積しているフィールドがあれば、まずそれをグループとして追加
                        if (currentGroupFields.length > 0) {
                            layoutGroups.push({
                                index: groupIndex,
                                fields: currentGroupFields,
                                isMultiField: currentGroupFields.length > 1,
                                groupName: groupName || 'なし'
                            });
                            groupIndex++;
                            currentGroupFields = [];
                        }
                        
                        const fieldInfo = properties[item.code];
                        const fieldData = {
                            code: item.code,
                            label: fieldInfo.label || item.code,
                            type: fieldInfo.type,
                            required: fieldInfo.required || false,
                            unique: fieldInfo.unique || false,
                            groupIndex: groupIndex,
                            isSubtable: true,
                            groupName: groupName
                        };
                        fields.push(fieldData);
                        layoutGroups.push({
                            index: groupIndex,
                            fields: [fieldData],
                            isSubtable: true,
                            groupName: groupName || 'なし'
                        });
                        groupIndex++;
                    }
                }
                
                // ループ終了後、残っているフィールドをグループとして追加
                if (currentGroupFields.length > 0) {
                    layoutGroups.push({
                        index: groupIndex,
                        fields: currentGroupFields,
                        isMultiField: currentGroupFields.length > 1,
                        groupName: groupName || 'なし'
                    });
                    groupIndex++;
                }
            };
            
            processLayoutItems(layout.layout);
            
            console.log(`📑 Layout groups created:`, layoutGroups.length);
            console.log(`🎯 Final field order:`, fields.map(f => f.code));
            console.log(`🔧 Layout groups:`, layoutGroups.map(g => ({ index: g.index, fieldCount: g.fields.length, type: g.isSubtable ? 'subtable' : g.isMultiField ? 'multifield' : 'single', groupName: g.groupName })));
        } else {
            console.log(`⚠️ No layout available, using default field extraction`);
            // レイアウトがない場合は従来の方法
            for (const [fieldCode, fieldInfo] of Object.entries(properties)) {
                fields.push({
                    code: fieldCode,
                    label: fieldInfo.label || fieldCode,
                    type: fieldInfo.type,
                    required: fieldInfo.required || false,
                    unique: fieldInfo.unique || false,
                    groupIndex: 0
                });
            }
        }
        
        return { fields, layoutGroups };
    }

    formatFieldDisplay(field) {
        // コードとラベルが同じ場合はラベルのみ表示
        if (field.code === field.label) {
            return field.label;
        }
        // 異なる場合はラベル優先でコードを括弧書き
        return `${field.label} (${field.code})`;
    }

    categorizeApp(appName) {
        // apps-registry.jsonからカテゴリ情報を優先的に取得
        if (this.appsRegistry && this.appsRegistry.apps) {
            for (const [appKey, appInfo] of Object.entries(this.appsRegistry.apps)) {
                if (appInfo.name === appName && appInfo.category) {
                    console.log(`📍 Found category for ${appName}: ${appInfo.category}`);
                    return appInfo.category;
                }
            }
        }
        
        // フォールバック: アプリ名からカテゴリを推測
        if (appName.includes('マスタ')) return 'master';
        if (appName.includes('管理') || appName.includes('登録') || appName.includes('設定')) return 'admin';
        if (appName.includes('一覧') || appName.includes('集計') || appName.includes('レポート') || appName.includes('分析')) return 'report';
        if (appName.includes('請求') || appName.includes('支払') || appName.includes('経理') || appName.includes('財務') || appName.includes('会計')) return 'finance';
        if (appName.includes('業務') || appName.includes('作業') || appName.includes('タスク') || appName.includes('プロジェクト') || appName.includes('案件')) return 'business';
        if (appName.includes('ワークフロー') || appName.includes('承認') || appName.includes('申請')) return 'workflow';
        if (appName.includes('サンプル') || appName.includes('テンプレート') || appName.includes('テスト')) return 'sample';
        return 'other';
    }

    async analyzeFields() {
        console.log('🔍 Analyzing fields...');
        
        const fieldFrequency = {};
        
        for (const app of this.apps) {
            for (const field of app.fields) {
                if (!fieldFrequency[field.code]) {
                    fieldFrequency[field.code] = [];
                }
                fieldFrequency[field.code].push({
                    app: app.name,
                    type: field.type,
                    required: field.required
                });
            }
        }
        
        this.fieldAnalysis = {
            frequency: fieldFrequency,
            commonFields: Object.entries(fieldFrequency)
                .filter(([_, apps]) => apps.length > 1)
                .sort((a, b) => b[1].length - a[1].length)
        };
    }

    async detectRelationships() {
        console.log('🔗 Detecting relationships...');
        
        // 共通フィールドによる関連性（重要なもののみ）
        const importantFields = ['ID', 'コード', '番号', '管理番号', 'No', 'KEY', '顧客', 'ユーザー', '部門', '担当者'];
        
        for (const [fieldCode, apps] of this.fieldAnalysis.commonFields.slice(0, 50)) {
            if (apps.length >= 2 && apps.length <= 20) { // 関連が多すぎるものは除外
                const isImportant = importantFields.some(important => fieldCode.includes(important));
                
                if (isImportant || apps.length <= 5) {
                    for (let i = 0; i < apps.length; i++) {
                        for (let j = i + 1; j < apps.length; j++) {
                            this.relationships.push({
                                from: apps[i].app,
                                to: apps[j].app,
                                field: fieldCode,
                                type: 'common_field'
                            });
                        }
                    }
                }
            }
        }
        
        console.log(`🎯 Detected ${this.relationships.length} relationships`);
    }

    generateCategoryColors() {
        const colorSchemes = [
            { bg: 'linear-gradient(135deg, #e1f5fe 0%, #f0f8ff 100%)', border: '#0288d1' },
            { bg: 'linear-gradient(135deg, #f3e5f5 0%, #faf0fb 100%)', border: '#7b1fa2' },
            { bg: 'linear-gradient(135deg, #e8f5e8 0%, #f0faf0 100%)', border: '#388e3c' },
            { bg: 'linear-gradient(135deg, #fff3e0 0%, #fffaf5 100%)', border: '#f57c00' },
            { bg: 'linear-gradient(135deg, #fce4ec 0%, #fef7f9 100%)', border: '#c2185b' },
            { bg: 'linear-gradient(135deg, #e8eaf6 0%, #f3e5f5 100%)', border: '#5e35b1' },
            { bg: 'linear-gradient(135deg, #f1f8e9 0%, #f9fbe7 100%)', border: '#689f38' },
            { bg: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)', border: '#757575' }
        ];
        
        const existingCategories = [...new Set(this.apps.map(app => app.category))];
        let css = '';
        
        existingCategories.forEach((category, index) => {
            const colorIndex = index % colorSchemes.length;
            const colors = colorSchemes[colorIndex];
            css += `        .app-card.${category} { background: ${colors.bg}; border-color: ${colors.border}; }\n`;
        });
        
        return css;
    }

    async generateHTML() {
        console.log('🌐 Generating comprehensive App Schema HTML format...');
        
        let html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kintone Apps Schema Documentation</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8f9fa; 
            line-height: 1.4;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
        }
        h1 { 
            color: #2c3e50; 
            text-align: center; 
            margin-bottom: 10px; 
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center; 
            color: #7f8c8d; 
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        
        /* 統計情報 */
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin: 30px 0; 
        }
        .stat-card { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .stat-number { 
            font-size: 2.2em; 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .stat-label { 
            font-size: 0.9em; 
            opacity: 0.9;
        }
        
        /* 検索機能 */
        .search-container {
            margin: 20px 0;
            text-align: center;
        }
        .search-input {
            padding: 12px 20px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 25px;
            width: 300px;
            outline: none;
            transition: border-color 0.3s;
        }
        .search-input:focus {
            border-color: #667eea;
        }
        
        /* カテゴリタブ */
        .category-tabs {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .tab-button {
            padding: 10px 20px;
            border: none;
            background: #ecf0f1;
            color: #2c3e50;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
        }
        .tab-button:hover {
            background: #bdc3c7;
        }
        .tab-button.active {
            background: #3498db;
            color: white;
        }
        
        /* アプリカード */
        .category { 
            margin: 30px 0; 
        }
        .category.hidden {
            display: none;
        }
        .category h2 { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .app-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 20px; 
        }
        .app-card { 
            border: 1px solid #ddd; 
            border-radius: 10px; 
            padding: 20px; 
            background: white; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .app-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
${this.generateCategoryColors()}        
        .app-title { 
            font-weight: bold; 
            font-size: 1.2em; 
            margin-bottom: 15px; 
            color: #2c3e50; 
            border-bottom: 1px solid #ecf0f1;
            padding-bottom: 10px;
        }
        .field-count {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-bottom: 15px;
        }
        .field-list { 
            font-size: 0.85em; 
            max-height: 500px;
            overflow-y: auto;
        }
        .field-group {
            margin: 8px 0;
            padding: 10px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
            background: rgba(52, 152, 219, 0.05);
        }
        .field-group.multifield {
            border-left-color: #95a5a6;
            background: rgba(155, 89, 182, 0.05);
        }
        .field-group.subtable {
            border-left-color: #e67e22;
            background: rgba(230, 126, 34, 0.05);
        }
        .field-group.unmapped {
            border-left-color: #95a5a6;
            background: rgba(149, 165, 166, 0.05);
        }
        .field-group-header {
            font-size: 0.8em;
            color: #7f8c8d;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .field-group-content {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .field { 
            margin: 3px 0; 
            padding: 5px 8px; 
            background: rgba(255,255,255,0.8); 
            border-radius: 4px; 
            border-left: 3px solid #ecf0f1;
            transition: all 0.2s;
            font-size: 0.9em;
            color: #2c3e50;
        }
        .field:hover {
            background: rgba(255,255,255,0.9);
            border-left-color: #3498db;
            color: #1a252f;
        }
        .field.key { 
            background: #fff9c4; 
            font-weight: bold; 
            border-left-color: #f39c12;
        }
        .field.required {
            border-left-color: #e74c3c;
        }
        .field.unique {
            border-left-color: #9b59b6;
        }
        .field-type {
            color: #5d6d7e;
            font-size: 0.8em;
            float: right;
        }
        
        /* アイコン凡例 */
        .legend {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .legend h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.2em;
            text-align: center;
        }
        .legend-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: white;
            border-radius: 5px;
            border-left: 3px solid #ecf0f1;
            transition: all 0.2s;
        }
        .legend-item:hover {
            background: rgba(255,255,255,0.9);
            border-left-color: #3498db;
        }
        .legend-item.key {
            border-left-color: #f39c12;
        }
        .legend-item.required {
            border-left-color: #e74c3c;
        }
        .legend-item.unique {
            border-left-color: #9b59b6;
        }
        .legend-icon {
            font-size: 1.2em;
            margin-right: 8px;
            min-width: 20px;
        }
        .legend-text {
            font-size: 0.9em;
            color: #2c3e50;
        }
        
        /* 関連性セクション */
        .relationships { 
            margin-top: 40px; 
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
        }
        .relationships h2 {
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .relationship { 
            margin: 8px 0; 
            padding: 15px; 
            background: white; 
            border-left: 4px solid #3498db; 
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .relationship-apps {
            font-weight: bold;
            color: #2c3e50;
        }
        .relationship-field {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        /* レスポンシブ */
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .app-grid { grid-template-columns: 1fr; }
            .stats { grid-template-columns: repeat(2, 1fr); }
            .category-tabs { justify-content: flex-start; overflow-x: auto; }
            .search-input { width: 100%; max-width: 300px; }
        }
        
        /* 印刷用 */
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .app-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Kintone Apps Schema</h1>
        <div class="subtitle">アプリ設計書・フィールド構成図</div>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        })}</div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${this.apps.length}</div>
                <div class="stat-label">総アプリ数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.apps.reduce((sum, app) => sum + app.fields.length, 0)}</div>
                <div class="stat-label">総フィールド数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.relationships.length}</div>
                <div class="stat-label">検出された関連性</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round(this.apps.reduce((sum, app) => sum + app.fields.length, 0) / this.apps.length)}</div>
                <div class="stat-label">平均フィールド数</div>
            </div>
        </div>
        
        <div class="search-container">
            <input type="text" class="search-input" placeholder="アプリ名やフィールド名で検索..." id="searchInput">
        </div>
        
        <div class="category-tabs">
            <button class="tab-button active" onclick="showCategory('all')">すべて</button>`;
        
        // 動的にカテゴリタブを生成
        const existingCategories = [...new Set(this.apps.map(app => app.category))];
        for (const categoryKey of existingCategories) {
            if (this.categories[categoryKey]) {
                html += `
            <button class="tab-button" onclick="showCategory('${categoryKey}')">${this.categories[categoryKey].name}</button>`;
            }
        }
        
        html += `
        </div>

        <div class="legend">
            <h3>📋 フィールドアイコン・グループ表現凡例</h3>
            <div class="legend-grid">
                <div class="legend-item key">
                    <span class="legend-icon">🔑</span>
                    <span class="legend-text">キーフィールド（必須 & 一意）</span>
                </div>
                <div class="legend-item required">
                    <span class="legend-icon">🔴</span>
                    <span class="legend-text">必須フィールド</span>
                </div>
                <div class="legend-item unique">
                    <span class="legend-icon">💎</span>
                    <span class="legend-text">一意フィールド</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">📊</span>
                    <span class="legend-text" style="color: #e67e22;">サブテーブル</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">📝</span>
                    <span class="legend-text">テキストフィールド</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">🔢</span>
                    <span class="legend-text">数値・計算フィールド</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">📅</span>
                    <span class="legend-text">日付・時刻フィールド</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">📋</span>
                    <span class="legend-text">選択フィールド</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">📎</span>
                    <span class="legend-text">ファイルフィールド</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">👤</span>
                    <span class="legend-text">ユーザー選択</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">🏢</span>
                    <span class="legend-text">組織選択</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">👥</span>
                    <span class="legend-text">グループ選択</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">🔍</span>
                    <span class="legend-text">ルックアップ</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon">🔗</span>
                    <span class="legend-text">アプリ間関連性</span>
                </div>
            </div>
        </div>
`;

        // カテゴリ別にアプリを表示
        const categories = [...new Set(this.apps.map(app => app.category))];
        
        // カテゴリ名を動的に取得
        const getCategoryName = (categoryKey) => {
            if (this.categories[categoryKey]) {
                return this.categories[categoryKey].name;
            }
            return categoryKey; // フォールバック
        };

        for (const category of categories) {
            const categoryApps = this.apps.filter(app => app.category === category);
            const categoryName = getCategoryName(category);
            
            html += `        <div class="category" data-category="${category}">
            <h2>${categoryName} (${categoryApps.length})</h2>
            <div class="app-grid">
`;
            
            for (const app of categoryApps) {
                html += `                <div class="app-card ${app.category}" data-app-name="${app.name.toLowerCase()}">
                    <div class="app-title">${app.name}</div>
                    <div class="field-count">総フィールド数: ${app.fields.length} | レイアウトグループ: ${app.layoutGroups.length}</div>
                    <div class="field-list">
`;
                
                // レイアウトグループに基づいてフィールドを表示
                if (app.layoutGroups.length > 0) {
                    for (const group of app.layoutGroups) {
                        // GROUPは表示せず、フィールドのみ表示
                        if (group.groupName && !group.isSubtable && !group.isMultiField) {
                            // GROUP内のフィールドを個別に表示（グループヘッダーなし）
                            for (const field of group.fields) {
                                const dataType = this.mapFieldType(field.type);
                                const fieldDisplay = this.formatFieldDisplay(field);
                                
                                // フィールドの種類に応じてアイコンとクラスを設定
                                let icon = '📝';
                                let fieldClass = 'field';
                                
                                // まず特別な状態（必須・一意）をチェック
                                if (field.required && field.unique) {
                                    icon = '🔑';
                                    fieldClass = 'field key';
                                } else if (field.required) {
                                    icon = '🔴';
                                    fieldClass = 'field required';
                                } else if (field.unique) {
                                    icon = '💎';
                                    fieldClass = 'field unique';
                                } else {
                                    // フィールドタイプに応じてアイコンを設定
                                    switch (field.type) {
                                        case 'SINGLE_LINE_TEXT':
                                        case 'MULTI_LINE_TEXT':
                                        case 'RICH_TEXT':
                                            icon = '📝';
                                            break;
                                        case 'NUMBER':
                                        case 'CALC':
                                            icon = '🔢';
                                            break;
                                        case 'DATE':
                                        case 'TIME':
                                        case 'DATETIME':
                                            icon = '📅';
                                            break;
                                        case 'DROP_DOWN':
                                        case 'RADIO_BUTTON':
                                        case 'CHECK_BOX':
                                            icon = '✅️';
                                            break;
                                        case 'MULTI_SELECT':
                                            icon = '📋';
                                            break;
                                        case 'FILE':
                                            icon = '📎';
                                            break;
                                        case 'LINK':
                                            icon = '🔗';
                                            break;
                                        case 'USER_SELECT':
                                        case 'ORGANIZATION_SELECT':
                                        case 'GROUP_SELECT':
                                            icon = '👥';
                                            break;
                                        case 'SUBTABLE':
                                            icon = '📊';
                                            break;
                                        case 'REFERENCE_TABLE':
                                            icon = '🔗';
                                            break;
                                        default:
                                            icon = '📝';
                                    }
                                }
                                
                                html += `                            <div class="${fieldClass}" data-type="${dataType}">
                                    <span class="field-icon">${icon}</span>
                                    <span class="field-name">${fieldDisplay}</span>
                                    <span class="field-type">${dataType}</span>
                                    <span class="field-group-name">${group.groupName}</span>
                                </div>
`;
                            }
                        } else {
                            // サブテーブルや同一行グループはグループとして表示
                            let groupClass = 'field-group';
                            let groupLabel = '';
                            
                            if (group.isSubtable) {
                                groupClass += ' subtable';
                                const groupName = group.groupName ? ` - ${group.groupName}` : '';
                                groupLabel = `📊 サブテーブル${groupName} (${group.fields.length}フィールド)`;
                            } else if (group.isMultiField) {
                                groupClass += ' multifield';
                                groupLabel = `📂 ${group.groupName || '同一行グループ'} (${group.fields.length}フィールド)`;
                            }
                            
                            html += `                        <div class="${groupClass}">
                                <div class="field-group-header">${groupLabel}</div>
                                <div class="field-group-content">
`;
                            
                            for (const field of group.fields) {
                                const dataType = this.mapFieldType(field.type);
                                const fieldDisplay = this.formatFieldDisplay(field);
                            
                            // フィールドの種類に応じてアイコンとクラスを設定
                            let icon = '📝';
                            let fieldClass = 'field';
                            
                            // まず特別な状態（必須・一意）をチェック
                            if (field.required && field.unique) {
                                icon = '🔑';
                                fieldClass = 'field key';
                            } else if (field.required) {
                                icon = '🔴';
                                fieldClass = 'field required';
                            } else if (field.unique) {
                                icon = '💎';
                                fieldClass = 'field unique';
                            } else {
                                // フィールドタイプに応じてアイコンを設定
                                switch (field.type) {
                                    case 'SINGLE_LINE_TEXT':
                                    case 'MULTI_LINE_TEXT':
                                    case 'RICH_TEXT':
                                        icon = '📝';
                                        break;
                                    case 'NUMBER':
                                    case 'CALC':
                                        icon = '🔢';
                                        break;
                                    case 'DATE':
                                    case 'TIME':
                                    case 'DATETIME':
                                        icon = '📅';
                                        break;
                                    case 'CHECK_BOX':
                                        icon = '✅️';
                                        break;
                                    case 'DROP_DOWN':
                                    case 'RADIO_BUTTON':
                                    case 'MULTI_SELECT':
                                        icon = '📋';
                                        break;
                                    case 'FILE':
                                        icon = '📎';
                                        break;
                                    case 'LINK':
                                        icon = '🔗';
                                        break;
                                    case 'USER_SELECT':
                                        icon = '👤';
                                        break;
                                    case 'ORGANIZATION_SELECT':
                                        icon = '🏢';
                                        break;
                                    case 'GROUP_SELECT':
                                        icon = '👥';
                                        break;
                                    case 'SUBTABLE':
                                        icon = '📊';
                                        break;
                                    case 'REFERENCE_TABLE':
                                        icon = '🔍';
                                        break;
                                    default:
                                        icon = '📝';
                                }
                            }
                            
                            html += `                                <div class="${fieldClass}" data-field-name="${field.code.toLowerCase()}">${icon} ${fieldDisplay} <span class="field-type">${dataType}</span></div>\n`;
                        }
                        
                        html += `                            </div>
                        </div>
`;
                        }
                    }
                } else {
                    // レイアウトグループがない場合は従来の表示
                    html += `                        <div class="field-group">
                        <div class="field-group-header">📝 フィールド一覧</div>
                        <div class="field-group-content">
`;
                    for (const field of app.fields) {
                        const dataType = this.mapFieldType(field.type);
                        const fieldDisplay = this.formatFieldDisplay(field);
                        
                        // フィールドの種類に応じてアイコンとクラスを設定
                        let icon = '📝';
                        let fieldClass = 'field';
                        
                        // まず特別な状態（必須・一意）をチェック
                        if (field.required && field.unique) {
                            icon = '🔑';
                            fieldClass = 'field key';
                        } else if (field.required) {
                            icon = '🔴';
                            fieldClass = 'field required';
                        } else if (field.unique) {
                            icon = '💎';
                            fieldClass = 'field unique';
                        } else {
                            // フィールドタイプに応じてアイコンを設定
                            switch (field.type) {
                                case 'SINGLE_LINE_TEXT':
                                case 'MULTI_LINE_TEXT':
                                case 'RICH_TEXT':
                                    icon = '📝';
                                    break;
                                case 'NUMBER':
                                case 'CALC':
                                    icon = '🔢';
                                    break;
                                case 'DATE':
                                case 'TIME':
                                case 'DATETIME':
                                    icon = '📅';
                                    break;
                                case 'CHECK_BOX':
                                    icon = '✅️';
                                    break;
                                case 'DROP_DOWN':
                                case 'RADIO_BUTTON':
                                case 'MULTI_SELECT':
                                    icon = '📋';
                                    break;
                                case 'FILE':
                                    icon = '📎';
                                    break;
                                case 'LINK':
                                    icon = '🔗';
                                    break;
                                case 'USER_SELECT':
                                    icon = '👤';
                                    break;
                                case 'ORGANIZATION_SELECT':
                                    icon = '🏢';
                                    break;
                                case 'GROUP_SELECT':
                                    icon = '👥';
                                    break;
                                case 'SUBTABLE':
                                    icon = '📊';
                                    break;
                                case 'REFERENCE_TABLE':
                                    icon = '🔍';
                                    break;
                                default:
                                    icon = '📝';
                            }
                        }
                        
                        html += `                            <div class="${fieldClass}" data-field-name="${field.code.toLowerCase()}">${icon} ${fieldDisplay} <span class="field-type">${dataType}</span></div>\n`;
                    }
                    html += `                        </div>
                    </div>
`;
                }
                
                html += `                    </div>
                </div>
`;
            }
            
            html += `            </div>
        </div>
`;
        }
        
        // 関連性の表示
        if (this.relationships.length > 0) {
            html += `        <div class="relationships">
            <h2>🔗 アプリ間関連性 (${this.relationships.length})</h2>
`;
            
            for (const rel of this.relationships.slice(0, 50)) {
                html += `            <div class="relationship">
                <div class="relationship-apps">${rel.from} ⇄ ${rel.to}</div>
                <div class="relationship-field">共通フィールド: ${rel.field}</div>
            </div>
`;
            }
            
            if (this.relationships.length > 50) {
                html += `            <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
                他 ${this.relationships.length - 50} 件の関連性があります
            </div>
`;
            }
            
            html += `        </div>
`;
        }
        
        // JavaScript機能
        html += `    </div>
    
    <script>
        // 検索機能
        document.getElementById('searchInput').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const appCards = document.querySelectorAll('.app-card');
            
            appCards.forEach(card => {
                const appName = card.getAttribute('data-app-name');
                const fields = card.querySelectorAll('[data-field-name]');
                let hasMatch = appName.includes(searchTerm);
                
                if (!hasMatch) {
                    fields.forEach(field => {
                        const fieldName = field.getAttribute('data-field-name');
                        if (fieldName.includes(searchTerm)) {
                            hasMatch = true;
                        }
                    });
                }
                
                card.style.display = hasMatch ? 'block' : 'none';
            });
        });
        
        // カテゴリ切り替え
        function showCategory(category) {
            const categories = document.querySelectorAll('.category');
            const tabs = document.querySelectorAll('.tab-button');
            
            // タブの状態更新
            tabs.forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // カテゴリの表示/非表示
            categories.forEach(cat => {
                if (category === 'all') {
                    cat.classList.remove('hidden');
                } else {
                    const catData = cat.getAttribute('data-category');
                    if (catData === category) {
                        cat.classList.remove('hidden');
                    } else {
                        cat.classList.add('hidden');
                    }
                }
            });
            
            // 検索をクリア
            document.getElementById('searchInput').value = '';
            document.querySelectorAll('.app-card').forEach(card => {
                card.style.display = 'block';
            });
        }
        
        // 統計情報の更新
        function updateStats() {
            console.log('Kintone Apps Schema loaded successfully!');
            console.log('Total apps: ${this.apps.length}');
            console.log('Total fields: ${this.apps.reduce((sum, app) => sum + app.fields.length, 0)}');
            console.log('Total relationships: ${this.relationships.length}');
        }
        
        // ページ読み込み時
        document.addEventListener('DOMContentLoaded', updateStats);
    </script>
</body>
</html>`;
        
        fs.writeFileSync(path.join(OUTPUT_DIR, 'kintone_apps_schema.html'), html);
        
        // 使用方法ガイド
        const guide = `# Kintone Apps Schema Documentation

## 📋 概要
このHTMLファイルは、Kintoneアプリの設計書・フィールド構成図です。

## ✨ 機能
- 🔍 **リアルタイム検索**: アプリ名やフィールド名で瞬時に検索
- 🏷️ **カテゴリ分類**: アプリを業務機能別に分類表示
- 🎨 **視覚的デザイン**: 美しいカードレイアウトと色分け
- 📋 **レイアウトグループ**: フォームレイアウトに基づくフィールドグループ化
- 📱 **レスポンシブ**: PC・タブレット・スマホ対応
- 🖨️ **印刷対応**: そのまま印刷して資料として利用可能

## 🎯 フィールド・グループ分類
- 🔑 **キーフィールド**: 必須・ユニーク・ID系フィールド
- 🔴 **必須フィールド**: 入力必須のフィールド
- 💎 **ユニークフィールド**: 一意制約のあるフィールド
- 📂 **フィールドグループ**: GROUP要素でまとめられたフィールド
- 📊 **サブテーブル**: サブテーブルフィールド

## 📊 統計情報
- 総アプリ数: ${this.apps.length}
- 総フィールド数: ${this.apps.reduce((sum, app) => sum + app.fields.length, 0)}
- 検出された関連性: ${this.relationships.length}
- 平均フィールド数: ${Math.round(this.apps.reduce((sum, app) => sum + app.fields.length, 0) / this.apps.length)}

## 🚀 使用方法
1. \`kintone_apps_schema.html\`をブラウザで開く
2. 検索ボックスでアプリやフィールドを検索
3. カテゴリタブで特定の業務領域を絞り込み
4. 各アプリカードで詳細なフィールド情報とレイアウトグループを確認

## 💡 活用方法
- アプリ設計書の作成
- フィールド設計の参考
- レイアウト設計の検討
- アプリ間連携の検討
- 運用・保守での参照資料
- 新メンバーへの説明資料

---
*Generated by Kintone Apps Schema Generator*
`;
        
        fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), guide);
        
        console.log(`📁 Files generated in ${OUTPUT_DIR}/`);
        console.log(`📄 Main file: ${OUTPUT_DIR}/kintone_apps_schema.html`);
        console.log(`📖 Guide: ${OUTPUT_DIR}/README.md`);
    }

    isKeyField(fieldCode) {
        const keyPatterns = ['ID', 'コード', '番号', '管理番号', 'No', 'KEY', 'レコード番号', 'ユニークID', '識別子'];
        return keyPatterns.some(pattern => fieldCode.includes(pattern));
    }

    mapFieldType(fieldType) {
        const typeMapping = {
            'SINGLE_LINE_TEXT': 'テキスト',
            'MULTI_LINE_TEXT': '複数行テキスト',
            'NUMBER': '数値',
            'DECIMAL': '小数',
            'DATE': '日付',
            'TIME': '時刻',
            'DATETIME': '日時',
            'DROP_DOWN': 'ドロップダウン',
            'RADIO_BUTTON': 'ラジオボタン',
            'CHECK_BOX': 'チェックボックス',
            'USER_SELECT': 'ユーザー選択',
            'ORGANIZATION_SELECT': '組織選択',
            'GROUP_SELECT': 'グループ選択',
            'FILE': 'ファイル',
            'LINK': 'リンク',
            'RECORD_NUMBER': 'レコード番号',
            'CREATOR': '作成者',
            'CREATED_TIME': '作成日時',
            'MODIFIER': '更新者',
            'UPDATED_TIME': '更新日時',
            'STATUS': 'ステータス',
            'CATEGORY': 'カテゴリ',
            'CALC': '計算',
            'LOOKUP': 'ルックアップ',
            'REFERENCE_TABLE': '関連レコード一覧'
        };
        
        return typeMapping[fieldType] || fieldType;
    }
}

// メイン実行
if (require.main === module) {
    const generator = new AppSchemaGenerator();
    generator.generate().catch(console.error);
}

module.exports = AppSchemaGenerator;
