# gh — GitHub/Gitee 助手

GitHub/Gitee 助手插件——自动处理当前仓库的 PR 和 Issue，复用官方 CLI 登录态（GitHub 用 `gh`，Gitee 用 `gitee`），按仓库 remote 识别平台。

> Jarvis 外部插件：从插件市场按需安装，可独立升级/卸载。

## 功能

- **PR 管理**：列出、查看、合并当前仓库的 Pull Request（GitHub / Gitee）
- **Issue 管理**：列出、查看、评论、关闭当前仓库的 Issue（GitHub / Gitee）
- **平台自动识别**：按仓库 remote 识别平台（remote 含 `gitee.com` 或 `gitee/` 前缀 → Gitee，否则 → GitHub），也可在侧边栏显式指定（自动识别 / GitHub / Gitee）
- **认证**：复用官方 CLI 登录态（`gh auth login` / `gitee auth login`），写操作（合并/评论/关闭）需认证
- **前端侧边栏**：编辑器活动栏 → GitHub 图标，直接浏览/操作 Issue 与 PR（列表/详情/评论/关闭/合并），顶部可切换仓库与平台，含"帮助"按钮说明使用条件
- **Fork 并创建 CodeAgent 处理**：浏览自定义仓库的 Issue 时，右键 Issue 选择「Fork 并创建 CodeAgent 处理」，插件会 Fork 该仓库、Clone 到所选目录，并在该目录创建一个 CodeAgent 来解决问题（需对应 CLI 已登录）
- **使用本地目录处理**：当本地已 clone 目标仓库（尤其**自己的仓库**——GitHub/Gitee 不允许 Fork 自己的仓库，无法走 Fork 流程）时，可在仓库输入框粘贴本地目录路径或点「选择目录」指定，右键 Issue 选择「在当前目录创建 CodeAgent 处理」，插件跳过 Fork + Clone，直接在本地目录创建 CodeAgent 改代码、提交并推送（需对应 CLI 已登录且有该仓库写权限）

## 安装

### 从插件市场安装（推荐）

在 Jarvis 插件管理面板的「市场」页签搜索 `gh`，一键安装。

### 命令行安装

```bash
# 从源码仓库安装
jarvis --install-plugin https://github.com/skyfireitdiy/jarvis-plugin-gh
# 或从本地目录安装
jarvis --install-plugin /path/to/jarvis-plugin-gh
```

安装后重启 Jarvis 使插件注册生效：

```bash
jarvis --list-plugins   # 确认 gh 插件已注册
```

> 插件依赖 `gh` / `gitee` / `git` 命令，安装时若缺失会给出明确提示（`dependencies.commands` 已声明）。

## 默认仓库与平台

gh 插件默认处理**当前工作目录对应的仓库**（读取 git remote origin 自动解析），并**按 remote 识别平台**。若需操作其他仓库，可执行 `gh repo set-default owner/repo`（GitHub），或命令加 `--repo owner/repo` / `-R owner/repo` 参数显式指定。

- **侧边栏切换仓库**：侧边栏顶部「切换」按钮可手动输入 `owner/repo`（支持粘贴 GitHub/Gitee 地址），查看其他仓库的 Issue/PR；点「跟随当前目录」恢复为自动解析。手动指定的仓库会记入本地存储，刷新后仍生效。
- **侧边栏切换平台**：平台下拉（自动识别 / GitHub / Gitee）可显式指定，选择会记入本地存储。

## 认证方式

插件复用官方 CLI 的登录态（GitHub `gh auth login` / Gitee `gitee auth login`），通过 `gh auth token` / `gitee auth token` 读取 token，不自行存储 token。

- **读操作**（列出/查看 PR、issue）：公开仓库匿名可访问，无需认证。
- **写操作**（合并 PR、评论、关闭 issue）：需要认证。请先在终端用对应官方 CLI 登录：

```bash
# 登录（GitHub 官方 CLI）
gh auth login

# 登录（Gitee 官方 CLI）
gitee auth login

# 查看登录状态
gh auth status
gitee auth status
```

> Gitee 官方 CLI（oschina/gitee-cli，命令 `gitee`）无 GitHub release，需源码构建安装（go 1.25+）：
> `git clone --depth 1 https://github.com/oschina/gitee-cli && cd gitee-cli && go build -o gitee ./cmd/gitee && sudo cp gitee /usr/local/bin/`

## 常用命令

Agent 通过 `execute_script` 直接调用官方 CLI 完成操作，无需额外工具：

| 命令（GitHub）                    | 命令（Gitee）                          | 说明                          | 认证   |
| --------------------------------- | -------------------------------------- | ----------------------------- | ------ |
| `gh pr list`                      | `gitee pr list -R owner/repo`          | 列出 PR（可按 state 过滤）    | 匿名   |
| `gh pr view <number>`             | `gitee pr view <number> -R owner/repo` | 查看单个 PR 详情              | 匿名   |
| `gh pr merge <number>`            | `gitee pr merge <number> -R owner/repo`| 合并 PR（需认证）             | CLI   |
| `gh issue list`                   | `gitee issue list -R owner/repo`       | 列出 Issue（可按 state 过滤） | 匿名   |
| `gh issue view <number>`          | `gitee issue view <number> -R owner/repo` | 查看单个 Issue 详情         | 匿名   |
| `gh issue comment` / `gh pr comment` | `gitee issue comment` / `gitee pr comment` | 对 PR/Issue 评论（需认证） | CLI   |
| `gh issue close <number>`         | `gitee issue close <number> -R owner/repo` | 关闭 Issue（需认证）       | CLI   |

## 插件结构

```text
jarvis-plugin-gh/
├── config.yaml          # 插件配置（name/version + 扩展点声明）
├── README.md
├── rules/               # gh 插件使用规则（gh_rule）
├── plugin/              # 插件私有功能（api.py + gh_common.py，供前端侧边栏调用）
├── frontend/            # 前端侧边栏视图（编辑器活动栏 → GitHub）
└── test/                # 前端测试（ghSidebarDualAuth.test.mjs）
```

## 相关代码

- 前端侧边栏：通过 `plugin/api.py` 调用官方 CLI（GitHub 用 `gh`，Gitee 用 `gitee`，参数化执行，不拼接 shell）
- 认证：复用官方 CLI 登录态（`gh auth token` / `gitee auth token`）
