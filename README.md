# 考研背诵小程序（艺术概论 / 电影概论）

题库数据保留在小程序本地；邀请码通过 CloudBase 云函数远程核销。首页两行独立入口，两个板块数据完全隔离。

## 云端授权

小程序门禁调用当前 CloudBase HTTP 接口：

`https://kaoyan-memorization-d0bl72591bdc-1506337511.ap-shanghai.app.tcloudbase.com`

管理员在 `/admin` 生成一次性验证码，用户在小程序中输入后由云函数核销，并将授权令牌保存在本机。题库正文仍随小程序包发布，不上传到云端。开发者工具本地调试时可在“详情 → 本地设置”开启“不校验合法域名、TLS 版本及 HTTPS 证书”；正式发布前应在小程序后台配置合法业务域名。

## 导入运行

1. 微信开发者工具 → 导入项目 → 选择本目录（`miniprogram/`）
2. AppID 选「测试号」即可（无需服务器与云环境）
3. 编译后首页出现两行入口：艺术概论 / 电影概论

## 目录结构

```
miniprogram/
├─ app.json / app.js / app.wxss / project.config.json / sitemap.json
├─ pages/{home,search,mine}/            主包（首页两行入口、跨书搜索、我的）
├─ components/{item-card,five-block,freq-tag,keyword-mark}/
├─ utils/{store,search,storage,drill}.js  纯函数核心层（可测试、可复用）
├─ data/{search-index.json,doc-index.json,mock-papers.json}
├─ packageArt/{pages/{list,framework,detail,drill,paper},data/{art-<章>.json,art-frameworks.json},assets/framework/*.webp}
└─ packageFilm/{pages/{list,detail,drill},data/{film-<章>.json,film-outline.json}}
```

## 数据重建（内容更新后必做）

```bash
cd /mnt/d/study/workspace/mianshi/output/kaoyan_mock
python3 scripts/build_mp_data.py       # 生成分片与索引，并断言包体积 < 1.5MB
node tests/mp/run.js                   # 核心层测试必须全绿
```

> `build_mp_data.py` 会同时扫描配置的 DOCX/PDF，生成 `doc-index.json`。搜索顺序是：题库 → 电脑文档补充 → 网上搜索。
> 它也会从艺术概论校订版 DOCX 提取六章知识框架图，放入艺术分包；章节列表顶部与每章题目列表顶部均可进入。
> 网上搜索使用 `pages/web-search/` 的 web-view；正式发布前需在小程序后台配置网页业务域名。
> 本仓库的构建脚本只读 `data/kaoyan_data_pack.json` 和配置的本地文档；改动题库请改该文件后重建。

## 测试

- 核心层（数据契约 / 考频映射 / 搜索 / 记录 / 刷题引擎 / 页面结构）：
  `node tests/mp/run.js`
- **无 Node 环境**（本机 WSL 无 node，且 Windows interop 被禁）可用等价运行器：
  `uv run --with quickjs python3 tests/mp/run_quickjs.py`
  —— 它用 Python + QuickJS 提供 `require/fs/path/console/process/global` 垫片来执行**同一批测试文件**；
  测试文件本身保持标准 Node 写法。
- 页面层：按 `docs/验收清单-小程序.md` 在微信开发者工具中逐项验收。

## 包体积（实测 2026-02-14）

- 主包：**1.18 MB**（含电脑文档补充索引；本工程门限 1.5MB）
- packageArt：**1.44 MB**（含六章 12 张知识框架图）
- packageFilm：**0.62 MB**

## 内容规模

- 题库条目 **367** 条（艺术概论 272 / 电影概论 95）；其中九字段齐全的「完整条目」116 条，其余 251 条为题库精简条目
- 精简条目按设计只渲染可用段落：无案例时显示「本题为题库精简条目」提示，不伪造案例
- 电影概论理论篇（批评框架）条目已回挂正确章节（第38–46章）
- 模拟卷 **10** 套 × 14 题（名词 6×5 + 简答 6×10 + 论述 2×30 = 150 分）；简答与论述均按相关小节综合命题

## 发布注意

- 纯本地数据版：**内容更新需重新提交版本审核**（无云端热更新）
- 模拟卷页两态：试卷态不显示任何来源标注；答案解析态才显示【来源】书·章与考频

## 二期规划

电影运动双轴时间轴（横轴年份 / 纵轴世纪）、考频筛选联动统计、默写/听写、模拟卷计时。

## 访问控制（邀请码 + 体验成员白名单）

本小程序是**私人学习资料**，不是公开产品。访问控制分两层：

### 硬门禁（微信执行，真正有效）
1. **不要提交审核/发布**，保持在开发版或体验版
2. 微信公众平台 → 管理 → 成员管理 → **体验成员**，只把你允许的微信号加进去
3. 只有白名单里的微信号能打开体验版；外人拿不到入口

### 软门禁（代码执行，挡住普通使用者）
- 启动第一页就是邀请码页（`pages/gate/`），不通过进不去任何页面
- 10 个页面 `onShow` 都挂了守卫，直接跳详情/刷题页会被弹回邀请码页
- 代码里只存邀请码的 **SHA-256**，明文不在仓库任何文件里
- 通过状态存在本地 `gate:<哈希前8位>`，**换码后旧通行状态自动失效**
- 「我的」页提供「清除邀请码」入口（换机或演示前用）

### 换码方法
```bash
python3 -c "import hashlib;print(hashlib.sha256('你的新邀请码'.encode()).hexdigest())"
```
把输出的哈希填进 `miniprogram/utils/gate.js` 的 `CODE_HASH` 一行，重新提交版本即可。

### 必须知道的安全边界
- **纯本地小程序无法防住会反编译的人**：拿到代码包的人可以读到校验逻辑、跳过或伪造通过状态。这是原理限制，不是实现问题。
- 邀请码的真实作用是**声明 + 心理门槛 + 挡住普通人**；真正拦住外人靠上面的体验成员白名单。
- 若需要「一码一人、可远程吊销、不可绕过」，必须加服务端校验（云开发/自建服务），那会改变本项目「纯本地」的前提。

## 浏览器本地预览（可选，看内容用）

不想装微信开发者工具时，可双击打开 `../preview/index.html`（单文件、数据已内联、无需服务器）：
能点两书列表、五段式详情与标红、全局搜索、702 模拟卷双态、五种刷题模式。

- 它与小程序**同数据、同 utils**（store/search/drill/storage 直接复用），但**不是小程序本体**（无 WXML/WXSS 渲染器与 wx API），仅供查看内容与交互。
- 数据更新后重新生成：`python3 scripts/build_preview.py`

## 双轴时间轴与导演 / 流派专页（新增）

- **入口**：首页「电影双轴时间轴」一行 → `packageFilm/pages/timeline/index`
  - 纵轴＝世纪、横轴＝年份；**同一时段并列各国**运动 / 代表人物 / 经典影片 / 核心主张
  - 支持世纪筛选（19/20/21）、国别筛选（法国/美国/中国…）与关键词搜索（运动/国家/人物/片名）
- **搜索直达专页**：检索索引已包含导演名 / 流派名 / 片名 / 国别名（59 条 `type='entity'` 行）
  - 搜「小津安二郎」「法国新浪潮」「东京物语」「意大利」→ 命中专页并直达
  - 导演专页：艺术风格要点 → **作品按年份罗列**（每片：风格 + 意义）→ 相关知识条目跳转
  - 流派专页：运动核心主张 → 代表人物 → 代表作品 → 相关知识条目跳转
- **数据**（源文件下划线命名，分包副本连字符命名）
  - `data/film_timeline.json` → `packageFilm/data/film-timeline.json`（46 个时间点 / 13 个年代带 / 19·20·21 三个世纪）
  - `data/film_directors.json` → `packageFilm/data/film-directors.json`（导演 41 / 流派 18 / 片目 57）
- **来源标注**：教材原文标「教材第 N 章」；我补的通识内容标「通识补充」，页面上与教材原文分区显示（不混淆）
- **重建**：`python3 scripts/author_timeline.py`、`python3 scripts/author_directors.py`，再 `python3 scripts/build_mp_data.py`

## 刷题与间隔重复（增强）

### 四档自评（间隔重复）
刷题页展开答案后有四个按钮：**完全不会 / 有点印象 / 记住了 / 非常熟练**。排期由 `utils/srs.js`（纯函数，小程序与预览共用）计算：

| 档位 | 下次复习 | 备注 |
|---|---|---|
| 完全不会 | 今天 | 同时进错题本 |
| 有点印象 | 1 天后 | 不进错题本 |
| 记住了 | 3 天后 | |
| 非常熟练 | 7 天后 | 连续两次非常熟练升到 **15 天**并封顶 |

- 存储键 `srs:<book>`：`{ [itemId]: { due, interval, streak, last } }`，两书隔离
- 第六种刷题模式「**今日复习**」= 到期条目（`due <= 今天`），按逾期升序，空队列有提示
- 首页每本书显示「**今日待复习 N 题**」
- 旧接口仍兼容：`judge(true)` 视为「记住了」，`judge(false)` 视为「完全不会」

### 同轮体验修复
- **本轮完成页**：刷完最后一题显示「本轮完成」（本次刷了 N 题 · 累计记住 · 累计未记 · 记住率）+「再来一轮」「回到首页」
- **首页学习统计**：今日已刷 / 累计 / 记住率 / 错题 + 「继续上次刷题」（按最近一次进度恢复，两书取更近的一次）
- **上下题不跨书**：详情页上一题/下一题按**当前条目所属书**推进（此前会按板块状态错位）
- **今日已刷**：`today:<book>` 记录，跨日自动归零

### 存储键一览
`drill:<book>`（进度游标，含 `at` 时间戳）· `wrong:<book>` · `fav:<book>` · `stats:<book>` · `today:<book>` · `srs:<book>`
