# Git历史清理指南

## 🚨 重要警告

清理Git历史会重写提交记录，这会影响：
- 所有分支的历史
- 标签(tag)
- 其他协作者的工作副本

**执行前请确保：**
1. 已完整备份项目
2. 所有协作者已知晓
3. 理解操作后果

## 📋 清理步骤

### 步骤1：创建备份
```bash
git clone --mirror [你的仓库地址] backup-repo
cd backup-repo
```

### 步骤2：使用git filter-branch清理

#### 清理单个文件类型
```bash
# 清理日志文件
git filter-branch --force --index-filter \
"git rm --cached --ignore-unmatch *.log npminstall-debug.log" \
--prune-empty --tag-name-filter cat -- --all

# 清理dist目录
git filter-branch --force --index-filter \
"git rm -r --cached --ignore-unmatch dist/" \
--prune-empty --tag-name-filter cat -- --all

# 清理build目录
git filter-branch --force --index-filter \
"git rm -r --cached --ignore-unmatch build/" \
--prune-empty --tag-name-filter cat -- --all

# 清理node_modules
git filter-branch --force --index-filter \
"git rm -r --cached --ignore-unmatch node_modules/" \
--prune-empty --tag-name-filter cat -- --all
```

#### 一次性清理所有
```bash
git filter-branch --force --index-filter \
'git rm -r --cached --ignore-unmatch dist build *.log npminstall-debug.log node_modules .DS_Store Thumbs.db' \
--prune-empty --tag-name-filter cat -- --all
```

### 步骤3：清理引用
```bash
# 清理reflog
git reflog expire --expire=now --all

# 清理垃圾数据
git gc --prune=now --aggressive
```

### 步骤4：验证清理
```bash
# 检查是否还有被忽略的文件
git ls-files | grep -E "(dist|build|.*\.log|node_modules)"

# 检查历史大小
git count-objects -vH
```

### 步骤5：强制推送到远程
```bash
# 推送到远程仓库
git push origin --force --all

# 如果有标签，也推送标签
git push origin --force --tags
```

## 🔄 协作者注意事项

**其他协作者需要执行：**
```bash
git fetch origin
git reset --hard origin/[分支名]
# 或重新克隆仓库
git clone [仓库地址]
```

## 🛡️ 安全建议

### 使用交互式工具（推荐）
```bash
# 安装git-filter-repo（需要Python）
pip install git-filter-repo

# 使用git-filter-repo清理
git-filter-repo --path dist --invert-paths
git-filter-repo --path build --invert-paths
git-filter-repo --path-glob "*.log" --invert-paths
```

### 使用BFG Repo-Cleaner

1. 下载BFG: https://rtyley.github.io/bfg-repo-cleaner/
2. 创建规则文件：
   ```
   dist/
   build/
   *.log
   node_modules/
   ```
3. 运行：
   ```bash
   java -jar bfg.jar --delete-folders dist --delete-folders build --delete-files *.log
   ```

## 📊 清理前后对比

### 清理前检查
```bash
# 查看仓库大小
git count-objects -vH

# 查看大文件
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print $3 " " $2}' | sort -nr
```

### 清理后验证
```bash
# 确认清理成功
git log --oneline --name-only | grep -v "dist\|build\|\.log"
```

## 🚀 快速方案

**如果你确定要清理，可以直接运行：**
```bash
git filter-branch --force --index-filter 'git rm -r --cached --ignore-unmatch dist build *.log npminstall-debug.log node_modules .DS_Store Thumbs.db' --prune-empty --tag-name-filter cat -- --all && git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

## ⚡ 一键脚本

项目已提供清理脚本：
- `clean-git-history.bat` - 使用git filter-branch
- `clean-with-bfg.bat` - 使用BFG（推荐）

**使用前请务必备份！**