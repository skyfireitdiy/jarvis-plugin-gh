// gh 插件「使用本地已 clone 目录作为目标仓库（跳过 Fork）」回归测试。
//
// 背景：Issue #1 —— 用户自己 clone 了仓库到本地但没启动 Agent，只能走
// 第三方仓库流程，而 GitHub/Gitee 不允许 Fork 自己的仓库，流程卡在 Fork。
// 新增「使用本地目录」能力：直接指定本地已 clone 的 git 目录作为目标仓库，
// 跳过 Fork + Clone，右键「在当前目录创建 CodeAgent 处理」直接改代码。
//
// 本测试直接加载本插件仓库 frontend/sidebar_view.js（纯浏览器 ES module，
// 导出 Vue 组件对象），验证：
//   1) 组件包含 useLocalDir / pickLocalDir / handleItemLocalDirAgent / restoreLocalDir；
//   2) data 初始结构含 localDirInput / localDir / isLocalDirRepo；
//   3) useLocalDir 调用后端 use_local_dir 并设置本地目录仓库状态；
//   4) handleItemLocalDirAgent 的 working_dir 指向本地目录、task 走直接改代码流程（非 fork）；
//   5) 模板含本地目录入口与「在当前目录创建 CodeAgent 处理」菜单；
//   6) useCurrentDirRepo 清除本地目录状态。
//
// 运行方式（在插件仓库根目录下执行）：
//   node --test test/ghSidebarLocalDir.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
// ---- 浏览器环境桩（sidebar_view.js 顶层引用 window/localStorage/document）----
globalThis.window = { location: { protocol: "http:" }, open: () => {} };
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.document = { querySelector: () => null };
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
globalThis.Vue = {};
// 从 test/ 相对路径指向插件仓库的 frontend/sidebar_view.js。
const { default: comp } = await import("../frontend/sidebar_view.js");
test("组件包含本地目录相关方法", () => {
  for (const m of [
    "useLocalDir",
    "pickLocalDir",
    "handleItemLocalDirAgent",
    "restoreLocalDir",
  ]) {
    assert.ok(comp.methods[m], `方法 ${m} 应存在`);
  }
});
test("data 初始结构含本地目录状态", () => {
  const data = comp.data();
  assert.ok("localDirInput" in data, "data 应含 localDirInput");
  assert.ok("localDir" in data, "data 应含 localDir");
  assert.equal(data.localDir, "", "localDir 初始应为空");
  assert.equal(data.isLocalDirRepo, false, "isLocalDirRepo 初始应为 false");
});
test("useLocalDir 调用后端 use_local_dir 并设置本地目录仓库状态", () => {
  const src = comp.methods.useLocalDir.toString();
  assert.ok(
    src.includes('callFunction("use_local_dir"'),
    "useLocalDir 应调用后端 use_local_dir",
  );
  assert.ok(
    src.includes("local_dir: dir"),
    "useLocalDir 应传 local_dir 参数",
  );
  assert.ok(
    src.includes("this.isLocalDirRepo = true"),
    "useLocalDir 成功时应设置 isLocalDirRepo = true",
  );
  assert.ok(
    src.includes("this.isManualRepo = false"),
    "useLocalDir 成功时应清除 isManualRepo",
  );
  assert.ok(
    src.includes("localStorage.setItem(LOCAL_DIR_KEY"),
    "useLocalDir 应持久化本地目录",
  );
});
test("handleItemLocalDirAgent 的 working_dir 指向本地目录且 task 走直接改代码流程", () => {
  const src = comp.methods.handleItemLocalDirAgent.toString();
  assert.ok(
    src.includes("const dir = (this.localDir || \"\").trim()"),
    "应取 this.localDir 作为本地目录",
  );
  assert.ok(
    src.includes("workingDir: dir"),
    "创建 Agent 的 working_dir 应指向本地目录",
  );
  assert.ok(
    src.includes("task: this.buildItemPrompt(item)"),
    "task 应使用非 fork 的提示词（buildItemPrompt 默认分支）",
  );
  assert.ok(
    !src.includes("prepare_issue_repo"),
    "本地目录流程不应调用 prepare_issue_repo（跳过 Fork + Clone）",
  );
  assert.ok(
    !src.includes("buildItemPrompt(item, true)"),
    "本地目录流程不应使用 isFork=true 的提示词",
  );
});
test("buildItemPrompt 在本地目录仓库下走直接改代码流程（非 fork）", () => {
  const src = comp.methods.buildItemPrompt.toString();
  assert.ok(
    src.includes("if (this.isLocalDirRepo)"),
    "buildItemPrompt 应区分本地目录仓库",
  );
  assert.ok(
    src.includes("在当前目录直接修改代码修复问题，提交并推送"),
    "本地目录提示词应说明直接改代码流程",
  );
  assert.ok(
    src.includes("git push origin"),
    "本地目录提示词应含推送分支步骤",
  );
  assert.ok(
    src.includes("git checkout -b fix/issue-"),
    "本地目录提示词应含从主干切特性分支步骤",
  );
});
test("模板含本地目录入口与「在当前目录创建 CodeAgent 处理」菜单", () => {
  assert.ok(comp.template.includes("使用本地目录"), "模板应含本地目录入口");
  assert.ok(comp.template.includes("选择目录"), "模板应含目录选择按钮");
  assert.ok(
    comp.template.includes("pickLocalDir"),
    "模板应绑定 pickLocalDir",
  );
  assert.ok(
    comp.template.includes("useLocalDir"),
    "模板应绑定 useLocalDir",
  );
  assert.ok(
    comp.template.includes("在当前目录创建 CodeAgent 处理"),
    "模板应含本地目录仓库的右键菜单项",
  );
  assert.ok(
    comp.template.includes("handleItemLocalDirAgent"),
    "模板应绑定 handleItemLocalDirAgent",
  );
});
test("useCurrentDirRepo 清除本地目录状态", () => {
  const src = comp.methods.useCurrentDirRepo.toString();
  assert.ok(
    src.includes("localDir = \"\""),
    "useCurrentDirRepo 应清空模块级 localDir",
  );
  assert.ok(
    src.includes("localStorage.removeItem(LOCAL_DIR_KEY)"),
    "useCurrentDirRepo 应清除本地目录持久化",
  );
});
