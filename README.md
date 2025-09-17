# IP 查询工具

IP 查询工具网站，提供免费的在线 IP 地址查询、地理位置检测、DNS 出口分析、CDN 命中节点测试和网络连通性检查功能。

## 主要功能

- **IP 地址查询**：支持多个国内外服务（如 itdog.cn、Cloudflare、IP.SB 等）获取用户 IP 地址及地理位置信息。
- **隐私保护**：提供开关隐藏 IP 地址或地理位置，便于截图分享。
- **网络连通性测试**：测试到百度、网易云音乐、GitHub 和 YouTube 的延迟。
- **CDN 命中节点测试**：检测多个 CDN 提供商（如 Cloudflare、Fastly、EdgeOne 等）的命中节点。
- **DNS 出口查询**：分析 DNS 出口信息，包括服务商、运营商、IP 和位置。

## 技术栈

- **前端**：HTML5、CSS3、JavaScript (ES6+)
- **部署**：Cloudflare Workers
- **工具**：Wrangler (Cloudflare CLI)、Biome (代码格式化)
- **API**：使用第三方 IP 查询服务和 CDN 测试端点

## 安装与部署

1. **克隆项目**：
   ```bash
   git clone https://github.com/hydrz/ip.git
   cd ip
   ```

2. **安装依赖**：
   - 确保已安装 Node.js 和 pnpm
     ```bash
     pnpm install
     ```

3. **本地开发**：
   - 启动本地服务器：
     ```bash
     pnpm run dev
     ```
   - 访问 http://localhost:5173 查看效果。

5. **部署到生产**：
   - 构建并部署：
     ```bash
    npm run deploy
     ```

## 使用方法

- 访问网站后，页面会自动加载 IP 信息。
- 使用右侧开关隐藏敏感信息（如 IP 或地理位置）。
- 查看网络连通性、CDN 命中和 DNS 出口结果。
- 所有数据通过浏览器前端获取，无需后端服务器。

## 项目结构

```
ip/
├── public/              # 静态资源（图片、图标等）
├── src/
│   ├── ip.js           # IP 查询逻辑
│   ├── cdn.js          # CDN 测试逻辑
│   ├── probe.js        # 网络连通性测试逻辑
│   └── dns.js          # DNS 出口查询逻辑
├── index.html          # 主页面
├── wrangler.jsonc      # Cloudflare Workers 配置
└── README.md           # 项目说明
```

## 开发规范

- **代码风格**：遵循 JavaScript 编码规范，使用 Biome 格式化工具。
- **注释**：所有代码注释使用英文。
- **错误处理**：所有异步操作均包含重试机制和异常处理。
- **性能优化**：使用缓存和延迟加载减少请求。

## 贡献指南

欢迎提交 Issue 和 Pull Request！请确保：
- 遵循现有代码风格。
- 添加必要的测试和文档。
- 更新 README 以反映更改。

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](./LICENSE) 文件。