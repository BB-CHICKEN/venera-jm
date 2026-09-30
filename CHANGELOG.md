# 更新说明

### v1.9.0 (2026-09-30)

**架构重构**
- 改用框架原生登录机制，移除自定义重登逻辑（`handleLoginExpired`、`_handleAutoRenew` 等）
- 401 时抛出 `Login expired`，由框架自动重登并重试
- 移除 `jm_account`/`jm_pwd`/`autoReLogin` 设置项
- `init()` 精简：网络请求移至 `_initBackground()` 异步执行，避免安装/重载超时
- 签到逻辑从 `getApiHeaders()` 中移出，改为登录验证后后台触发，不再污染每次 API 请求
- 所有 `throw` 统一使用 `new Error()`，确保宿主可通过 `instanceof Error` 识别异常类型

**新功能**
- 恢复网络收藏功能（多收藏夹、添加/删除/移动收藏、排序）

**Bug 修复**
- 章节数据由 `Map` 改为普通对象，符合框架跨桥接约束
- 5xx 服务器错误（如 Cloudflare 520）不再触发 `"Login expired"` 重登录流程，避免级联崩溃
- `loadInfo` 详情字段 null 防御：`related_list`/`name`/`description`/`likes`/`addtime` 全部加 `??` 兜底，修复宿主 `Null check operator` 崩溃
- `loadEp` 处理 `epId == null`（无分章作品回退到 `comicId`）及 `data.images` 为 null 的情况
- `account.logout` 给 `deleteCookies` 补 `https://` 协议前缀，确保 Cookie 正确清除
- 签到日期改用手动 `YYYY-MM-DD` 格式化，不依赖 `toLocaleDateString('zh-CN')`（QuickJS 不支持 locale 参数）
- 评论 `id` 映射修正：`e.id`（API 不存在）→ `e.CID`，评论点赞/回复引用恢复正常
- 评论 `isLiked` 映射补充：`e.is_liked ?? false`

**文档合规**
- `index.json` 补充 `minAppVersion` 字段
- 源脚本 `minAppVersion` 更新为 `1.16.0`（实际验证过的 Venera-Next 最低版本）
- 章节 ID 加 `ep_` 前缀，避免 JavaScript 整数键重排序导致章节顺序错乱，`loadEp`/`onImageLoad` 中 `slice(3)` 还原
- `explore` 的 `viewMore` 从字符串改为跳转目标对象 `{page, attributes}`，符合框架规范
- `subTitle` 统一为 `subtitle`，避免旧别名在普通对象返回时不转换
- 日期 `updateTime` 补零格式化（`padStart(2,'0')`），保证 `YYYY-MM-DD` 格式，追更判断不再因个位月/日出错
- 评论 HTML 提取从 `substring + indexOf` 硬切改为 `_sanitizeHtml()`，只保留文档允许的富文本标签

**数据健壮性**
- `parseComic` 中 `title`/`author` 加 `?? ""` 兜底
- `search.load` 和 `categoryComics.load` 的 `options[0]`/`options[1]` 加 `??` 默认值，避免 URL 出现 `undefined`
- 分类分区第二个 `"特殊PLAY"` 改名为 `"其他標籤"`，消除同名重复

**移除**
- 自定义版本检查逻辑（`checkVersion`/`compareVersions`），框架通过 `index.json` 自动管理更新
- `checkUpdateOnStart` 设置项

---

### v1.8.6 (2026-08-31)

**项目重构**
- 版本校验改为 `index.json`，新增 `url` 字段确保第三方维护版本（Venera-Next 等）可正常获取更新
- 更新链接改为 GitHub Release 最新下载链接
- `release.yml`：`index.json` 变更时自动发布 Release 并上传 `recode-jm.js`
- README 标明后续基于 [Venera-Next](https://github.com/CyrilPeng/Venera-Next) 开发

**搜索匹配增强**
- 无冒号时检测文字中分散数字 ≥ 5 位自动组合传入（如 `花35块吃了6份鲍鱼4份龙虾40份` → `356440`）
- JM 大写适配：`JM`/`Jm`/`jM` 前缀均可识别

---

### v1.8.5 (2026-08-30)

**Bug 修复**
- 修复 `_makeImageRetry` 箭头函数 `this` 上下文错误，导致图片加载时抛出 `TypeError` (https://github.com/BB-CHICKEN/venera-jm/issues/2)

---

### v1.8.4 (2026-08-29)

**Bug 修复**
- 修复图片加载失败 `TypeError: not a function`，`_makeImageRetry` 从 IIFE 改为普通方法
- 修复 `idMatch` 匹配后传入整个搜索框文本而非数字的问题，`loadInfo` 中增加 ID 提取逻辑
- 修复 `handleLoginExpired` 登录弹窗挂起死锁（空 `Promise` 改为 `Promise.reject`）
- 修复分类字段空值崩溃（`category` / `category_sub` 增加可选链 `?.`）
- 修复图片加载失败兜底缺少 `headers` 和 `onLoadFailed` 回调

**新增功能**
- 新增 `loadChapterComments` / `sendChapterComment` 章节评论加载与发送
- 支持中文/英文冒号后分散数字自动组合（如 `花35块吃了6份鲍鱼4份龙虾40份` → `356440`），适配隐写分享格式
- 支持 `jm` 前缀漫画 ID 输入（如 `jm12345`）
- 新增 `_makeImageRetry` 图片加载失败自动切换分流重试
- 启用标签翻译 `enableTagsTranslate`

---

### v1.8.3 (2026-07-28)

**新增功能**
- 版本检查改为请求 `version.json` 校验文件，大幅减少流量消耗
- 新增 GitHub Actions：Issue 自动校验（检查必填字段）+ 自动关闭（超时未补充信息 / 长期无活动）

**改进**
- 更新全部 API 域名（fallbackServers）和图片 CDN 域名
- 图片分流测速优化：仅测 5 个选项对应的去重线路，复用 `_buildShuntMapping` 缓存
- 图片分流映射改为动态去重，选项 N 自动映射到第 N 个唯一分流线路

---

### v1.8.2 (2026-07-28)

**新增功能**
- 启动时版本检查：启动时自动从 GitHub 获取最新版本号，发现新版本弹窗提醒用户
- 新增 `checkUpdateOnStart` 设置项（开关，默认开启），可关闭启动时检查更新
- 支持 `ghfast.top` 代理与 `raw.githubusercontent.com` 直连双路回退，5秒超时保护

---

### v1.8.1 (2026-07-27)

**Bug 修复**
- 修复图片分流测速中重复线路显示"与上相同"不准确的问题，改为显示"与线路X相同"明确标注来源

---

### v1.8.0 (2026-07-26)

**新增功能**
- 节点延迟测试：一键并行测试所有 API 节点响应延迟，按延迟排序，标注最快节点
- 图片分流测速：一键测试 5 条图片 CDN 线路下载速度，自动去重，标注最快线路

**性能优化**
- 节点延迟测试改用 `Network.get` 替代原生 `fetch`，实现真正的并发请求
- 单节点超时设为 4 秒，避免慢节点拖慢整体测试
- 图片分流测速采用两阶段流水线（并行取 CDN 域名 → 并行测速），CDN 域名自动去重

**Bug 修复**
- 修复评论发送失败：`status` 参数从 `undefined` 修正为 `'true'`
- 修复评论接口参数：`/album_comment` 端点适配 `video_id` 参数名