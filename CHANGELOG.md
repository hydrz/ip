# Changelog

## [v1.1.0] - 2025-09-18

### Changed
- 重构样式：更新颜色变量，改进响应式设计。
- 调整边框半径和间距，优化小屏幕布局。
- 调整网格布局，提高响应式和卡片显示。
- 更新网格布局为行方向，改进卡片响应式。
- 改进 IP 和 DNS 表的布局和结构，增强响应式和可读性。
- 清理代码格式，改进多个文件的可读性。
- 重组 IP 服务数据结构，改进随机地址生成。
- 实现代码变更，增强功能和性能。

## [1.0.0] - 2025-09-18

### Added
- Initial release of the browser-based IP query tool.
- IP address lookup with geolocation detection using multiple services (itdog, cloudflare, etc.).
- DNS egress analysis via Fastly, IPAPI, and Surfshark.
- CDN hit node testing for providers like Cloudflare, Fastly, EdgeOne, and others.
- Network connectivity tests to sites like Baidu, NetEase Music, GitHub, and YouTube.
- Privacy features: hide sensitive info and randomize data.
- No backend required; all data fetched via frontend.
- Retry mechanisms and error handling for reliability.
- Support for deployment on Cloudflare Workers using Wrangler.
- Development setup with Vite, Biome for linting, and pnpm for package management.

### Technical Details
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Deployment: Cloudflare Workers
- Tools: Vite, Wrangler, Biome

### Installation and Usage
1. Clone the repository: `git clone https://github.com/hydrz/ip.git`
2. Install dependencies: `pnpm install`
3. Run locally: `pnpm run dev`
4. Deploy: `npm run deploy`

This version is a fork and enhancement of [https://ip.skk.moe/](https://ip.skk.moe/).