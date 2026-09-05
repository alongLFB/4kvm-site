# 4KVM 片库采集与增量同步引擎使用手册 (ingest-ikun-full.mjs)

scripts/ingest-ikun-full.mjs 是 4KVM 系统的核心片库入库与同步引擎。负责与 **iKun 国际专线 (1080P原画秒播)** 上游资源站对接，执行全量抓取、增量追更、断点续传及定向分类入库。

---

## 🚀 快速常用命令示例

### 1. 增量追更（最常用，日常定时同步）
同步过去 24 小时内更新的所有影视剧集（自动插入新片、更新已有剧集的最新集数）：
```bash
node scripts/ingest-ikun-full.mjs --incremental
# 或者使用别名：
node scripts/ingest-ikun-full.mjs --sync
```
> 📝 **自动生成更新日志**：每次运行增量追更后，系统会自动在 [`scripts/UPDATE_LOG.md`](./UPDATE_LOG.md) 中以 Markdown 表格记录本次同步的**新增入库影片**与**剧集连载追更清单**（最新更新始终显示在最顶部）。若临时不需要写入日志，可追加 `--no-log` 参数。

### 2. 自定义小时范围增量
只同步过去 6 小时内最新更新的影片：
` ash
node scripts/ingest-ikun-full.mjs --hours 6
`

### 3. 断点续传（大盘采集中途中断）
如果全量采集因为网络断开、服务器重启等原因中断，**无需从第 1 页重跑**，直接断点续传：
`ash
node scripts/ingest-ikun-full.mjs --resume
`
> 引擎会自动读取 data/ikun_progress.json 中的 lastPage 并从下一页无缝继续。

### 4. 定向采集某个特定分类
例如：仅采集 **🔥 爽文短剧**（分类 ID: 45）：
`ash
node scripts/ingest-ikun-full.mjs --type 45
`
例如：同时采集 **足球 (41)** 与 **NBA (51)** 赛事：
`ash
node scripts/ingest-ikun-full.mjs --types 41,51
`

### 5. 快速抽样测试（限制最大页数）
仅抓取前 2 页进行测试验证，避免拉取过多数据：
`ash
node scripts/ingest-ikun-full.mjs --max-pages 2
# 也可以与分类结合：
node scripts/ingest-ikun-full.mjs --type 45 --max-pages 2
`

### 6. 全量清空重建数据库（高危慎用）
清空现有全部数据表，重建 FTS5 全文索引，并从第 1 页开始重新全量采集：
```bash
node scripts/ingest-ikun-full.mjs --reset
```

### 7. 单剧更新检查与单片同步 (check-update.mjs)
快速检查某部指定影视（支持按上游 Raw ID 或直接按片名）在本地与上游是否有新集数更新，并可一键单片同步入库：
```bash
# 按 Raw ID 检查（如斗破苍穹年番: 15952）
node scripts/check-update.mjs 15952

# 按 片名 直接检查
node scripts/check-update.mjs 斗破苍穹年番

# 若查到有新集数，一键同步该片入库更新
node scripts/check-update.mjs 15952 --sync
```

---

## 📋 命令行参数速查表

| 参数选项 | 类型 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| --incremental / --sync | Flag | 增量模式，默认抓取过去 24 小时更新的影片 | 
ode scripts/ingest-ikun-full.mjs --sync |
| --hours <N> | Number | 指定增量抓取过去 N 小时内的数据 | 
ode scripts/ingest-ikun-full.mjs --hours 12 |
| --resume | Flag | 启用断点续传，从上次保存的页码继续运行 | 
ode scripts/ingest-ikun-full.mjs --resume |
| --type <ID> / --type-id <ID> | Number | 仅采集指定单个分类 ID 的影视 | 
ode scripts/ingest-ikun-full.mjs --type 45 |
| --types <ID1,ID2,...> | String | 批量采集多个指定分类 ID（逗号分隔） | 
ode scripts/ingest-ikun-full.mjs --types 41,51,52 |
| --max-pages <N> | Number | 限制抓取的最大页数（用于调试验证） | 
ode scripts/ingest-ikun-full.mjs --max-pages 5 |
| `--reset` | Flag | 清空现有数据表与断点缓存，重新初始化数据库 | `node scripts/ingest-ikun-full.mjs --reset` |
| `--no-log` | Flag | 增量同步时不写入 `scripts/UPDATE_LOG.md` 日志文件 | `node scripts/ingest-ikun-full.mjs --incremental --no-log` |

---

## 🗂️ 上游分类 ID (Type ID) 完整映射表

| 一级大类 | 分类 ID (	ype_id) | 子分类名称 (sub_type) | 备注说明 |
| :--- | :--- | :--- | :--- |
| **🎬 电影** | 1 | 电影 | 电影主类 |
| | 6 ~ 22 | 动作(6)、喜剧(7)、爱情(8)、科幻(9)、恐怖(10)、剧情(11)、战争(12)、惊悚(13)、家庭(14)、古装(15)、历史(16)、悬疑(17)、犯罪(18)、灾难(19)、纪录片(20)、短片(21)、动画片(22) | 电影各细分题材 |
| **📺 电视剧** | 2 | 电视剧 | 剧集主类 |
| | 23 | 国产剧 | 华语连续剧 |
| | 24 | 香港剧 | TVB / 港剧 |
| | 25 | 韩国剧 | 韩剧 |
| | 26 | 欧美剧 | 美剧 / 英剧 |
| | 27 | 台湾剧 | 台剧 |
| | 28 | 日本剧 | 日剧 |
| | 29 | 海外剧 | 其它小众地区剧集 |
| | 30 | 泰国剧 | 泰剧 |
| | 45 | 🔥 爽文短剧 | 热门短剧 / 微短剧专区 |
| **🎤 综艺** | 3 | 综艺 | 综艺主类 |
| | 31 ~ 34 | 大陆综艺(31)、港台综艺(32)、日韩综艺(33)、欧美综艺(34) | 各地区热门综艺秀 |
| **✨ 动漫** | 4 | 动漫 | 动漫主类 |
| | 35 ~ 37 | 国产动漫(35)、欧美动漫(36)、日本动漫(37) | 国漫、日番、美漫 |
| **⚽ 体育** | 40 | 体育 | 体育综合专区 (默认需口令解锁) |
| | 41 | 足球 | 综合足球比赛 |
| | 46 ~ 50 | 德甲(46)、意甲(47)、英超(48)、西甲(49)、法甲(50) | 欧洲五大联赛常规赛与淘汰赛 |
| | 51 | NBA | NBA 常规赛 / 季后赛 / 总决赛全场 |
| | 52 | CBA | 中国男子篮球职业联赛 |
| | 53 | LPL | 英雄联盟职业联赛 / 电竞赛事 |
| | 54 | WCBA | 中国女子篮球联赛 |
| | 55 | 篮球 | 综合篮球赛事 |

> ⚠️ **内置安全过滤**：分类 ID 5（伦理片）与 56（里番动漫）在引擎核心层被 EXCLUDE_TYPE_IDS 永久排除，即使传入也不会入库。

---

## ⚙️ 底层架构与执行机制

1. **并发与频控保护 (DELAY_MS = 350)**：
   - 默认每个 API 请求间隔 350ms（约为 2.8 次请求/秒），防止触发上游 CDN 的防爬封禁；
   - 内置请求重试与超时保护（单次超时 15s，失败指数退避重试最多 3 次）。
2. **事务批量提交 (BATCH_SIZE)**：
   - 全量采集时每 10 页批量开一次 SQLite 事务统一提交，兼顾入库速度与数据安全；
   - 增量模式 (--hours) 每页即时提交，确保数据秒级对外生效。
3. **断点状态记录 (data/ikun_progress.json)**：
   - 每次批量提交后自动写入当前页码、已抓取总数及时间戳；
   - 异常退出后再次带 --resume 运行即可接着跑。
4. **WAL 预写日志与 Checkpoint**：
   - 脚本执行完毕后会自动触发 PRAGMA wal_checkpoint(TRUNCATE);，使数据库立即收敛，供 Next.js 生产环境零等待极速读取。
