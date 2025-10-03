# My Notes 浏览器笔记扩展

一个功能强大的浏览器扩展，让您可以随时随地记录和管理笔记。支持 Markdown 编写，本地存储，并提供丰富的编辑功能。

## 主要功能

- 🚀 随处可用的悬浮笔记按钮
- 📝 支持 Markdown 实时预览
- 🔒 笔记加密保护
- 💾 自动保存
- 📥 导入/导出 Markdown 文件
- 📊 储存空间管理
- 🎨 美观的用户界面

## 技术栈

- Vite - 构建工具
- 原生 JavaScript (ES Modules)
- Marked - Markdown 解析
- DOMPurify - XSS 防护
- Font Awesome - 图标库
- Highlight.js - 代码高亮

## 开发环境设置

1. 克隆仓库：
```bash
git clone https://github.com/ccizm/my-notes.git
cd my-notes
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 构建生产版本：
```bash
npm run build
```

## 项目结构

```
my-notes/
├── src/
│   ├── icons/           # 扩展图标
│   ├── background.js    # 扩展后台脚本
│   ├── content-script.js# 注入页面的脚本
│   ├── dialog-component.js # 对话框组件
│   ├── main.js         # 主入口文件
│   ├── note-app.js     # 笔记应用核心逻辑
│   ├── note-app.html   # 笔记应用HTML
│   └── note-app.css    # 样式文件
├── package.json        # 项目配置
└── vite.config.js     # Vite配置
```

## 功能特点

### 1. 笔记管理
- 创建、编辑、删除笔记
- Markdown 格式支持
- 实时预览
- 自动保存
- 字数统计

### 2. 数据安全
- 笔记加密功能
- 本地存储
- XSS 防护

### 3. 用户体验
- 拖拽式悬浮按钮
- 响应式设计
- 快捷键支持
- 暗色主题支持

### 4. 导入/导出
- 支持导入 .md 和 .txt 文件
- 导出为 Markdown 文件

### 5. 存储管理
- 可视化存储空间使用情况
- 自动存储限制提醒
- 智能存储优化

## 使用方法

1. 点击浏览器工具栏中的扩展图标或使用悬浮按钮打开笔记应用
2. 创建新笔记或选择已有笔记进行编辑
3. 使用 Markdown 语法编写笔记内容
4. 实时预览格式化后的效果
5. 所有更改会自动保存

## 隐私说明

- 所有数据存储在本地
- 不收集任何用户信息
- 不需要网络连接

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 许可证

本项目采用 Apache 2.0 许可证，详情请参阅 [LICENSE](LICENSE) 文件。

## 作者

Siem

## 鸣谢

- [Marked](https://marked.js.org/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Font Awesome](https://fontawesome.com/)
- [Highlight.js](https://highlightjs.org/)
