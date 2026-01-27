FROM node:18-alpine

WORKDIR /app

# 依存関係のインストール（ビルドに必要なdevDependenciesも含む）
COPY package*.json ./
RUN npm ci

# ソースコードのコピー
COPY . .

# TypeScriptのビルド
RUN npm run build

# 本番用の依存関係のみを再インストール（オプション: イメージサイズを削減）
RUN npm ci --only=production && npm cache clean --force

# 本番環境で実行
CMD ["npm", "start"]
