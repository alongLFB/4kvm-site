# 4KVM 在线影视聚合与多人实时同步放映系统 (4KVM Video & Sync CMS)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?style=flat-square&logo=typescript)
![SQLite3](https://img.shields.io/badge/SQLite-WAL%20%2B%20FTS5-003B57?style=flat-square&logo=sqlite)
![WebRTC](https://img.shields.io/badge/WebRTC-Mesh%20Voice-333333?style=flat-square&logo=webrtc)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Artplayer](https://img.shields.io/badge/Artplayer-5.4.0-06b6d4?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Supported-5a0fc8?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker)
![CI/CD](https://img.shields.io/badge/GitHub%20Actions-Automated-2088FF?style=flat-square&logo=githubactions)

**现代、轻量、极致性能的 4K/1080P 高清影视聚合点播、多人实时同步放映厅与 WebRTC 语音对讲平台**  
集成纯净全球/海外高速流媒体专线、嵌入式 SQLite 高性能检索、免登录多人实时共赏放映厅、毫秒级播放同步、Mesh 架构实时语音连麦与全双工公屏聊天。

[🌐 访问线上站点: 4kvm.alonglfb.com](https://4kvm.alonglfb.com) · [🎪 公开放映广场](https://4kvm.alonglfb.com/hall) · [📺 多维分类片库](https://4kvm.alonglfb.com/category)

</div>

---

## ✨ 核心功能与技术特色

### 1. 🎙️ WebRTC Mesh 多人实时超低延迟语音对讲系统
- **全双工点对点语音网格 (P2P Mesh)**：
  - 基于 WebRTC 标准与原生 `AudioContext`，实现房间全员超低延迟（<100ms）清晰对讲；
  - 自动穿透主流 NAT/防火墙（集成 Google & Cloudflare STUN 服务器）；
- **🟢 正在说话成员动态指示与等离子波形 (Active Speaker Badge)**：
  - 播放器画面顶部常驻半透明毛玻璃说话成员胶囊 (`🟢 [昵称] 正在讲话`)；
  - 语音状态栏配备 4 柱动态跳动音频频谱等离子波形；
  - 双通道广播机制：未开麦观众也能通过 SSE 实时接收谁在说话的视觉反馈；
- **🎚️ 成员独立音量调节 (0% ~ 200% Gain)**：
  - 观众列表支持对每位在线成员单独滑动调节声音大小（支持最高 200% 硬件级音量增益放大）；
- **🎛️ 实时麦克风输入电平表 (Live Input Level Meter)**：
  - 动态显示本地麦克风真实收音强弱，收音状态一目了然；
- **👑 房主特权管理**：
  - 支持房主一键全员静音（Mute All）与麦克风权限管制；
- **🔔 Web Audio 合成自然音效**：
  - 纯代码合成轻柔入房/退房提示音，无需加载外部音频文件，零网络开销。

---

### 2. 👥 多人实时同步放映厅（Watch Together）
- **🎪 放映广场大厅 (`/hall`)**：实时展示全站活跃的公开放映厅与私密口令房；
- **⚡ 毫秒级播放进度同步**：
  - 基于 Server-Sent Events (SSE) 协议，播放/暂停/拖动进度条（带 250ms 智能防抖）全员毫秒级精确对齐；
  - 双向防回声隔离驱动（Echo-Free Player Driver），彻底杜绝跨端事件死循环；
- **👑 房主精细化双层权限控制**：
  - **进度控制权限**：`仅房主可控` vs `全员自由控制`；
  - **选集与换源权限**：`仅房主可换集换源` vs `全员自由换集换源`；
- **🎬 房内无缝「更换放映影片」**：
  - 房主无需解散房间，随时在房内调出 6 维选片组件挑选新剧，全员播放器秒级自动切片起播，聊天记录与观众列表完整保留；
- **🛡️ 房主离线自动顺延与主动移交机制**：
  - 房主退出时支持主动顺延或一键解散；意外断网掉线时心跳守护程序自动移交房主权限；
- **🔒 100% 内存无痕隐私架构（Hot State In-Memory）**：
  - 房间与公屏消息纯内存驻留，房间解散后物理销毁，数据库零永久留痕，极致保护私密性。

---

### 3. 💾 嵌入式 SQLite 3 + FTS5 全文检索引擎
- **Node.js 22 原生嵌入式 SQLite (`node:sqlite`)**：
  - 采用 WAL 高并发读写模式 (`PRAGMA journal_mode = WAL;`)，执行速度 `< 1ms`，零额外进程开销；
- **FTS5 三元分词全文搜索 (Trigram Search)**：
  - 支持对片名、演员、导演、分类标签进行高效模糊与前缀检索；
- **数据与代码彻底解耦**：
  - 数据库位于 `data/4kvm.db`，由 `.gitignore` 自动忽略并挂载于 Docker 数据卷，Next.js 构建打包提速 70%！

---

### 4. 🌍 纯净专享：⚡ iKun 国际专线 (1080P 原画秒播)
- **⚡ iKun 国际高速专线**：部署 Cloudflare 全球 Anycast 边缘 CDN 网络，阿联酋、欧美、亚太及国内无阻秒播；
- **纯净 m3u8 切片**：专一采用 `/from/ikm3u8/` 过滤规范，100% 杜绝跳转广告与第三方网页解析；
- **全维度分类覆盖**：对齐官方全部分类体系（涵盖国产剧、港剧、日韩美剧、国产动漫、日本新番、爆火爽文短剧、动作科幻电影等），自动过滤敏感与低劣内容。

---

### 5. ⚙️ GitHub Actions CI/CD 与自动化片库同步流水线
- **🚀 自动部署工作流 (`.github/workflows/deploy.yml`)**：
  - 推送代码至 `master` 分支自动触发 SSH 部署，自带自愈远程源与 IPv4 直连优化；
- **🔄 上游片库定时同步流水线 (`.github/workflows/sync-vod.yml`)**：
  - 每天北京时间中午 12:00 全自动从 iKun 专线拉取最新更新并批量增量入库；
  - 支持在 GitHub Actions 页面手动点击 **Run workflow** 自由指定更新抓取范围。

---

### 6. 🔍 6 维高级多条件组合筛选中心 (`/category` & `FilmPickerModal`)
- **全维度自由交叉过滤（AND 运算）**：
  1. **类型 (Type)**：`全部` | `电影` | `电视剧` | `动漫` | `综艺`
  2. **地区 (Area)**：`全部` | `大陆` | `香港` | `台湾` | `日本` | `韩国` | `欧美` | `泰国` | `其它`
  3. **年份 (Year)**：`全部` | `今年` | `去年` | `10年代` | `00年代` | `90年代` | `80年代` | `更早`
  4. **语言 (Lang)**：`全部` | `国语` | `粤语` | `英语` | `韩语` | `日语` | `泰语` | `其它`
  5. **画质 (Quality)**：`全部` | `4K超清` | `1080P` | `720P` | `HD` | `蓝光`
  6. **状态 (Status)**：`全部` | `连载中` | `全集`

---

### 7. 📺 Artplayer 5.4.0 深度定制播放体验
- **原生 `autoOrientation` 自动旋转**：移动端进入全屏自动旋转横屏铺满，退出全屏自动恢复；
- **网页全屏剧场模式 (`fullscreenWeb`)**：突破浏览器限制，支持房主远程跨设备同步开启全屏剧场模式；
- **`playsInline` 内联播放**：防止移动端浏览器/微信强制接管播放弹窗；
- **全屏防误触锁屏**：全屏看剧常驻 `lock: true` 物理防误触锁；
- **长按 2x 倍速快进**与 **Apple AirPlay 无线投屏**。

---

### 8. 🔒 专享特约放映专区与双重安全防护体系 (Gated Access Security)
- **业务场景与防爆破设计**：
  - 为满足特定合规、私密或特约放映专区（如体育赛事、特定定制板块）的管理需求，系统提供**端到端双重安全防护**；
  - **前端体验**：未解锁时导航与分类标有 `🔒 专享` 标识，点击平滑呼出暗黑毛玻璃口令输入框；解锁后凭证安全存储于 `localStorage`，全站免密畅播；
  - **后端拦截**：即使恶意绕过前端网页直接请求后端 API（如 `/api/vod?action=detail&id=...`），服务端执行安全检验，缺少口令直接抛出 `HTTP 403 Forbidden` 并拒绝下发流媒体地址；
- **优先级与判定逻辑（并集策略 Union Policy）**：
  - **粗粒度一级主分类覆盖**：若配置了 `NEXT_PUBLIC_GATED_LOCKED_TYPES=体育`，则整个“体育”大类下所有影片一键全锁；
  - **细粒度具体子分类补漏**：若未锁定整个大类，但配置了 `NEXT_PUBLIC_GATED_LOCKED_TYPE_IDS=40,41`，则仅足球、篮球等指定 ID 分类加锁，其余保持公开；
  - **判定规则**：`isItemGated = 大类命中 OR 子类 ID 命中`（命中任一即受控，绝不漏防）；
- **环境变量全动态配置**：口令、受限大类及细分子分类 ID 均支持在 `.env` / `.env.local` 中自由设定，无需修改任何代码，且 `.env` 已由 `.gitignore` 严格忽略，杜绝凭证泄露风险。

---

### 9. 🔍 全链路智能搜索与内存倒排拼音引擎 (Search & Pinyin Pro)
- **毫秒级拼音倒排索引**：
  - 引入高性能 `pinyin-pro`，在服务端内存对 6.3 万部影视建立轻量索引（<0.5ms 响应）；
  - **全拼秒搜**：如输入 `chun` 秒出《早春晴朗》等数百部作品；
  - **首字母拼音**：如输入 `zcql` 瞬间命中《早春晴朗》（Z-C-Q-L）与《只此青绿》；
- **✨ 实时智能联想下拉卡片 (Auto-Complete Preview)**：
  - 输入关键词防抖（150ms）弹出暗黑浮层，展示微缩海报、高亮片名、分类与演职人员，支持一键直达播放；
- **🕒 本地搜索历史管理**：
  - 自动记录最近搜索历史药丸标签，支持单个清除、一键清空与快捷发现。

---

### 10. 📱 全平台 PWA 原生应用与移动端适配
- 支持 iOS (添加到主屏幕)、Android (一键安装 App) 与 PC 桌面端独立窗口无边框运行；
- 顶部常驻独立快捷 `🔍` 搜索入口，点击拉起沉浸式移动端全屏搜索面板；
- 底部常驻悬浮导航栏（Bottom Tab Bar），单手盲操更流畅；
- 配合 Service Worker 实现静态资源毫秒级秒开体验。

---

## 🛠️ 技术栈

- **核心框架**：[Next.js 15](https://nextjs.org/) (App Router, React Server Components, Turbopack)
- **前端库 & 样式**：[React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **播放引擎**：[Artplayer.js 5.4.0](https://artplayer.org/) + [hls.js](https://github.com/video-dev/hls.js/)
- **实时通信**：WebRTC (Mesh 语音连麦) + Server-Sent Events (SSE 毫秒级状态同步)
- **数据库**：Node.js 22 嵌入式 SQLite 3 + WAL 模式 + FTS5 全文搜索
- **网络与解析**：HTTPS Multi-Tier GeoIP Resolver (ipwhois + freeipapi + ip.sb)
- **离线与缓存**：Progressive Web App (PWA) + Service Worker
- **自动化运维**：GitHub Actions CI/CD (SSH-Action) + Upstream VOD Ingestion Cron
- **容器与部署**：Docker (`network_mode: host`), Docker Compose, Nginx (SSL/TLS 反向代理)

---

## 📁 项目目录结构

```
4kvm-site/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # GitHub Actions 自动化 SSH 部署
│       └── sync-vod.yml          # 上游片库定时/手动增量同步流水线
├── data/                         # SQLite 数据库目录 (挂载 Docker 数据卷)
│   ├── 4kvm.db                   # SQLite 3 主数据库
│   └── .gitkeep
├── public/                       # 静态资源与 PWA 资产
│   ├── manifest.json             # PWA Web App Manifest 规范
│   ├── sw.js                     # PWA Service Worker 缓存脚本
│   └── icons/                    # 各尺寸高清应用图标
├── scripts/
│   ├── ingest-ikun-full.mjs      # 核心片库采集与增量同步引擎 (增量/断点/分类)
│   ├── INGEST_GUIDE.md           # 采集引擎完整使用手册与分类 ID 对照表
│   ├── rebuild-clean-db.mjs      # 全量纯净片库一键重建脚本
│   ├── seed-db.mjs               # 数据库校验与测试脚本
│   └── sync-upstream.mjs         # 海外高速专线增量自动同步采集脚本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/           # 健康检查接口
│   │   │   ├── vod/              # 影视多维查询、搜索与详情 API
│   │   │   └── room/             # 放映厅核心后端 API
│   │   │       ├── route.ts      # 广场大厅与创建房间
│   │   │       └── [id]/
│   │   │           ├── change-vod/   # 房内更换影片接口
│   │   │           ├── chat/         # 公屏聊天与表情接口
│   │   │           ├── events/       # SSE 实时事件流广播
│   │   │           ├── heartbeat/    # 在线心跳保活
│   │   │           ├── join/         # 加入房间与口令校验
│   │   │           ├── kick/         # 房主踢人接口
│   │   │           ├── leave/        # 退出/顺延/解散
│   │   │           ├── settings/     # 房间属性与权限设置
│   │   │           ├── sync/         # 播放状态与进度同步
│   │   │           ├── transfer/     # 房主主动移交接口
│   │   │           └── webrtc/       # WebRTC 语音信令与状态广播
│   │   │               ├── mute-all/ # 全员静音控制
│   │   │               ├── signal/   # SDP Offer/Answer 与 ICE 信令中继
│   │   │               ├── speaking/ # 正在讲话状态全员广播
│   │   │               └── state/    # 麦克风静音状态同步
│   │   ├── category/             # 6 维全量片库筛选页
│   │   ├── hall/                 # 公开放映广场页
│   │   ├── history/              # 本地播放历史记录页
│   │   ├── play/[id]/            # 单人独立播放详情页
│   │   ├── room/[id]/            # 多人同步共赏放映厅 (含语音连麦与公屏)
│   │   ├── search/               # 全网模糊搜索页
│   │   └── page.tsx              # 首页焦点推荐与精选
│   ├── components/
│   │   ├── CreateRoomModal.tsx   # 发起放映房弹窗
│   │   ├── FilmPickerModal.tsx   # 6 维多条件选片组件 (广场/房内复用)
│   │   ├── MovieCard.tsx         # 影视卡片 (带一键发起一起看)
│   │   ├── Navbar.tsx            # 顶部导航与移动端底部悬浮栏
│   │   ├── RoomSettingsModal.tsx # 房主设置管理弹窗
│   │   ├── Player/
│   │   │   ├── ArtPlayer.tsx     # 单人播放器
│   │   │   └── RoomVideoPlayer.tsx # 同步放映厅专用播放器 (权限拦截+防回声+说话徽章)
│   │   └── Voice/
│   │       └── VoiceControlBar.tsx # WebRTC 语音连麦控制栏 (等离子波形+输入电平表)
│   └── lib/
│       ├── db.ts                 # SQLite 数据库单例与 WAL 驱动
│       ├── guest.ts              # 游客身份与设备指纹识别
│       ├── ip-service.ts         # 全球双层级高精度 GeoIP 解析
│       ├── room-store.ts         # 房间内存状态机与 SSE 调度引擎
│       ├── vod-service.ts        # 6 维参数化 SQL 与 FTS5 搜索引擎
│       └── webrtc-voice.ts       # WebRTC Mesh 语音引擎与 Web Audio 增益控制器
├── compose.yaml                  # Docker Compose 生产编排 (Host 网络 + 数据卷)
├── Dockerfile                    # 多阶段生产构建 Dockerfile
└── package.json                  # 项目依赖与 npm scripts
```

---

## 🚀 快速上手与部署

### 1. 环境变量配置 (.env)

项目支持通过 `.env` 或 `.env.local` 自由定制口令与加锁板块。安全起见，所有包含敏感口令的 `.env*` 文件已被 `.gitignore` 自动忽略，仓库中提供了完整的模板文件 [`.env.example`](file:///.env.example)。

```bash
# 复制范例配置文件
cp .env.example .env.local   # 本地调试
# 或
cp .env.example .env         # 生产部署
```

#### 🔒 特约专区防护配置项说明与优先级机制

| 环境变量名 | 默认值 | 配置说明 | 作用维度 |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_GATED_PIN` | `666888` | 专享区全局解锁口令 | 鉴权通行证 |
| `NEXT_PUBLIC_GATED_LOCKED_TYPES` | `体育` | 需要整体加锁的一级大类名（英文逗号分隔，如 `体育,综艺`） | 粗粒度一键全锁 |
| `NEXT_PUBLIC_GATED_LOCKED_TYPE_IDS` | `40,41,46..55` | 需要精准加锁的细分子分类 ID 列表（英文逗号分隔） | 细粒度精准补漏 |

#### ⚖️ 一级主分类 vs 细粒度 type_id 优先级与判定逻辑

系统采用安全领域的**【并集策略 (Union Policy / 命中任一即加锁)】**，判定链路如下：

```text
[请求影视 / 分类]
       │
       ▼
 检查一级分类名称是否在 LOCKED_TYPES 中？
  ├── 是 ──► [🔒 判定为受保护专区] (粗粒度快速覆盖，旗下所有子赛事一网打尽)
  │
  └── 否 ──► 检查具体分类 ID 是否在 LOCKED_TYPE_IDS 中？
               ├── 是 ──► [🔒 判定为受保护专区] (细粒度精准补漏)
               └── 否 ──► [🔓 判定为公开影视] (直接放行秒播)
```

- **场景 A（整类加锁）**：配置 `LOCKED_TYPES=体育`，旗下无论是 NBA (41)、足球 (40) 还是网球 (46) 全部自动加锁，无需逐个配 ID。
- **场景 B（部分加锁）**：配置 `LOCKED_TYPES=""`，仅配置 `LOCKED_TYPE_IDS=40,41`，则普通体育项目公开，仅足球和篮球需要输入口令。

---

### 2. 本地开发

```bash
# 1. 安装依赖
npm install --legacy-peer-deps

# 2. 初始化/同步片库数据
npm run db:sync

# 3. 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可开始调试。

### 3. Docker 生产部署

```bash
# 构建并启动容器 (数据持久化在 ./data)
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f
```

---

## 📄 免责声明 (Disclaimer)

本项目所有影视资源与播放切片链接均来源于第三方上游采集站公开接口，仅供技术研究、个人学习交流使用，不存储任何实际音视频文件。

---
