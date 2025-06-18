#!/bin/bash

# Kintone Development Template Setup Script
# このスクリプトは初回セットアップを自動化します

set -e  # エラーが発生した場合は即座に終了

# 色付きログ出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# バナー表示
show_banner() {
    echo -e "${BLUE}"
    cat << "EOF"
    
    ██╗  ██╗██╗███╗   ██╗████████╗ ██████╗ ███╗   ██╗███████╗
    ██║ ██╔╝██║████╗  ██║╚══██╔══╝██╔═══██╗████╗  ██║██╔════╝
    █████╔╝ ██║██╔██╗ ██║   ██║   ██║   ██║██╔██╗ ██║█████╗  
    ██╔═██╗ ██║██║╚██╗██║   ██║   ██║   ██║██║╚██╗██║██╔══╝  
    ██║  ██╗██║██║ ╚████║   ██║   ╚██████╔╝██║ ╚████║███████╗
    ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝╚══════╝
    
    Development Template Setup
    
EOF
    echo -e "${NC}"
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェックしています..."
    
    # Node.js のバージョンチェック
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | cut -d 'v' -f 2)
        REQUIRED_NODE_VERSION="13.0.0"
        
        if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE_VERSION" ]; then
            log_success "Node.js $NODE_VERSION が見つかりました"
        else
            log_error "Node.js $REQUIRED_NODE_VERSION 以上が必要です（現在: $NODE_VERSION）"
            exit 1
        fi
    else
        log_error "Node.js がインストールされていません"
        log_info "https://nodejs.org/ からインストールしてください"
        exit 1
    fi
    
    # npm の確認
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm -v)
        log_success "npm $NPM_VERSION が見つかりました"
    else
        log_error "npm が見つかりません"
        exit 1
    fi
    
    # Git の確認
    if command -v git >/dev/null 2>&1; then
        GIT_VERSION=$(git --version | awk '{print $3}')
        log_success "Git $GIT_VERSION が見つかりました"
    else
        log_warning "Git が見つかりません（バージョン管理には必要です）"
    fi
}

# 依存関係のインストール
install_dependencies() {
    log_info "依存関係をインストールしています..."
    
    if npm install; then
        log_success "依存関係のインストールが完了しました"
    else
        log_error "依存関係のインストールに失敗しました"
        exit 1
    fi
}

# 環境変数ファイルの作成
setup_env_file() {
    log_info "環境変数ファイルを設定しています..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.sample" ]; then
            cp .env.sample .env
            log_success ".env ファイルを作成しました"
            log_warning "設定を完了するために .env ファイルを編集してください"
            
            # インタラクティブ設定（オプション）
            read -p "今すぐ環境変数を設定しますか？ (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                configure_env_interactive
            fi
        else
            log_error ".env.sample ファイルが見つかりません"
            exit 1
        fi
    else
        log_warning ".env ファイルは既に存在します"
    fi
}

# インタラクティブ環境変数設定
configure_env_interactive() {
    log_info "環境変数を設定します..."
    
    # 開発環境の設定
    echo -e "\n${BLUE}=== 開発環境設定 ===${NC}"
    read -p "開発環境ドメイン (例: your-dev.cybozu.com): " DEV_DOMAIN
    read -p "開発環境ユーザー名: " DEV_USERNAME
    read -s -p "開発環境パスワード: " DEV_PASSWORD
    echo
    
    # 本番環境の設定
    echo -e "\n${BLUE}=== 本番環境設定 ===${NC}"
    read -p "本番環境ドメイン (例: your-prod.cybozu.com): " PROD_DOMAIN
    read -p "本番環境ユーザー名: " PROD_USERNAME
    read -s -p "本番環境パスワード: " PROD_PASSWORD
    echo
    
    # Basic認証の設定（オプション）
    echo -e "\n${BLUE}=== Basic認証設定 (オプション) ===${NC}"
    read -p "Basic認証を使用しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Basic認証ユーザー名: " BASIC_USERNAME
        read -s -p "Basic認証パスワード: " BASIC_PASSWORD
        echo
    fi
    
    # .envファイルの更新
    {
        echo "# Kintone Development Environment Configuration"
        echo ""
        echo "# Development Environment"
        echo "KINTONE_DEV_DOMAIN=${DEV_DOMAIN}"
        echo "KINTONE_DEV_USERNAME=${DEV_USERNAME}"
        echo "KINTONE_DEV_PASSWORD=${DEV_PASSWORD}"
        
        if [ -n "$BASIC_USERNAME" ]; then
            echo "KINTONE_DEV_BASIC_USERNAME=${BASIC_USERNAME}"
            echo "KINTONE_DEV_BASIC_PASSWORD=${BASIC_PASSWORD}"
        else
            echo "KINTONE_DEV_BASIC_USERNAME="
            echo "KINTONE_DEV_BASIC_PASSWORD="
        fi
        
        echo ""
        echo "# Production Environment"
        echo "KINTONE_PROD_DOMAIN=${PROD_DOMAIN}"
        echo "KINTONE_PROD_USERNAME=${PROD_USERNAME}"
        echo "KINTONE_PROD_PASSWORD=${PROD_PASSWORD}"
        
        if [ -n "$BASIC_USERNAME" ]; then
            echo "KINTONE_PROD_BASIC_USERNAME=${BASIC_USERNAME}"
            echo "KINTONE_PROD_BASIC_PASSWORD=${BASIC_PASSWORD}"
        else
            echo "KINTONE_PROD_BASIC_USERNAME="
            echo "KINTONE_PROD_BASIC_PASSWORD="
        fi
        
        echo ""
        echo "# Build Configuration"
        echo "NODE_ENV=development"
    } > .env
    
    log_success "環境変数が設定されました"
}

# アプリレジストリの設定
setup_app_registry() {
    log_info "アプリレジストリを確認しています..."
    
    if [ -f "apps-registry.json" ]; then
        # ファイルが空でないかチェック
        if [ -s "apps-registry.json" ]; then
            log_success "アプリレジストリは既に設定されています"
        else
            log_warning "アプリレジストリファイルが空です"
            log_info "サンプル設定が含まれています。実際のアプリ情報に更新してください"
        fi
    else
        log_error "apps-registry.json ファイルが見つかりません"
        exit 1
    fi
}

# 初期ビルドテスト
test_build() {
    log_info "初期ビルドテストを実行しています..."
    
    if npm run build >/dev/null 2>&1; then
        log_success "ビルドテストが成功しました"
    else
        log_warning "ビルドテストに失敗しました"
        log_info "手動で 'npm run build' を実行して問題を確認してください"
    fi
}

# Lintテスト
test_lint() {
    log_info "コード品質チェックを実行しています..."
    
    if npm run lint >/dev/null 2>&1; then
        log_success "コード品質チェックが成功しました"
    else
        log_warning "コード品質に問題があります"
        log_info "'npm run fix' で自動修正を試してください"
    fi
}

# 開発サーバーの準備確認
check_dev_server() {
    log_info "開発環境の準備を確認しています..."
    
    # package.jsonのスクリプトの存在確認
    if npm run --silent 2>/dev/null | grep -q "watch"; then
        log_success "監視モードが利用可能です"
        log_info "開発時は 'npm run watch' を実行してください"
    else
        log_warning "監視モードが設定されていません"
    fi
}

# Git設定の確認
check_git_setup() {
    log_info "Git設定を確認しています..."
    
    if [ -d ".git" ]; then
        log_success "Gitリポジトリが初期化されています"
        
        # リモートリポジトリの確認
        if git remote -v >/dev/null 2>&1; then
            REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "未設定")
            log_info "リモートリポジトリ: $REMOTE_URL"
        fi
    else
        log_warning "Gitリポジトリが初期化されていません"
        read -p "Gitリポジトリを初期化しますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git init
            log_success "Gitリポジトリを初期化しました"
        fi
    fi
}

# .gitignoreの設定
setup_gitignore() {
    log_info ".gitignore の設定を確認しています..."
    
    if [ ! -f ".gitignore" ]; then
        log_info ".gitignore ファイルを作成しています..."
        cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime
*.pid
*.seed
*.pid.lock

# Coverage
coverage/

# Temporary
.tmp/
temp/

# Backup files
backup-*
*.backup
EOF
        log_success ".gitignore ファイルを作成しました"
    else
        # 必要な項目が含まれているかチェック
        if ! grep -q "\.env" .gitignore; then
            echo ".env" >> .gitignore
            log_info ".gitignore に .env を追加しました"
        fi
    fi
}

# 最終メッセージ
show_completion_message() {
    echo -e "\n${GREEN}🎉 セットアップが完了しました！${NC}\n"
    
    echo -e "${BLUE}次のステップ:${NC}"
    echo "1. .env ファイルを編集してkintone環境情報を設定"
    echo "2. apps-registry.json を編集してアプリ情報を登録"
    echo "3. 開発を開始: npm run watch"
    echo ""
    
    echo -e "${BLUE}利用可能なコマンド:${NC}"
    echo "  npm run watch          - 監視モード（開発用）"
    echo "  npm run build          - 本番用ビルド"
    echo "  npm run lint           - コード品質チェック"
    echo "  npm run upload:dev     - 開発環境にアップロード"
    echo "  npm run upload:prod    - 本番環境にアップロード"
    echo "  npm run design:export:dev  - 開発環境から設計をpull"
    echo "  npm run design:import:prod - 本番環境に設計をpush"
    echo ""
    
    echo -e "${BLUE}ドキュメント:${NC}"
    echo "  README.md                     - 基本的な使い方"
    echo "  docs/DEVELOPMENT_GUIDE.md     - 開発ガイド"
    echo "  docs/DEPLOYMENT_GUIDE.md      - デプロイガイド"
    echo "  docs/FAQ.md                   - よくある質問"
    echo ""
    
    echo -e "${YELLOW}注意: セキュリティのため .env ファイルはGitにコミットしないでください${NC}"
}

# メイン処理
main() {
    show_banner
    
    log_info "Kintone Development Template のセットアップを開始します..."
    
    check_prerequisites
    install_dependencies
    setup_env_file
    setup_app_registry
    setup_gitignore
    check_git_setup
    test_build
    test_lint
    check_dev_server
    
    show_completion_message
}

# スクリプト実行
main "$@"
