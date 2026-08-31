# 4KVM 在线影视聚合与实时同步放映系统 (4KVM Video & Sync CMS)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Artplayer](https://img.shields.io/badge/Artplayer-5.4.0-06b6d4?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Supported-5a0fc8?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker)

**现代、轻量、高性能的高清影视聚合点播与多人实时同步放映厅平台**  
集成万级高清影视片库、6 维多条件组合筛选、免登录多人实时共赏放映厅、毫秒级播放同步、全双工聊天与 PWA 原生应用支持。

[🌐 访问线上 Demo: 4kvm.alonglfb.com](https://4kvm.alonglfb.com) · [🎪 公开放映广场](https://4kvm.alonglfb.com/hall)

</div>

---

## ✨ 核心功能与特色

### 1. 👥 多人实时同步放映厅（Watch Together）
- **🎪 放映广场大厅 (`/hall`)**：实时展示全站活跃的放映厅，支持公开房间免密一键上车，私密房间凭口令加入；
- **⚡ 毫秒级播放进度同步**：
  - 基于 Server-Sent Events (SSE) 协议，播放/暂停/拖动进度条（带 250ms 智能防抖）全员毫秒级精确对齐；
  - 双向防回声隔离驱动（Echo-Free Player Driver），彻底杜绝跨端事件死循环；
- **👑 房主精细化双层权限控制**：
  - **进度控制权限**：`仅房主可控` vs `全员自由控制`；
  - **选集与换源权限**：`仅房主可换集换源` vs `全员自由换集换源`；
  - 无权限时底层播放器拦截物理点击并弹出权限提示，杜绝本地脱节；
- **🎬 房内无缝「更换放映影片」**：
  - 房主无需解散房间，随时在房内调出 6 维选片组件挑选新剧，全员播放器秒级自动切片起播，聊天记录与观众列表完整保留；
- **🛡️ 房主离线自动顺延与主动移交机制**：
  - 房主退出时支持主动顺延或一键解散；如遇意外断网掉线，系统心跳守护程序自动将房主特权移交给下位加入的观众；
- **🔒 100% 内存无痕隐私架构（Hot State In-Memory）**：
  - 房间与公屏消息纯内存驻留（最新 100 条），房间解散或空置 15 分钟后物理彻底销毁，数据库零永久留痕，极致保护私密性。

---

### 2. 🌐 全球两级精准 GeoIP 解析与设备识别
- **设备标识**：基于 User-Agent 自动识别设备型号（📱 iPhone 手机、💻 Windows PC、📱 iPad 平板、💻 Mac 电脑 等）；
- **双层级精准定位**：统一输出 `[国家] · [省/州/城市]` 双层级（如 `🇦🇪 阿联酋 · 阿布扎比`、`🇨🇳 中国 · 上海`、`中国 · 广东 广州`、`🇺🇸 美国 · 洛杉矶`）；
- **IPv4 / IPv6 智能脱敏**：前端默认对敏感 IP 进行星号脱敏（`217.165.*.*` / `240e:388:****:****::*`），仅房主管理视角支持一键查看完整明文。

---

### 3. 🔍 6 维高级多条件组合筛选中心 (`/category` & `FilmPickerModal`)
- **全维度自由交叉过滤（AND 运算）**：
  1. **类型 (Type)**：`全部` | `电影` | `电视剧` | `动漫` | `综艺` | `短剧` | `纪录片` | `4K专区`
  2. **地区 (Area)**：`全部` | `大陆` | `香港` | `台湾` | `日本` | `韩国` | `欧美` | `泰国` | `其它`
  3. **年份 (Year)**：`全部` | `今年` | `去年` | `10年代` | `00年代` | `90年代` | `80年代` | `更早`
  4. **语言 (Lang)**：`全部` | `国语` | `粤语` | `英语` | `韩语` | `日语` | `泰语` | `其它`
  5. **画质 (Quality)**：`全部` | `4K超清` | `1080P` | `720P` | `HD` | `蓝光`
  6. **状态 (Status)**：`全部` | `连载中` | `全集`
- **关键词即时搜索**：支持输入片名、演员、导演即时检索，配合多条件过滤与翻页导航。

---

### 4. 📺 Artplayer 5.4.0 深度定制播放体验
- **原生 `autoOrientation` 自动旋转**：移动端进入全屏自动旋转横屏铺满，退出全屏自动恢复；
- **网页全屏剧场模式 (`fullscreenWeb`)**：突破浏览器安全限制，支持房主远程跨设备同步开启全屏剧场模式；
- **`playsInline` 内联播放**：防止移动端浏览器/微信强制接管播放弹窗；
- **全屏防误触锁屏**：全屏看剧常驻 `lock: true` 物理防误触锁；
- **长按 2x 倍速快进**与 **Apple AirPlay 无线投屏**。

---

### 5. 📱 全平台 PWA 原生应用与移动端适配
- 支持 iOS (添加到主屏幕)、Android (一键安装 App) 与 PC 桌面端独立窗口无边框运行；
- 底部常驻悬浮导航栏（Bottom Tab Bar），单手盲操更流畅；
- 配合 Service Worker 实现静态资源毫秒级秒开体验。

---

## 🛠️ 技术栈

- **核心框架**：[Next.js 15](https://nextjs.org/) (App Router, React Server Components)
- **前端库 & 样式**：[React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **播放引擎**：[Artplayer.js 5.4.0](https://artplayer.org/) + [hls.js](https://github.com/video-dev/hls.js/)
- **实时通信**：Server-Sent Events (SSE) + Node.js In-Memory Event Emitter
- **网络与解析**：HTTPS Multi-Tier GeoIP Resolver (ipwhois + freeipapi + ip.sb)
- **离线与缓存**：Progressive Web App (PWA) + Service Worker
- **容器与部署**：Docker (`network_mode: host`), Docker Compose, Nginx (SSL/TLS 反向代理)

---

## 📁 项目目录结构

```
4kvm-site/
├── public/                       # 静态资源与 PWA 资产
│   ├── manifest.json             # PWA Web App Manifest 规范
│   ├── sw.js                     # PWA Service Worker 缓存脚本
│   └── icons/                    # 各尺寸高清应用图标
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/           # 健康检查接口
│   │   │   ├── vod/              # 影视多维查询与详情 API
│   │   │   └── room/             # 放映厅核心后端 API
│   │   │       ├── route.ts      # 广场大厅与创建房间
│   │   │       └── [id]/
│   │   │           ├── change-vod/  # 房内更换影片接口
│   │   │           ├── chat/        # 公屏聊天与表情接口
│   │   │           ├── events/      # SSE 实时事件流广播
│   │   │           ├── heartbeat/   # 在线心跳保活
│   │   │           ├── join/        # 加入房间与口令校验
│   │   │           ├── kick/        # 房主踢人接口
│   │   │           ├── leave/       # 退出/顺延/解散
│   │   │           ├── settings/    # 房间属性与权限设置
│   │   │           ├── sync/        # 播放状态与进度同步
│   │   │           └── transfer/    # 房主主动移交接口
│   │   ├── category/             # 6 维全量片库筛选页
│   │   ├── hall/                 # 公开放映广场页
│   │   ├── history/              # 本地播放历史记录页
│   │   ├── play/[id]/            # 单人独立播放详情页
│   │   ├── room/[id]/            # 多人同步共赏放映厅
│   │   ├── search/               # 全网模糊搜索页
│   │   └── page.tsx              # 首页焦点推荐与精选
│   ├── components/
│   │   ├── CreateRoomModal.tsx   # 发起放映房弹窗
│   │   ├── FilmPickerModal.tsx   # 6 维多条件选片组件 (广场/房内复用)
│   │   ├── MovieCard.tsx         # 影视卡片 (带一键发起一起看)
│   │   ├── Navbar.tsx            # 顶部导航与移动端底部悬浮栏
│   │   ├── RoomSettingsModal.tsx # 房主设置管理弹窗
│   │   └── Player/
│   │       ├── ArtPlayer.tsx     # 单人播放器
│   │       └── RoomVideoPlayer.tsx # 同步放映厅专用播放器 (权限拦截+防回声)
│   └── lib/
│       ├── data.ts               # 万级影视数据库元数据
│       ├── guest.ts              # 游客身份与设备指纹识别
│       ├── ip-service.ts         # 全球双层级高精度 GeoIP 解析
│       ├── room-store.ts         # 房间内存状态机与 SSE 调度引擎
│       └── vod-service.ts        # 6 维组合过滤查询引擎
├── compose.yaml                  # Docker Compose 生产编排 (Host 网络)
├── Dockerfile                    # 多阶段生产构建 Dockerfile
└── package.json                  # 项目依赖
```

---

## 🚀 快速上手与部署

### 1. 本地开发

```bash
# 1. 安装依赖
npm install --legacy-peer-deps

# 2. 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可开始调试。

### 2. Docker 生产部署

```bash
# 构建并启动容器
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f
```

---

## 📄 免责声明 (Disclaimer)

本项目所有影视资源与播放切片链接均来源于第三方上游采集站公开接口，仅供技术研究、个人学习交流使用，不存储任何实际音视频文件。
