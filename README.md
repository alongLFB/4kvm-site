# 4KVM 在线影视聚合与多人实时同步放映系统 (4KVM Video & Sync CMS)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.3-38bdf8?style=flat-square&logo=tailwindcss)
![SQLite3](https://img.shields.io/badge/SQLite-WAL%20%2B%20FTS5-003B57?style=flat-square&logo=sqlite)
![WebRTC](https://img.shields.io/badge/WebRTC-Mesh%20Voice-333333?style=flat-square&logo=webrtc)
![mux.js](https://img.shields.io/badge/mux.js-6.3.0-orange?style=flat-square)
![pinyin-pro](https://img.shields.io/badge/pinyin--pro-3.29.3-teal?style=flat-square)
![Artplayer](https://img.shields.io/badge/Artplayer-5.4.0-06b6d4?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Supported-5a0fc8?style=flat-square)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Resumable%20Download-5a0fc8?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker)
![CI/CD](https://img.shields.io/badge/GitHub%20Actions-Automated-2088FF?style=flat-square&logo=githubactions)

**现代、轻量、极致性能的 4K/1080P 高清影视聚合点播、多人实时同步放映厅、全站去重在线统计与 WebRTC 语音对讲平台**  
集成纯净全球/海外高速流媒体专线、嵌入式 SQLite 高性能检索、免登录多人实时共赏放映厅、毫秒级播放同步、Mesh 架构实时语音连麦、全双工公屏聊天、IndexedDB 多线程断点续传离线下载与实时在线人数防刷去重引擎。

[🌐 访问线上站点: 4kvm.alonglfb.com](https://4kvm.alonglfb.com) · [🎪 公开放映广场](https://4kvm.alonglfb.com/hall) · [📺 多维分类片库](https://4kvm.alonglfb.com/category) · [🕒 观看历史记录](https://4kvm.alonglfb.com/history)

</div>

---

## ✨ 核心功能与技术特色

### 1. 🎙️ WebRTC Mesh 多人实时超低延迟语音对讲系统
- **全双工点对点语音网格 (P2P Mesh)**：
  - 基于 WebRTC 标准与原生 `AudioContext`，实现房间全员超低延迟（<100ms）清晰对讲；
  - 自动穿透主流 NAT/防火墙（集成 Google & Cloudflare STUN 服务器）；
- **🟢 正在说话成员动态指示与等离子波形 (Active Speaker Badge)**：
  - 播放器画面顶部常驻半透明毛玻璃说话成员胶囊（`🟢 [昵称] 正在讲话`）；
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
- **🎪 放映广场大厅 (`/hall`)**：实时展示全站活跃的公开放映厅与私密口令房，支持一键加入；
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

### 3. 📥 PWA 离线下载中心与多档位断点续传系统 (Offline Download & Resumable Remuxer)
- **⚡ 智能分片与断点续传引擎**：
  - 基于客户端 IndexedDB 原生构建本地持久化任务仓库（`tasks`、`segments` 与 `completed_videos`）；
  - 采用多线程并发工作池（Worker Pool），支持单集与批量 **4 / 8 / 16 / 32 超高速多线程** 并发切片拉取；
  - **断点续传与自愈恢复**：中途断网、手动暂停、页面刷新或浏览器重启后，自动校验已有分片完整度并跳过已下载切片，无缝继续拉取剩余部分；
  - 智能网络超时控制（15s 超时 + 3 次阶梯式自动重试），保障在弱网与移动网络环境下稳定下载；
- **📦 批量整季下载与并发排队调度**：
  - 支持 **一键全选、反选、多选指定集数**，一键批量加入后台下载流水线；
  - **多任务并发调度中心**：支持 **1 / 2 / 3 / 4 任务并发**，超出限制自动加入等待队列，前序任务完成或暂停时立即自动唤醒下一部；
  - **按剧集折叠聚合卡片 (Vod Grouping)**：下载抽屉自动将同部剧集归并聚合为折叠大卡片，清晰展示“整季总大小”、“已完成/总集数”与总进度条，分类标签（`全部` / `电影` / `剧集`）轻松切换；
- **🛠️ 客户端流式封装与时长修复 (Mux.js TS ➔ MP4 Remuxing & Header Patching)**：
  - 纯浏览器前端原生流式转封装（无需后端转码服务器参与），毫秒级将 HLS TS 切片流直接合成为标准 MP4 格式；
  - **精准时长修复 (MP4 Box Header Patching)**：突破浏览器转封装播放器时长显示为 `00:00` 或异常长达 `13:15:21` 的业界通病，精确计算影片物理总时长，并向 MP4 容器底层直接覆写 `mvhd`、`mdhd`、`tkhd` 与 `mehd` 元数据 Box，完美支持平滑快进/快退与拖拽跳跃；
- **📶 零流量纯离线播放器 (Offline In-App Player)**：
  - 视频下载完成后直接从 IndexedDB 本地 Blob 实例生成点播流，无需联网、飞行模式或海外无外网环境下亦可**零流量极速播放**；
  - 离线播放器内置独立进度控制、音量调节、横屏全屏旋转与防误触锁；
- **💾 存储限额管控与永久存储授权 (Storage Quota & Protection)**：
  - 自动向浏览器申请 `navigator.storage.persist()` 永久存储凭据，防止浏览器因磁盘紧张被动清除影视切片；
  - 提供**自定义存储容量上限设置**（`5 GB` / `10 GB` / `20 GB` / `自定义 GB` / `无限制`），动态实时监测磁盘占用，达到上限前自动暂停任务并智能告警，守护用户设备磁盘空间；
- **🔋 Screen Wake Lock 屏幕常亮保活**：
  - 下载进行时自动申请 `navigator.wakeLock`，避免移动端设备黑屏或系统休眠导致后台网络挂起；任务全部完毕或暂停时自动释放锁；
- **🎬 智能播放互斥与层级穿透防护**：
  - 打开下载弹窗、侧边管理抽屉或离线播放器时，全自动智能暂停车载/网页正在播放的在线视频，弹窗关闭后平滑恢复原先播放状态；
  - 离开播放详情页切换至全站其他页面时，严格销毁底层 HTML5 Video 元素与 HLS 实例，杜绝后台幽灵音频与内存泄漏；弹窗采用顶层覆盖层级与 `overscroll-contain` 穿透锁，彻底杜绝底层页面联动滑动穿透。

---

### 4. 👥 全站实时在线观影人数统计与防刷去重引擎 (Real-time Online Watchers & Anti-Cheating)
- **全局单例活跃状态维护**：
  - 服务端单例维持全站所有活跃观影者记录，涵盖单人独立播放页（`play`）与多人同步放映厅（`room`）；
- **🛡️ 严格防刷与多层级频控去重**：
  - **设备级去重**：基于统一访客设备标识（`guestId`）实施 5 秒间隔心跳节流，避免浏览器高频死循环冲击；
  - **单 IP 聚合上限防护**：单 IP 最多同时计入 5 个独立活跃设备，彻底杜绝单机自动化脚本批量伪造 UUID 恶意刷量；
  - **IP 每分钟请求限流**：单 IP 每分钟请求硬性限频 120 次，超出则安全拒绝；
- **⚡ 即时心跳守护与离线信标**：
  - 前端以 15 秒间隔自动化静默上报健康心跳；
  - 监听浏览器 `pagehide` 与 `beforeunload` 事件，优先调用原生 `navigator.sendBeacon` 向 `/api/stats/leave` 发送低开销离线信标，页面关闭毫秒级回收在线名额；
  - 后台每 30 秒定时自愈清理超过 45 秒未响应的心跳与过期频控记录；
- **🟢 动感胶囊徽章与全景呈现**：
  - 顶部导航栏与房间顶部常驻呼吸动态徽章（`OnlineBadge`），每 25 秒全自动平滑更新；
  - 播放详情页展示实时 `🔥 [N] 人正在看 · 全站 [M] 人在线` 动态数据。

---

### 5. ⚡ CORS 高性能流媒体跨域流式代理接口 (`/api/proxy`)
- **跨域切片无阻拉取**：
  - 解决客户端在离线下载或部分受限网络环境中因第三方资源站 CORS 策略被动拦截的问题；
- **全双工流式零缓冲转发**：
  - 严格校验 HTTP/HTTPS 安全协议，服务端原生直通 upstream body 流式管道，零内存积压与超低延迟；
- **标准 CORS 响应头注入**：
  - 自动补全 `Access-Control-Allow-Origin: *`、`Content-Type` 与 `Content-Length`，保障前端多线程 Worker Pool 稳定并发读取。

---

### 6. 💾 嵌入式 SQLite 3 + FTS5 全文检索引擎
- **Node.js 22 原生嵌入式 SQLite (`node:sqlite`)**：
  - 采用 WAL 高并发读写模式 (`PRAGMA journal_mode = WAL;`)，单次查询执行速度 `< 1ms`，零额外守护进程开销；
- **FTS5 三元分词全文搜索 (Trigram Search)**：
  - 支持对片名、演员、导演、分类标签进行高效模糊与前缀检索；
- **数据与代码彻底解耦**：
  - 数据库位于 `data/4kvm.db`，由 `.gitignore` 自动忽略并挂载于 Docker 数据卷，Next.js 构建打包提速 70%！

---

### 7. 🔍 全链路智能搜索与内存倒排拼音引擎 (Search & Pinyin Pro)
- **毫秒级拼音倒排索引**：
  - 引入高性能 `pinyin-pro`，在服务端内存对 6.3 万+ 部海量影视建立轻量索引（<0.5ms 极速响应）；
  - **全拼秒搜**：如输入 `chun` 秒出《早春晴朗》等数百部作品；
  - **首字母拼音**：如输入 `zcql` 瞬间命中《早春晴朗》（Z-C-Q-L）与《只此青绿》；
- **✨ 实时智能联想下拉卡片 (Auto-Complete Preview)**：
  - 输入关键词防抖（150ms）弹出暗黑浮层，展示微缩海报、高亮片名、分类与演职人员，支持一键直达播放；
- **🕒 本地搜索历史管理**：
  - 自动记录最近搜索历史药丸标签，支持单个清除、一键清空与快捷发现。

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

### 9. 🔍 6 维高级多条件组合筛选中心 (`/category` & `FilmPickerModal`)
- **全维度自由交叉过滤（AND 运算）**：
  1. **类型 (Type)**：`全部` | `电影` | `电视剧` | `动漫` | `综艺` | `体育`
  2. **地区 (Area)**：`全部` | `大陆` | `香港` | `台湾` | `日本` | `韩国` | `欧美` | `泰国` | `其它`
  3. **年份 (Year)**：`全部` | `今年` | `去年` | `10年代` | `00年代` | `90年代` | `80年代` | `更早`
  4. **语言 (Lang)**：`全部` | `国语` | `粤语` | `英语` | `韩语` | `日语` | `泰语` | `其它`
  5. **画质 (Quality)**：`全部` | `4K超清` | `1080P` | `720P` | `HD` | `蓝光`
  6. **状态 (Status)**：`全部` | `连载中` | `全集`

---

### 10. 📺 Artplayer 5.4.0 深度定制播放体验与智能防误触
- **原生 `autoOrientation` 自动旋转**：移动端进入全屏自动旋转横屏铺满，退出全屏自动恢复；
- **网页全屏剧场模式 (`fullscreenWeb`)**：突破浏览器限制，支持房主远程跨设备同步开启全屏剧场模式；
- **`playsInline` 内联播放**：防止移动端浏览器/微信强制接管播放弹窗；
- **全屏防误触锁屏**：全屏看剧常驻 `lock: true` 物理防误触锁；
- **双击暂停/播放**、**长按 2x 倍速快进**与 **Apple AirPlay 无线投屏**。

---

### 11. 📱 全平台 PWA 原生应用与沉浸式移动端适配
- 支持 iOS（添加到主屏幕）、Android（一键安装 Web App）与 PC 桌面端独立窗口无边框运行；
- 顶部导航适配 iOS PWA 安全区（`pt-[env(safe-area-inset-top,0px)]`）；
- 顶部与移动端常驻快捷 `🔍` 搜索入口与 `📥` 离线下载管理入口，实时查看离线任务动态；
- 底部常驻悬浮导航栏（Bottom Dock），单手盲操丝滑自如；
- 配合 Service Worker 实现离线缓存与秒开体验。

---

### 12. ☕ 便捷站长支持与快捷悬浮交互 (`FloatingActions`)
- **动态悬浮操作栏**：页面向下滚动自动呈现右下角浮动面板；
- **平滑一键回顶**：原生平滑动画回到页面顶部；
- **爱心赞助弹窗**：内置微信支付与支付宝赞助二维码无缝切换、暗黑毛玻璃高质感模态窗，支持 ESC 键秒级退出。

---

### 13. 🌍 纯净专享：⚡ iKun 国际专线与自动化片库运维流水线
- **⚡ iKun 国际高速专线**：部署 Cloudflare 全球 Anycast 边缘 CDN 网络，阿联酋、欧美、亚太及国内无阻秒播；
- **纯净 m3u8 切片**：专一采用 `/from/ikm3u8/` 过滤规范，100% 杜绝跳转广告与第三方网页解析；
- **全维度分类覆盖**：对齐官方全部分类体系（涵盖国产剧、港剧、日韩美剧、国产动漫、日本新番、爆火爽文短剧、动作科幻电影等），自动过滤敏感与低劣内容；
- **🚀 自动部署工作流 (`.github/workflows/deploy.yml`)**：推送代码至 `master` 分支自动触发 SSH 部署，自带自愈远程源与 IPv4 直连优化；
- **🔄 上游片库定时同步流水线 (`.github/workflows/sync-vod.yml`)**：每天北京时间中午 12:00 全自动从 iKun 专线拉取最新更新并批量增量入库；支持在 GitHub Actions 页面手动点击 **Run workflow** 自由指定更新抓取范围。

---

## 🛠️ 技术栈

| 领域 | 核心技术选型 | 说明与版本 |
| :--- | :--- | :--- |
| **全栈框架** | [Next.js 16](https://nextjs.org/) | Next.js 16.3.4 (App Router, React Server Components, Turbopack) |
| **视图与样式** | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) | Tailwind CSS 4.3.3 (`@tailwindcss/postcss`), Lucide React 1.38 |
| **播放引擎** | [Artplayer.js 5.4.0](https://artplayer.org/) + [hls.js 1.5](https://github.com/video-dev/hls.js/) | 移动端自动横屏、剧场模式、防误触锁屏、双击暂停、2x 快进 |
| **离线与转封装** | [mux.js 6.3.0](https://github.com/videojs/mux.js/) + 原生 IndexedDB | 纯前端 TS ➔ MP4 流式转封装与 MP4 Box Header 时长精准修复补丁 |
| **实时通信** | WebRTC Mesh + Server-Sent Events (SSE) | 全双工多人低延迟语音对讲、说话指示波形、毫秒级播放对齐 |
| **在线统计与去重** | OnlineWatcherStore + Beacon API | 全局活跃人数去重、IP 频控防刷、5s 节流、`sendBeacon` 即时回收 |
| **数据持久化** | Node.js 原生嵌入式 SQLite 3 | WAL 高并发读写模式 (`node:sqlite`) + FTS5 三元分词全文搜索 |
| **拼音搜索** | [pinyin-pro 3.29.3](https://github.com/zh-lx/pinyin-pro) | 服务端海量片名拼音首字母与全拼倒排索引 (<0.5ms 极速匹配) |
| **CORS 流代理** | Streaming Proxy (`/api/proxy`) | 纯流式转发跨域切片，保障多线程离线下载无阻读取 |
| **网络与解析** | HTTPS Multi-Tier GeoIP Resolver | ipwhois + freeipapi + ip.sb 多层级全球 IP 高精度定位 |
| **PWA 与系统能力** | PWA + Service Worker + Screen Wake Lock | 屏幕常亮保活、`navigator.storage.persist()` 永久存储凭据 |
| **自动化运维** | GitHub Actions CI/CD | 自动化 SSH 部署流水线 + 每日定早上游增量片库同步 Cron |
| **容器编排** | Docker + Docker Compose + Nginx | 端口映射 `127.0.0.1:3028:3028`，宿主机 Nginx 反向代理与 SSL 终止 |

---

## 📁 项目完整目录结构

```
4kvm-site/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # GitHub Actions 自动化 SSH 部署工作流
│       └── sync-vod.yml          # 上游片库定时/手动增量同步流水线
├── data/                         # SQLite 数据库目录 (挂载 Docker 数据卷)
│   ├── 4kvm.db                   # SQLite 3 主数据库 (WAL + FTS5)
│   └── .gitkeep
├── public/                       # 静态资源与 PWA 资产
│   ├── manifest.json             # PWA Web App Manifest 配置规范
│   ├── sw.js                     # PWA Service Worker 离线缓存脚本
│   └── icons/                    # 各分辨率高清 Web App 图标
├── scripts/
│   ├── check-update.mjs          # 片库更新差异检测工具
│   ├── ingest-ikun-full.mjs      # 核心片库采集与增量同步引擎 (增量/断点/分类)
│   ├── INGEST_GUIDE.md           # 采集引擎完整使用手册与分类 ID 对照表
│   ├── rebuild-clean-db.mjs      # 全量纯净片库一键重建脚本
│   ├── seed-db.mjs               # 数据库校验与测试脚本
│   ├── test-ip-locations.mjs     # 全球 IP 解析测试脚本
│   └── UPDATE_LOG.md             # 每日片库自动同步流水线日志
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/           # 服务健康探测接口
│   │   │   ├── proxy/            # 流媒体 CORS 跨域流式代理接口 (/api/proxy?url=...)
│   │   │   ├── stats/            # 在线人数统计与心跳管控 API
│   │   │   │   ├── heartbeat/    # 客户端 15s 心跳上报与防刷检验
│   │   │   │   ├── leave/        # 页面关闭/退出离线信标回收 (Beacon API)
│   │   │   │   └── online/       # 全站/单片当前实时去重在线人数查询
│   │   │   ├── vod/              # 影视多维参数化查询、拼音联想与详情 API
│   │   │   └── room/             # 多人同步放映厅核心后端 API
│   │   │       ├── route.ts      # 放映广场活跃房间查询与发起创建
│   │   │       └── [id]/
│   │   │           ├── change-vod/   # 房内更换影片接口 (秒级无缝换片)
│   │   │           ├── chat/         # 公屏聊天与表情收发接口
│   │   │           ├── events/       # SSE 毫秒级播放状态与事件流广播
│   │   │           ├── heartbeat/    # 房内观众在线心跳保活
│   │   │           ├── join/         # 加入放映房与口令校验
│   │   │           ├── kick/         # 房主踢人管理接口
│   │   │           ├── leave/        # 观众退出/房主顺延/一键解散
│   │   │           ├── settings/     # 房间属性与播放控制权限设置
│   │   │           ├── sync/         # 播放状态与进度毫秒级对齐
│   │   │           ├── transfer/     # 房主主动移交接口
│   │   │           └── webrtc/       # WebRTC 语音信令与状态广播
│   │   │               ├── mute-all/ # 全员静音管理
│   │   │               ├── signal/   # SDP Offer/Answer 与 ICE 候选信令中继
│   │   │               ├── speaking/ # 正在讲话状态视觉全员广播
│   │   │               └── state/    # 麦克风硬件静音状态同步
│   │   ├── category/             # 6 维全量片库高级组合筛选页
│   │   ├── hall/                 # 公开放映广场大厅页
│   │   ├── history/              # 本地播放历史记录与断点进度页
│   │   ├── play/[id]/            # 单人独立播放详情页 (含在线人数、批量下载、播放互斥)
│   │   ├── room/[id]/            # 多人同步共赏放映厅 (含语音连麦、公屏聊天与权限管理)
│   │   ├── search/               # 全网影视综合模糊搜索页
│   │   ├── globals.css           # 全局样式与暗黑渐变微光规范
│   │   ├── layout.tsx            # 全局布局 (集成 Navbar、PWA、FloatingActions 与 DownloadProvider)
│   │   └── page.tsx              # 首页精选、焦点热播与轮播推荐
│   ├── components/
│   │   ├── CreateRoomModal.tsx       # 发起放映房弹窗
│   │   ├── DownloadManagerDrawer.tsx # PWA 离线下载管理抽屉 (分类/折叠卡片/配额设置/断点续传)
│   │   ├── DownloadModal.tsx         # 单集/整季批量多选下载与线程调度弹窗
│   │   ├── FilmPickerModal.tsx       # 6 维多条件选片组件 (广场创建/房内换片无缝复用)
│   │   ├── FloatingActions.tsx       # 右下角悬浮操作栏 (平滑回顶与赞助打赏模态窗)
│   │   ├── Footer.tsx                # 页脚版权与技术栈标识
│   │   ├── HeroBanner.tsx            # 首页高沉浸影视焦点轮播 Banner
│   │   ├── MovieCard.tsx             # 影视海报卡片 (带快捷进入、一键发起一起看)
│   │   ├── Navbar.tsx                # 顶部主导航与移动端沉浸式底部 Dock (带下载指示器)
│   │   ├── OfflinePlayerModal.tsx    # 零流量本地纯离线播放器模态窗
│   │   ├── OnlineBadge.tsx           # 全站/单片实时去重在线人数呼吸动态胶囊徽章
│   │   ├── PasscodeModal.tsx         # 专享特约区暗黑毛玻璃口令解锁弹窗
│   │   ├── PwaRegister.tsx           # PWA Service Worker 注册保活组件
│   │   ├── RoomSettingsModal.tsx     # 房主特权管理弹窗 (权限切换、密码设定)
│   │   ├── Player/
│   │   │   ├── ArtPlayer.tsx         # 单人播放器 (横屏旋转、剧场模式、解挂防幽灵声音)
│   │   │   └── RoomVideoPlayer.tsx   # 同步放映厅专用播放器 (权限拦截+防回声+说话者徽章)
│   │   ├── Search/
│   │   │   └── GlobalSearch.tsx      # 全站桌面/移动端拼音倒排与实时智能联想下拉卡片
│   │   └── Voice/
│   │       └── VoiceControlBar.tsx   # WebRTC 语音连麦控制栏 (等离子跳动波形+输入电平表)
│   ├── config/
│   │   └── gated-sections.ts         # 特约专区受控配置与双重鉴权规则引擎
│   ├── contexts/
│   │   └── DownloadContext.tsx       # 全局离线下载调度引擎与 IndexedDB 响应式状态中心
│   ├── hooks/
│   │   └── useOnlineWatcher.ts       # 在线观影人数自动心跳上报与 Beacon 离线回收 Hook
│   └── lib/
│       ├── db.ts                     # Node 22 原生 SQLite 数据库单例与 WAL 驱动
│       ├── download-manager.ts       # 多线程分片并发拉取、断点续传、转封装与 WakeLock 保活引擎
│       ├── download-store.ts         # IndexedDB 离线任务、分片缓存与持久化视频仓库
│       ├── guest.ts                  # 游客设备指纹与昵称头像生成器
│       ├── ip-service.ts             # 全球双层级高精度 GeoIP 解析服务
│       ├── m3u8-downloader.ts        # M3U8 解析器与 MP4 Header 时长精准修复补丁算法
│       ├── online-store.ts           # 在线人数统计、防单机刷量与 IP 频控单例引擎
│       ├── room-store.ts             # 房间纯内存状态机与 SSE 毫秒级调度引擎
│       ├── search-engine.ts          # 内存倒排与拼音高效搜索索引引擎
│       ├── types.ts                  # 全局业务核心 TypeScript 类型定义
│       ├── vod-service.ts            # 6 维参数化 SQL 与 FTS5 全文检索引擎
│       └── webrtc-voice.ts           # WebRTC Mesh 语音引擎与 Web Audio 增益控制器
├── compose.yaml                      # Docker Compose 生产编排 (端口映射 3028 + 数据持久化)
├── Dockerfile                        # 多阶段极简构建 Dockerfile (Node.js 22-alpine)
└── package.json                      # 项目依赖声明与 npm scripts
```

---

## 🚀 快速上手与生产部署

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

### 2. 本地开发与调试

```bash
# 1. 安装项目依赖
npm install --legacy-peer-deps

# 2. 初始化/同步片库数据 (从上游拉取入库至 data/4kvm.db)
npm run db:sync

# 3. 启动开发服务器 (支持 Turbopack 极速热重载)
npm run dev
```

在现代浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可开始体验与调试。

---

### 3. Docker 生产部署

项目已深度配置多阶段构建 `Dockerfile` 与 `compose.yaml`，内置健康检查、IPv4 直连优化与数据卷持久化：

```bash
# 1. 确保生产环境变量已就绪
cp .env.example .env

# 2. 构建并以后台守护模式启动容器
docker compose up -d --build

# 3. 检查服务健康与运行状态
docker compose ps

# 4. 实时跟踪输出日志
docker compose logs -f --tail=100
```

> **生产网关配置提示**：容器内部以 `127.0.0.1:3028:3028` 暴露于宿主机，只需在宿主机 Nginx / Caddy 中配置反向代理至 `http://127.0.0.1:3028` 并开启 WebSocket / SSE（`X-Accel-Buffering: no`）支持即可。

---

## 📄 免责声明 (Disclaimer)

本项目所有影视资源与播放切片链接均来源于第三方上游采集站公开接口，仅供计算机技术研究、个人学习交流与性能测试使用，不存储任何实际音视频文件。若有侵权疑虑，请及时与上游源数据提供方联系处理。

---
