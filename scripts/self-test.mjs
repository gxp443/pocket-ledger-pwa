import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backupCore = require("../backup-core.js");

function createPayload(entryCount) {
  return {
    exportedAt: new Date("2026-04-15T00:00:00.000Z").toISOString(),
    version: 2,
    settings: {
      activeView: "home",
      monthlyBudget: 4000,
      backupReminderDays: 7,
      customCategories: [],
      customAccounts: [],
      templates: [],
    },
    entries: Array.from({ length: entryCount }, (_, index) => ({
      id: `entry-${index}`,
      amount: (index % 97) + 1,
      note: `牛肉面${index}`,
      categoryKey: index % 2 ? "lunch" : "dinner",
      type: "expense",
      accountId: "wechat",
      tags: ["测试", `批次${index % 10}`],
      source: "smart",
      createdAt: new Date("2026-04-15T00:00:00.000Z").toISOString(),
    })),
  };
}

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  assert.notEqual(start, -1, `未找到片段起点: ${startMarker}`);
  assert.notEqual(end, -1, `未找到片段终点: ${endMarker}`);
  return text.slice(start, end).trim();
}

async function run() {
  const raw = backupCore.serializeBackupPayload(createPayload(3000), false);
  const encoded = await backupCore.encodeBackupTransfer(raw);
  const decoded = await backupCore.decodeBackupTransfer(encoded);

  assert.equal(decoded, raw, "压缩备份必须能无损解回原始 JSON");
  assert.ok(
    backupCore.getTextByteLength(encoded) < backupCore.getTextByteLength(raw),
    "压缩备份体积应该小于原始 JSON"
  );
  assert.equal(backupCore.getBackupFilename("2026-04-15T00:00:00.000Z"), "pocket-ledger-backup-2026-04-15.json");
  assert.equal(backupCore.getTransferFilename("2026-04-15T00:00:00.000Z"), "pocket-ledger-transfer-2026-04-15.txt");

  const swText = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(swText, /pocket-ledger-static/, "service worker 应使用稳定缓存名");
  assert.doesNotMatch(swText, /pocket-ledger-v\d+/, "service worker 不应再依赖手动递增缓存版本");
  assert.match(swText, /backup-core\.js/, "service worker 需要缓存 backup-core.js");

  const htmlText = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(htmlText, /downloadTransferButton/, "页面应提供压缩备份下载入口");
  assert.match(htmlText, /restoreSnapshotButton/, "页面应提供快照恢复入口");
  assert.match(htmlText, /backup-core\.js/, "页面应先加载 backup-core.js");

  const appText = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const parserSnippet = [
    sliceBetween(appText, "const incomeKeywords =", "const incomeContextRules ="),
    sliceBetween(appText, "const incomeContextRules =", "const expenseContextRules ="),
    sliceBetween(appText, "const expenseContextRules =", "const breakfastFoodKeywords ="),
    sliceBetween(appText, "function detectType(text) {", "function extractAmount(text) {"),
  ].join("\n\n");
  const { detectType } = new Function(`${parserSnippet}\nreturn { detectType };`)();

  assert.equal(detectType("麻将赢200"), "income", "麻将赢应识别为收入");
  assert.equal(detectType("打牌赢88"), "income", "打牌赢应识别为收入");
  assert.equal(detectType("麻将输200"), "expense", "麻将输应识别为支出");

  const accountSnippet = [
    sliceBetween(appText, "const builtInAccounts =", "const smartExamples ="),
    sliceBetween(appText, "const accountSemanticRules =", "const breakfastFoodKeywords ="),
    "const state = { settings: { activeAccountId: 'cash', customAccounts: [] } };",
    "function getAccounts() { return [...builtInAccounts, ...state.settings.customAccounts]; }",
    "function getAccountById(id) { return getAccounts().find((account) => account.id === id); }",
    sliceBetween(appText, "function matchAccount(text, normalizedText) {", "function inferCategoryByMeaning(text, normalizedText, type) {"),
    sliceBetween(appText, "function chooseBestMatch(items, scorer) {", "function extractTagsFromText(value) {"),
  ].join("\n\n");
  const { matchAccount, inferAccountByMeaning, normalizeText } = new Function(
    `${accountSnippet}\nreturn { matchAccount, inferAccountByMeaning, normalizeText };`
  )();

  assert.equal(matchAccount("午饭20微信", normalizeText("午饭20微信"))?.id, "wechat", "微信应命中微信账户");
  assert.equal(matchAccount("午饭20支付宝", normalizeText("午饭20支付宝"))?.id, "alipay", "支付宝应命中支付宝账户");
  assert.equal(inferAccountByMeaning("午饭20信用卡", normalizeText("午饭20信用卡"))?.type, "credit", "信用卡应推断为信用卡账户");
  assert.equal(inferAccountByMeaning("午饭20银行卡", normalizeText("午饭20银行卡"))?.type, "debit", "银行卡应推断为银行卡账户");

  console.log("Self-test passed: backup flow, cache policy, UI hooks, and parser smoke cases are valid.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
