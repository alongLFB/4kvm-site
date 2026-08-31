# 4KVM 在线影视聚合系统 (4KVM Video CMS)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Artplayer](https://img.shields.io/badge/Artplayer-5.4.0-06b6d4?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Supported-5a0fc8?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker)

**现代、轻量、高性能的高清影视聚合点播平台**  
集成万级高清影视片库、6 维多条件筛选系统、PWA 原生客户端支持与 Artplayer 5.4.0 移动端自适应播放。

[🌐 访问线上 Demo: 4kvm.alonglfb.com](https://4kvm.alonglfb.com)

</div>

---

## ✨ 核心功能与特色

- 🎬 **万级海量影视片库**
  - 收录 10,000+ 部高清影视作品，涵盖【电影】、【电视剧】、【动漫】、【综艺】全品类；
  - 拥有 500+ 页毫秒级极速分页器与高速内存元数据索引。
- 👑 **多源双引擎极速播放线路**
  - 默认优先接入 **👑 非凡资源专线 (1080P极速)** 与 **⚡ 量子专线 (1080P秒播)**；
  - 支持多线路一键无缝平滑切换，进度记忆与自动断点续播。
- 🔍 **6 维高级多条件组合筛选中心**
  - 支持按【板块】、【地区】、【语言】、【年份】、【画质】、【状态】自由交叉组合（AND 运算）；
  - URL 深度同步，支持随时分享筛选结果与浏览器前进/后退；
  - 移动端支持手指横向滑动选择。
- 📱 **全平台 PWA 原生应用支持**
  - 支持 iOS (Safari 添加到主屏幕)、Android (Chrome 一键安装应用) 与 PC 桌面端独立窗口运行；
  - 拥有独立的桌面图标与启动画面，隐藏浏览器地址栏，享受原生 App 般的沉浸体验；
  - 配置 Service Worker 离线与静态资源毫秒级秒开缓存。
- 📺 **Artplayer 5.4.0 深度定制播放体验**
  - **原生 `autoOrientation` 旋转**：手机端点击全屏自动根据视频宽高比旋转横屏铺满，退出全屏自动恢复竖屏；
  - **`playsInline` 内联播放**：防止 iOS Safari / 微信强制接管全屏弹窗；
  - **全屏防误触锁屏**：全屏看剧常驻 `lock: true` 锁屏按钮；
  - **长按 2x 倍速**：移动端长按屏幕任意位置自动 2 倍速快进；
  - **无线投屏**：支持 Apple AirPlay 原生投屏。
- 📱 **深度移动端 UI 适配**
  - 底部常驻悬浮导航栏（Bottom Tab Bar），单手盲操更顺手；
  - 响应式栅格卡片布局与精致暗黑视觉设计。

---

## 🛠️ 技术栈

- **核心框架**：[Next.js 15](https://nextjs.org/) (App Router, Server Components & Client Components)
- **UI 库 & 样式**：[React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **播放引擎**：[Artplayer.js 5.4.0](https://artplayer.org/) + [hls.js](https://github.com/video-dev/hls.js/)
- **离线与缓存**：Progressive Web App (PWA) + Service Worker
- **容器与部署**：Docker, Docker Compose, Nginx (SSL/TLS 反向代理)

---

## 📁 项目目录结构

```
4kvm-site/
├── public/                       # 静态资源与 PWA 资产
│   ├── manifest.json             # PWA Web App Manifest 规范
│   ├── sw.js                     # PWA Service Worker 缓存脚本
│   ├── icon-192.png              # PWA 192x192 图标
│   ├── icon-512.png              # PWA 512x512 图标
│   ├── icon-maskable-512.png     # PWA 自适应圆形遮罩图标
│   └── apple-touch-icon.png      # iOS 桌面图标
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/           # 健康检查接口
│   │   │   └── vod/              # 影视数据与多维过滤 API
│   │   ├── category/             # 6维多条件片库筛选页
│   │   ├── history/              # 本地播放历史记录页
│   │   ├── play/[id]/            # 视频播放与选集切换页
│   │   ├── search/               # 全网模糊检索页
│   │   ├── globals.css           # 全局样式与自定义暗色主题
│   │   ├── layout.tsx            # 根布局 (PWA, 元数据, 响应式外框)
│   │   └── page.tsx              # 首页精选与分类推荐展示
│   ├── components/
│   │   ├── Footer.tsx            # 底部版权与声明
│   │   ├── HeroBanner.tsx        # 首页大图焦点推荐轮播
│   │   ├── MovieCard.tsx         # 影视封面卡片
│   │   ├── Navbar.tsx            # 顶部导航栏与移动端底部悬浮栏
│   │   ├── PwaRegister.tsx       # PWA Service Worker 注册与安装提示
│   │   └── Player/
│   │       └── ArtPlayer.tsx     # Artplayer 5.4.0 播放器组件
│   └── lib/
│       ├── data.ts               # 万级影视数据库定义
│       ├── types.ts              # TypeScript 数据模型规范
│       └── vod-service.ts        # 高性能多维组合查询过滤引擎
├── compose.yaml                  # Docker Compose 部署编排
├── Dockerfile                    # 多阶段构建生产镜像 Dockerfile
├── next.config.ts                # Next.js 配置文件
├── package.json                  # 项目依赖
├── tailwind.config.ts            # Tailwind 主题定制配置
└── tsconfig.json                 # TypeScript 编译配置
```

---

## 🚀 本地开发与快速上手

### 1. 克隆与安装依赖

```bash
# 进入项目目录
cd 4kvm-site

# 安装依赖
npm install --legacy-peer-deps
```

### 2. 启动本地开发服务

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始调试。

### 3. 本地生产打包与验证

```bash
npm run build
npm run start
```

---

## 🐳 Docker 生产环境部署

项目自带优化过的多阶段构建 `Dockerfile`（基于 Alpine Linux 轻量基础镜像），直接通过 Docker Compose 一键启动：

```bash
# 构建并后台启动容器
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看实时运行日志
docker compose logs -f
```

---

## 📄 免责声明 (Disclaimer)

本项目所有影视资源与播放切片链接均来源于第三方上游采集站公开接口，仅供技术研究、个人学习交流使用，不存储任何实际音视频文件。

---
