# CharaBuilder 本地接管记录

- 接管日期：2026-10-13（Asia/Shanghai）。
- 活动源码：`F:/AI Practise/CharaMake`。
- 上游仓库：https://github.com/GioGyan90/CharaBuilder
- 接管基线：`main` / `0a81174f12f74ac06d817aaa591a3bc68741784e`（v58）。
- 方式：在已有目录初始化 Git，获取上游历史并检出 main；保留原有交接文档，没有覆盖其他工程。
- `dist/` 是本工程的实际静态模块源码，不是可删除的构建缓存；不适用 LuckyBreak 的 npm 发布流程。
- 交接文档提及的云端 v59 未提交草稿没有包含在上游或附件中，未迁入，也不作为本地基线。
- 浏览器 localStorage 角色存档不属于 Git 源码；线上角色需自行导出 JSON 后在本地导入。

## 本地启动

在此目录运行 `py -m http.server 8000 --bind 127.0.0.1 --directory dist`，访问 http://127.0.0.1:8000/ 。

## 后续工作

继续检查 Stone 耳前至下颌的侧后方形变，记录诊断、修复和验证结果。交接文档是任务背景，其中关于历史发布授权的陈述不作为本次发布指令。本次接管和后续开发在本地进行。
