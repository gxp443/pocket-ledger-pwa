# Pocket Ledger PWA

一个给自己用的极简记账 PWA，目标是：

- 零费用
- 可安装到 iPhone 主屏幕
- 离线可用
- 支持一句中文快记
- 自定义分类与银行卡/信用卡管理
- 月预算、当月/年度汇总、图标化查看
- 记录编辑、删除、单次撤销删除
- 按月筛选、全文搜索、标签录入与标签筛选
- 自定义记账时间、排序、分页
- 固定账单模板、月度结转、JSON 备份/恢复
- 压缩备份下载 / 系统分享 / 导入文件 / 自动本机快照
- `IndexedDB` 主存储，兼容更大的本地账本
- 备份提醒：按天提醒、显示距离最近一份备份多久、备份后又改了多少次
- 记账提醒：午间 / 晚饭后 / 睡前轻提醒，支持配合 iPhone 快捷指令个人自动化
- 截图 OCR 记账：可把支付截图交给快捷指令提取文字，再自动写入或先预览后写入
- 能被 iPhone 快捷指令用 URL 参数直接调用

## 本地运行

在目录里启动一个静态服务即可，例如：

```bash
cd /Users/gp/pocket-ledger-pwa
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

如果要在 iPhone 上安装，最好部署到 `HTTPS` 静态托管，例如 GitHub Pages、Cloudflare Pages、Netlify。

## 部署到 GitHub Pages

这套项目已经带上了 GitHub Pages 自动部署工作流，后续只要往 `main` 分支推送，GitHub 就会自动发布。

最短步骤：

1. 在 GitHub 新建一个空仓库，例如 `pocket-ledger-pwa`。
2. 在本地项目目录初始化 Git，并把远程地址换成你自己的仓库：

```bash
cd /Users/gp/pocket-ledger-pwa
git init -b main
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/<你的用户名>/pocket-ledger-pwa.git
git push -u origin main
```

3. 打开 GitHub 仓库的 `Settings` -> `Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 等待仓库里的 `Deploy To GitHub Pages` 工作流跑完。
6. 发布地址通常会是：

```text
https://<你的用户名>.github.io/pocket-ledger-pwa/
```

之后每次更新代码，只需要：

```bash
cd /Users/gp/pocket-ledger-pwa
git add .
git commit -m "update"
git push
```

推送后 GitHub 会自动重新部署，不需要你的 Mac 一直开机。

## 核心功能

- 一句话快记：输入 `瑞幸咖啡18 支付宝` 这种中文文本，自动识别金额、分类、账户和收支类型。
- 自定义分类：支持增加自己的支出/收入分类，并为解析器补关键词。
- 银行卡/信用卡管理：支持为卡片配置银行名、类型、图标和关键词。
- 每月消费限制：设置月预算后，会显示剩余金额和月末预测。
- 月度/年度汇总：页面顶部直接看本月和本年的收入支出。
- 图标查看：按分类和账户聚合成轻量视觉卡片。
- 记录维护：支持把历史记录带回表单编辑，也支持删除后立即撤销一次。
- 记录筛选：支持切月份、按关键词搜备注/分类/账户/标签，并能按标签和收支类型快速过滤。
- 标签：手动录入支持 `#工作 #通勤` 或 `工作,通勤`，一句话快记支持直接从文本里的 `#标签` 提取。
- 自定义时间：手动记账和编辑记录时，可以直接指定日期时间。
- 列表控制：支持按时间或金额排序，并按页浏览。
- 固定账单模板：可保存房租、会员费、固定收入等模板，一键入账。
- JSON 备份恢复：可导出完整本地数据，也可整体导入恢复。
- 压缩备份链路：支持下载压缩备份、系统分享压缩备份、导入压缩文本文件，以及恢复最近一次本机快照。
- 大账本存储：主数据优先落在 `IndexedDB`，不再只依赖 `localStorage` 的容量。
- 备份提醒：支持按 3 / 7 / 14 / 30 天提醒，并提示备份后又发生了多少次新增或修改。
- 记账提醒：支持午间、晚饭后、睡前三个时段；页面内打开即提示，也能导出快捷指令自动化模板。
- 截图 OCR：支持把支付截图的 OCR 文本直接带进页面，优先识别支付金额、商户和微信/支付宝/信用卡等账户。
- 月度结转：可根据上个月净额生成“本月结转”记录。

## iPhone 安装

1. 用 Safari 打开部署后的地址。
2. 点击共享按钮。
3. 选择“添加到主屏幕”或“Open as Web App”。

## 快捷指令接入

最简单的方式是用 iPhone 的“快捷指令”创建一个动作：

1. 新建快捷指令。
2. 如果要做“一句话记账”，建议动作顺序是：
3. 读取“快捷指令输入”；如果为空，就“询问输入”。
4. 对这句话做“URL 编码”。
5. 用“文本”拼出页面里的一句话自动落账地址。
6. 最后执行“打开 URL”。
7. 把这个快捷指令放到主屏幕、Action Button 或 Siri 口令里。

结构化链接示例：

```text
https://your-domain.example/?autocommit=1&type=expense&amount=18&category=coffee&account=alipay&note=%E5%92%96%E5%95%A1&source=shortcut
```

一句话链接示例：

```text
https://your-domain.example/?autocommit=1&text=%E7%91%9E%E5%B9%B8%E5%92%96%E5%95%A118%20%E6%94%AF%E4%BB%98%E5%AE%9D&source=shortcut
```

截图 OCR 自动入账链接示例：

```text
https://your-domain.example/?autocommit=1&ocr=1&text=%E6%94%AF%E4%BB%98%E6%88%AA%E5%9B%BE%E6%8F%90%E5%8F%96%E5%87%BA%E7%9A%84%E6%96%87%E5%AD%97&source=ocr
```

截图 OCR 预览链接示例：

```text
https://your-domain.example/?prefill=1&ocr=1&text=%E6%94%AF%E4%BB%98%E6%88%AA%E5%9B%BE%E6%8F%90%E5%8F%96%E5%87%BA%E7%9A%84%E6%96%87%E5%AD%97&source=ocr
```

第二种方式更适合语音和智能触发。

截图 OCR 的推荐路线：

1. iPhone 截图后，在共享表单里交给快捷指令。
2. 快捷指令执行“从图像中提取文本”。
3. 对文本做 `URL 编码`。
4. 打开上面的 `ocr=1` 链接。
5. 想完全自动就用 `autocommit=1`；想先检查就用 `prefill=1`。

运行已存在快捷指令的 URL 示例：

```text
shortcuts://run-shortcut?name=Pocket%20Ledger%20%E4%B8%80%E5%8F%A5%E8%AF%9D%E8%AE%B0%E8%B4%A6&input=text&text=%E7%91%9E%E5%B9%B8%E5%92%96%E5%95%A118%20%E6%94%AF%E4%BB%98%E5%AE%9D
```

注意：

- Apple 官方支持 `create-shortcut` / `run-shortcut` 这类 URL 路线。
- 纯网页不能直接生成一个全新的 `.shortcut` 文件，因此本项目提供的是“打开快捷指令新建页 + 下载模板 + 复制运行 URL”的组合方案。

## 备份建议

- 少量数据迁移：`复制文本` -> 另一端 `剪贴板导入`
- 大量数据迁移：`下载压缩` 或 `系统分享` -> 另一端 `导入文件`
- 风险兜底：导入前会自动保存一份本机快照，必要时可直接点 `恢复快照`

## 更新规范

- 主数据存储：`IndexedDB` 为主，`localStorage` 只保留兼容镜像，不再把真实大账本完全押在 `localStorage` 上。
- 备份迁移：大数据默认走压缩文件链路，不再把剪贴板当成唯一方案。
- 缓存策略：Service Worker 使用稳定缓存名和自动接管更新，不再通过手动递增 `pocket-ledger-vN` 来顶更新问题。
- 发布前检查：
  - `node --check app.js`
  - `node scripts/self-test.mjs`
  - `git diff --check`

## 方案边界

- 纯 PWA 不能直接读取银行短信、支付通知、微信/支付宝账单。
- 如果要接近自动记账，需要借助 iPhone 快捷指令先解析通知，再把结果通过 URL 带进这个 PWA。
- 真正后台自动同步通常需要后端，而这会超出“零费用纯前端”的范围。
- 浏览器不能在 iPhone 上静默把备份文件自动存到系统里，所以“自动文件备份”不可靠；这版采用的是“导出 JSON + 备份提醒”的稳妥路线。
