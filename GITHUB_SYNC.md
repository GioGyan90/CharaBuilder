# GitHub 源码替换记录 · 2026-10-15

目标仓库：https://github.com/GioGyan90/CharaBuilder ，默认分支 `main`。

用户要求用本地最新捏人工具替换仓库原有内容。此次同步的模型和功能基线为本地提交 `88c56f1`（C 成男集成 v101）；发布树使用当前已跟踪文件的完整快照，源文件、运行资产、测试与文档一起更新，远端原来有而此快照没有的文件删除。默认分支只呈现这一份最新工具，不新建第二套版本目录。

替换前已将旧 main `3081c35f0b39d85cfa14aa413203a4b36e624b4b` 导出 ZIP，并将本地完整 Git 历史和所有已获取的远端分支打包为可恢复 bundle，且通过 `git bundle verify`。备份目录：`F:/AI Practise/CharaMake/artifacts/github-replacement-20261015/`，其中 `local-before.bundle` 和 `remote-main-before.zip` 为主要恢复文件；`replacement-record.json` 保存哈希、远端提交与执行结果。

备份、历史试验输出、原始外部 GLB、浏览器存档、日志与凭据不纳入同步。必要的旧档兼容资源继续随当前工具保留。采用以旧远端 main 为父提交的完整最新文件树，避免上传本地各轮未发布的大型试验历史；不强制改写远端 Git 历史，也不删除其他分支。

本次仅替换 GitHub 仓库源码，不涉及另行部署 GitHub Pages 或其他公网网站。C 的功能验证、几何与现有限制见 [v101 集成记录](STONE_C_INTEGRATION_V101.md)。
