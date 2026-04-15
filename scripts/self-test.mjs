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

  console.log("Self-test passed: backup transfer, cache policy, and backup UI hooks are valid.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
