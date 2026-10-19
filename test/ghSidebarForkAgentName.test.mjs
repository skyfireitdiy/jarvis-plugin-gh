// gh 插件「Fork 并创建 CodeAgent 处理」命名回归测试。
//
// 背景：Issue —— 从 PR 右键「Fork 并创建 CodeAgent 处理」时，Agent 命名
// 仍显示 "Issue #xxx"（handleItemForkCloneAgent 硬编码 Issue 前缀），
// 未按 item 类型区分 Issue / Pull Request。
//
// 本测试直接加载本插件仓库 frontend/sidebar_view.js（纯浏览器 ES module，
// 导出 Vue 组件对象），验证：
//   1) handleItemForkCloneAgent 按 tab 区分 kind（Issue / Pull Request）；
//   2) 创建 Agent 的 name 使用 `${kind} #${number}`；
//   3) 成功消息文案同样使用 `${kind} #${number}`。
//
// 运行方式（在插件仓库根目录下执行）：
//   node --test test/ghSidebarForkAgentName.test.mjs
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

test("组件包含 handleItemForkCloneAgent 方法", () => {
  assert.ok(
    comp.methods.handleItemForkCloneAgent,
    "方法 handleItemForkCloneAgent 应存在",
  );
});

test("handleItemForkCloneAgent 按 tab 区分 kind（Issue / Pull Request）", () => {
  const src = comp.methods.handleItemForkCloneAgent.toString();
  assert.ok(
    src.includes('const isIssue = this.tab === "issues"'),
    "应按 this.tab 判断是否为 Issue",
  );
  assert.ok(
    src.includes('const kind = isIssue ? "Issue" : "Pull Request"'),
    "kind 应区分 Issue / Pull Request",
  );
});

test("handleItemForkCloneAgent 创建 Agent 的 name 使用 ${kind} #${number}", () => {
  const src = comp.methods.handleItemForkCloneAgent.toString();
  assert.ok(
    src.includes("name: `${kind} #${number}`"),
    "Agent 命名应使用 `${kind} #${number}`，而非硬编码 Issue",
  );
  assert.ok(
    !src.includes("name: `Issue #${number}`"),
    "不应再硬编码 Issue 前缀",
  );
});

test("handleItemForkCloneAgent 成功消息使用 ${kind} #${number}", () => {
  const src = comp.methods.handleItemForkCloneAgent.toString();
  assert.ok(
    src.includes("已创建 CodeAgent 处理 ${kind} #${number}"),
    "成功消息应使用 `${kind} #${number}`",
  );
  assert.ok(
    !src.includes("已创建 CodeAgent 处理 Issue #${number}"),
    "成功消息不应再硬编码 Issue 前缀",
  );
});
