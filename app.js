const backupCore = globalThis.PocketLedgerBackupCore;
const ENTRY_STORAGE_KEY = "pocket-ledger-entries-v2";
const SETTINGS_STORAGE_KEY = "pocket-ledger-settings-v2";
const LEGACY_ENTRY_STORAGE_KEY = "pocket-ledger-entries-v1";
const LEGACY_TYPE_KEY = "pocket-ledger-active-type";
const LEGACY_CATEGORY_KEY = "pocket-ledger-active-category";
const APP_VIEWS = ["home", "ledger", "insights", "manage"];
const BACKUP_REMINDER_OPTIONS = [0, 3, 7, 14, 30];
const BACKUP_REMINDER_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const CLIPBOARD_BACKUP_SOFT_LIMIT = 180 * 1024;
const ENTRY_LOCAL_MIRROR_SOFT_LIMIT = 600 * 1024;
const LOCAL_SNAPSHOT_LIMIT = 3;
const AUTO_SNAPSHOT_COOLDOWN_MS = 15 * 60 * 1000;
const ENTRY_REMINDER_COOLDOWN_MS = 90 * 60 * 1000;
const LEDGER_DB_NAME = "pocket-ledger-db";
const LEDGER_DB_VERSION = 1;
const LEDGER_KV_STORE = "ledger-kv";
const IDB_SETTINGS_KEY = "settings";
const IDB_ENTRIES_KEY = "entries";
const IDB_SNAPSHOTS_KEY = "snapshots";
const REMINDER_SLOT_PRESETS = {
  lunch: { label: "午间补账", defaultTime: "13:20" },
  dinner: { label: "晚饭后", defaultTime: "19:40" },
  night: { label: "睡前补账", defaultTime: "22:30" },
};

if (!backupCore) {
  throw new Error("PocketLedgerBackupCore 未加载");
}

const builtInCategories = [
  { key: "breakfast", label: "早餐", icon: "🥐", type: "expense", keywords: ["早餐", "早饭", "豆浆", "包子", "油条", "煎饼"], builtIn: true },
  { key: "lunch", label: "午饭", icon: "🍱", type: "expense", keywords: ["午饭", "午餐", "便当", "食堂", "工作餐"], builtIn: true },
  { key: "dinner", label: "晚饭", icon: "🍜", type: "expense", keywords: ["晚饭", "晚餐", "夜宵", "宵夜", "烧烤", "火锅"], builtIn: true },
  { key: "coffee", label: "咖啡", icon: "☕", type: "expense", keywords: ["咖啡", "瑞幸", "星巴克", "库迪", "拿铁", "美式", "馥芮白"], builtIn: true },
  { key: "transport", label: "通勤", icon: "🚇", type: "expense", keywords: ["地铁", "公交", "通勤", "高铁", "火车", "巴士"], builtIn: true },
  { key: "taxi", label: "打车", icon: "🚕", type: "expense", keywords: ["打车", "滴滴", "出租", "专车", "网约车"], builtIn: true },
  { key: "grocery", label: "买菜", icon: "🛒", type: "expense", keywords: ["买菜", "超市", "生鲜", "菜场", "菜市场", "便利店"], builtIn: true },
  { key: "snack", label: "零食", icon: "🍪", type: "expense", keywords: ["零食", "水果", "奶茶", "饮料", "面包", "饼干", "薯片", "坚果", "酸奶"], builtIn: true },
  { key: "smoke", label: "烟酒", icon: "🚬", type: "expense", keywords: ["烟", "买烟", "香烟", "卷烟", "电子烟", "酒", "啤酒", "白酒", "红酒", "槟榔"], builtIn: true },
  { key: "rent", label: "房租", icon: "🏠", type: "expense", keywords: ["房租", "租金"], builtIn: true },
  { key: "other-expense", label: "其他支出", icon: "🧾", type: "expense", keywords: ["消费", "支出", "付款"], builtIn: true },
  { key: "salary", label: "工资", icon: "💼", type: "income", keywords: ["工资", "薪资", "发薪"], builtIn: true },
  { key: "bonus", label: "奖金", icon: "✨", type: "income", keywords: ["奖金", "红包", "报销", "返现"], builtIn: true },
  { key: "transfer", label: "转入", icon: "💳", type: "income", keywords: ["转入", "入账", "收款", "退款"], builtIn: true },
  { key: "other-income", label: "其他收入", icon: "🪙", type: "income", keywords: ["收入"], builtIn: true },
];

const builtInAccounts = [
  { id: "cash", name: "现金", bank: "", type: "cash", icon: "💵", keywords: ["现金"], builtIn: true },
  { id: "wechat", name: "微信", bank: "", type: "wallet", icon: "🟩", keywords: ["微信", "微信支付", "微信零钱"], builtIn: true },
  { id: "alipay", name: "支付宝", bank: "", type: "wallet", icon: "🟦", keywords: ["支付宝", "支付宝支付", "花呗", "余额宝"], builtIn: true },
  { id: "credit-default", name: "信用卡", bank: "", type: "credit", icon: "💳", keywords: ["信用卡", "刷卡", "贷记卡"], builtIn: true },
  { id: "debit-default", name: "银行卡", bank: "", type: "debit", icon: "🏦", keywords: ["银行卡", "储蓄卡", "借记卡", "工资卡"], builtIn: true },
];

const smartExamples = [
  "瑞幸咖啡18 支付宝",
  "午饭28 微信",
  "打车26 招行信用卡",
  "工资8500 工资卡",
];

const presets = [
  { label: "早餐", amount: 12, categoryKey: "breakfast", note: "早餐" },
  { label: "咖啡", amount: 18, categoryKey: "coffee", note: "咖啡" },
  { label: "午饭", amount: 28, categoryKey: "lunch", note: "午饭" },
  { label: "地铁", amount: 3, categoryKey: "transport", note: "通勤" },
  { label: "打车", amount: 26, categoryKey: "taxi", note: "打车" },
  { label: "零食", amount: 10, categoryKey: "snack", note: "零食" },
];

const incomeKeywords = ["工资", "薪资", "收入", "转入", "入账", "收款", "报销", "奖金", "红包", "返现", "退款", "赚", "赚了", "赢钱", "赢了", "赢"];
const incomeContextRules = [
  { includeAll: ["麻将", "赢"] },
  { includeAll: ["打牌", "赢"] },
  { includeAll: ["扑克", "赢"] },
  { includeAll: ["德州", "赢"] },
  { includeAll: ["牌局", "赢"] },
  { includeAll: ["赌球", "赢"] },
  { includeAll: ["彩票", "中"] },
];
const expenseContextRules = [
  { includeAll: ["麻将", "输"] },
  { includeAll: ["打牌", "输"] },
  { includeAll: ["扑克", "输"] },
  { includeAll: ["德州", "输"] },
  { includeAll: ["牌局", "输"] },
  { includeAll: ["赌球", "输"] },
  { includeAll: ["亏", "了"] },
];
const accountSemanticRules = [
  { accountId: "wechat", keywords: ["微信支付", "微信", "微信零钱"] },
  { accountId: "alipay", keywords: ["支付宝支付", "支付宝", "花呗", "余额宝"] },
  { accountId: "credit-default", keywords: ["信用卡", "刷卡", "贷记卡"] },
  { accountId: "debit-default", keywords: ["银行卡", "储蓄卡", "借记卡", "工资卡"] },
  { accountId: "cash", keywords: ["现金", "付现", "现付"] },
];
const breakfastFoodKeywords = ["早餐", "早饭", "豆浆", "油条", "包子", "馒头", "煎饼", "三明治"];
const lunchCueKeywords = ["午饭", "午餐", "中饭", "中午", "工作餐"];
const dinnerCueKeywords = ["晚饭", "晚餐", "晚上", "夜宵", "宵夜", "烧烤", "火锅", "聚餐", "烤肉"];
const mealFoodKeywords = [
  "牛肉面",
  "拉面",
  "面馆",
  "面条",
  "米线",
  "盖饭",
  "炒饭",
  "米饭",
  "黄焖鸡",
  "麻辣烫",
  "螺蛳粉",
  "冒菜",
  "汉堡",
  "水饺",
  "馄饨",
  "盒饭",
  "便当",
  "快餐",
];
const semanticCategoryRules = [
  { categoryKey: "smoke", keywords: ["买烟", "香烟", "卷烟", "电子烟", "烟弹", "酒", "啤酒", "白酒", "红酒", "槟榔"] },
  { categoryKey: "snack", keywords: ["零食", "薯片", "辣条", "饼干", "水果", "奶茶", "饮料", "可乐", "雪碧", "酸奶", "面包", "矿泉水"] },
  { categoryKey: "coffee", keywords: ["咖啡", "瑞幸", "星巴克", "库迪", "拿铁", "美式", "馥芮白"] },
  { categoryKey: "grocery", keywords: ["超市", "便利店", "生鲜", "买菜", "菜市场", "日用品", "纸巾", "牙膏", "洗发水"] },
  { categoryKey: "taxi", keywords: ["打车", "滴滴", "专车", "网约车", "出租车"] },
  { categoryKey: "transport", keywords: ["地铁", "公交", "高铁", "火车", "巴士", "车票"] },
];
const receiptStrongAmountKeywords = [
  "实付",
  "支付",
  "付款",
  "消费",
  "金额",
  "总计",
  "合计",
  "订单金额",
  "支付金额",
  "实际支付",
  "收款",
  "到账",
  "入账",
  "退款",
  "转入",
];
const receiptWeakAmountKeywords = ["优惠后", "应付", "原价", "优惠", "立减"];
const receiptNegativeAmountKeywords = ["尾号", "卡号", "订单号", "流水号", "单号", "券", "积分", "剩余", "余额"];
const receiptMerchantLabelPatterns = [
  /^(?:收款方|商户(?:名称)?|商家|付款给|交易对象|商品(?:说明)?)[：:\s]+(.+)$/i,
  /^(?:向|给)(.+?)(?:付款|转账|收款)$/i,
];
const receiptMerchantIgnoreKeywords = [
  "微信支付",
  "支付宝",
  "付款成功",
  "支付成功",
  "收款成功",
  "交易成功",
  "账单详情",
  "账单明细",
  "支付详情",
  "交易详情",
  "信用卡",
  "银行卡",
  "数字人民币",
  "云闪付",
  "立即付款",
  "完成",
];
const receiptIncomeKeywords = ["收款成功", "到账", "收入", "转入", "入账", "退款成功", "微信零钱到账", "支付宝到账"];
const receiptExpenseKeywords = ["付款成功", "支付成功", "消费", "支出", "付款给", "向商家付款", "买单"];

const accountTypeLabelMap = {
  cash: "现金",
  debit: "储蓄卡",
  credit: "信用卡",
  wallet: "电子钱包",
  other: "其他",
};

const dom = {
  appViews: [...document.querySelectorAll("[data-app-view]")],
  appViewButtons: [...document.querySelectorAll("[data-app-view-target]")],
  appNavButtons: [...document.querySelectorAll(".app-nav-button")],
  installHint: document.querySelector("#installHint"),
  reminderStrip: document.querySelector("#reminderStrip"),
  reminderTitle: document.querySelector("#reminderTitle"),
  reminderText: document.querySelector("#reminderText"),
  reminderFocusButton: document.querySelector("#reminderFocusButton"),
  dismissReminderButton: document.querySelector("#dismissReminderButton"),
  monthExpense: document.querySelector("#monthExpense"),
  monthIncome: document.querySelector("#monthIncome"),
  monthBudgetLeft: document.querySelector("#monthBudgetLeft"),
  yearExpense: document.querySelector("#yearExpense"),
  yearIncome: document.querySelector("#yearIncome"),
  yearNet: document.querySelector("#yearNet"),
  smartTextInput: document.querySelector("#smartTextInput"),
  smartCommitButton: document.querySelector("#smartCommitButton"),
  smartClearButton: document.querySelector("#smartClearButton"),
  smartExamples: document.querySelector("#smartExamples"),
  parserPreview: document.querySelector("#parserPreview"),
  presetGrid: document.querySelector("#presetGrid"),
  monthlyBudgetInput: document.querySelector("#monthlyBudgetInput"),
  saveBudgetButton: document.querySelector("#saveBudgetButton"),
  budgetProgressLabel: document.querySelector("#budgetProgressLabel"),
  budgetProgressValue: document.querySelector("#budgetProgressValue"),
  budgetProgressFill: document.querySelector("#budgetProgressFill"),
  budgetForecast: document.querySelector("#budgetForecast"),
  entryModeHint: document.querySelector("#entryModeHint"),
  entryForm: document.querySelector("#entryForm"),
  resetForm: document.querySelector("#resetForm"),
  entrySubmitButton: document.querySelector("#entrySubmitButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  amountInput: document.querySelector("#amountInput"),
  entryDateInput: document.querySelector("#entryDateInput"),
  noteInput: document.querySelector("#noteInput"),
  tagsInput: document.querySelector("#tagsInput"),
  categoryChips: document.querySelector("#categoryChips"),
  accountSelect: document.querySelector("#accountSelect"),
  typeButtons: [...document.querySelectorAll("[data-type]")],
  categoryForm: document.querySelector("#categoryForm"),
  categoryLabelInput: document.querySelector("#categoryLabelInput"),
  categoryIconInput: document.querySelector("#categoryIconInput"),
  categoryTypeInput: document.querySelector("#categoryTypeInput"),
  categoryKeywordsInput: document.querySelector("#categoryKeywordsInput"),
  categoryList: document.querySelector("#categoryList"),
  accountForm: document.querySelector("#accountForm"),
  accountNameInput: document.querySelector("#accountNameInput"),
  accountBankInput: document.querySelector("#accountBankInput"),
  accountIconInput: document.querySelector("#accountIconInput"),
  accountTypeInput: document.querySelector("#accountTypeInput"),
  accountKeywordsInput: document.querySelector("#accountKeywordsInput"),
  accountList: document.querySelector("#accountList"),
  templateForm: document.querySelector("#templateForm"),
  templateNameInput: document.querySelector("#templateNameInput"),
  templateTypeInput: document.querySelector("#templateTypeInput"),
  templateAmountInput: document.querySelector("#templateAmountInput"),
  templateCategoryInput: document.querySelector("#templateCategoryInput"),
  templateAccountInput: document.querySelector("#templateAccountInput"),
  templateTagsInput: document.querySelector("#templateTagsInput"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  downloadTransferButton: document.querySelector("#downloadTransferButton"),
  copyJsonBackupButton: document.querySelector("#copyJsonBackupButton"),
  importClipboardButton: document.querySelector("#importClipboardButton"),
  importJsonButton: document.querySelector("#importJsonButton"),
  shareJsonButton: document.querySelector("#shareJsonButton"),
  restoreSnapshotButton: document.querySelector("#restoreSnapshotButton"),
  carryoverButton: document.querySelector("#carryoverButton"),
  backupStatus: document.querySelector("#backupStatus"),
  backupHealth: document.querySelector("#backupHealth"),
  backupReminderSelect: document.querySelector("#backupReminderSelect"),
  reminderControls: [...document.querySelectorAll("[data-reminder-key]")],
  reminderStatus: document.querySelector("#reminderStatus"),
  copyReminderGuide: document.querySelector("#copyReminderGuide"),
  downloadReminderGuide: document.querySelector("#downloadReminderGuide"),
  openReminderShortcutCreate: document.querySelector("#openReminderShortcutCreate"),
  ocrShortcutName: document.querySelector("#ocrShortcutName"),
  copyOcrAutoLink: document.querySelector("#copyOcrAutoLink"),
  copyOcrPreviewLink: document.querySelector("#copyOcrPreviewLink"),
  downloadOcrGuide: document.querySelector("#downloadOcrGuide"),
  ocrStatus: document.querySelector("#ocrStatus"),
  templateList: document.querySelector("#templateList"),
  jsonFileInput: document.querySelector("#jsonFileInput"),
  shortcutAmount: document.querySelector("#shortcutAmount"),
  shortcutCategory: document.querySelector("#shortcutCategory"),
  shortcutAccount: document.querySelector("#shortcutAccount"),
  shortcutNote: document.querySelector("#shortcutNote"),
  shortcutName: document.querySelector("#shortcutName"),
  copyShortcutLink: document.querySelector("#copyShortcutLink"),
  copyVoiceTemplate: document.querySelector("#copyVoiceTemplate"),
  openShortcutCreate: document.querySelector("#openShortcutCreate"),
  copyRunShortcutUrl: document.querySelector("#copyRunShortcutUrl"),
  downloadShortcutGuide: document.querySelector("#downloadShortcutGuide"),
  shortcutStatus: document.querySelector("#shortcutStatus"),
  expenseIconBoard: document.querySelector("#expenseIconBoard"),
  incomeIconBoard: document.querySelector("#incomeIconBoard"),
  accountBoard: document.querySelector("#accountBoard"),
  undoBanner: document.querySelector("#undoBanner"),
  undoDeleteText: document.querySelector("#undoDeleteText"),
  undoDeleteButton: document.querySelector("#undoDeleteButton"),
  dismissUndoButton: document.querySelector("#dismissUndoButton"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  monthFilterInput: document.querySelector("#monthFilterInput"),
  entrySearchInput: document.querySelector("#entrySearchInput"),
  entrySortSelect: document.querySelector("#entrySortSelect"),
  pageSizeSelect: document.querySelector("#pageSizeSelect"),
  entryTypeFilters: [...document.querySelectorAll("[data-entry-type-filter]")],
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  tagFilterStrip: document.querySelector("#tagFilterStrip"),
  filterSummary: document.querySelector("#filterSummary"),
  insightsSummary: document.querySelector("#insightsSummary"),
  entries: document.querySelector("#entries"),
  pager: document.querySelector("#pager"),
  prevPageButton: document.querySelector("#prevPageButton"),
  nextPageButton: document.querySelector("#nextPageButton"),
  pageSummary: document.querySelector("#pageSummary"),
  exportCsv: document.querySelector("#exportCsv"),
  seedDemo: document.querySelector("#seedDemo"),
  toast: document.querySelector("#toast"),
};

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
});

let state = {
  settings: createDefaultSettings(),
  entries: [],
  editingEntryId: null,
  undoDeletion: null,
  editingTemplateId: null,
};

const runtime = {
  dbPromise: null,
  storageDriver: "localStorage",
  autoSnapshotTimer: 0,
  reloadingForUpdate: false,
};

function createDefaultBackupMeta() {
  return {
    baselineAt: "",
    importedAt: "",
    lastDataChangeAt: "",
    changeCountSinceBackup: 0,
    lastReminderAt: "",
    lastLocalSnapshotAt: "",
    localSnapshotCount: 0,
  };
}

function createDefaultReminderSettings() {
  return {
    lunchEnabled: true,
    lunchTime: REMINDER_SLOT_PRESETS.lunch.defaultTime,
    dinnerEnabled: true,
    dinnerTime: REMINDER_SLOT_PRESETS.dinner.defaultTime,
    nightEnabled: true,
    nightTime: REMINDER_SLOT_PRESETS.night.defaultTime,
    lastDismissedOn: "",
    lastToastKey: "",
  };
}

function normalizeBackupMeta(meta) {
  return {
    baselineAt: String(meta?.baselineAt || ""),
    importedAt: String(meta?.importedAt || ""),
    lastDataChangeAt: String(meta?.lastDataChangeAt || ""),
    changeCountSinceBackup: Math.max(0, Number(meta?.changeCountSinceBackup) || 0),
    lastReminderAt: String(meta?.lastReminderAt || ""),
    lastLocalSnapshotAt: String(meta?.lastLocalSnapshotAt || ""),
    localSnapshotCount: Math.max(0, Number(meta?.localSnapshotCount) || 0),
  };
}

function normalizeReminderSettings(reminders) {
  return {
    lunchEnabled: reminders?.lunchEnabled !== false,
    lunchTime: normalizeReminderTime(reminders?.lunchTime, REMINDER_SLOT_PRESETS.lunch.defaultTime),
    dinnerEnabled: reminders?.dinnerEnabled !== false,
    dinnerTime: normalizeReminderTime(reminders?.dinnerTime, REMINDER_SLOT_PRESETS.dinner.defaultTime),
    nightEnabled: reminders?.nightEnabled !== false,
    nightTime: normalizeReminderTime(reminders?.nightTime, REMINDER_SLOT_PRESETS.night.defaultTime),
    lastDismissedOn: String(reminders?.lastDismissedOn || ""),
    lastToastKey: String(reminders?.lastToastKey || ""),
  };
}

function normalizeReminderTime(value, fallback) {
  return /^\d{2}:\d{2}$/.test(String(value || "")) ? String(value) : fallback;
}

async function boot() {
  await migrateLegacyData();
  state.settings = await loadSettings();
  state.entries = await loadEntries();
  await syncLocalSnapshotMeta();
  ensureSelectionIntegrity();
  bindEvents();
  renderStaticCollections();
  renderAll();
  applyLaunchQuery();
  updateInstallHint();
  registerServiceWorker();
  maybeShowBackupReminder({ delay: 900 });
  maybeShowEntryReminder({ delay: 1200 });
}

function createDefaultSettings() {
  return {
    activeView: "home",
    monthlyBudget: 0,
    backupReminderDays: 7,
    backupMeta: createDefaultBackupMeta(),
    reminders: createDefaultReminderSettings(),
    customCategories: [],
    customAccounts: [],
    templates: [],
    activeType: localStorage.getItem(LEGACY_TYPE_KEY) || "expense",
    activeCategoryKey: localStorage.getItem(LEGACY_CATEGORY_KEY) || "breakfast",
    activeAccountId: "cash",
    selectedMonth: getMonthKey(new Date()),
    searchQuery: "",
    entryTypeFilter: "all",
    activeTagFilter: "",
    entrySort: "newest",
    pageSize: 12,
    currentPage: 1,
  };
}

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openLedgerDatabase() {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null);
  }

  if (!runtime.dbPromise) {
    runtime.dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(LEDGER_DB_NAME, LEDGER_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LEDGER_KV_STORE)) {
          db.createObjectStore(LEDGER_KV_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        runtime.storageDriver = "IndexedDB";
        resolve(db);
      };
      request.onerror = () => {
        runtime.storageDriver = "localStorage";
        resolve(null);
      };
    });
  }

  return runtime.dbPromise;
}

async function idbGetValue(key) {
  const db = await openLedgerDatabase();
  if (!db) {
    return null;
  }

  return await new Promise((resolve) => {
    const transaction = db.transaction(LEDGER_KV_STORE, "readonly");
    const request = transaction.objectStore(LEDGER_KV_STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => resolve(null);
  });
}

async function idbSetValue(key, value) {
  const db = await openLedgerDatabase();
  if (!db) {
    return false;
  }

  return await new Promise((resolve) => {
    const transaction = db.transaction(LEDGER_KV_STORE, "readwrite");
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.objectStore(LEDGER_KV_STORE).put(value, key);
  });
}

async function loadSettings() {
  const storedSettings = (await idbGetValue(IDB_SETTINGS_KEY)) || readLocalJson(SETTINGS_STORAGE_KEY, null);
  if (storedSettings) {
    void idbSetValue(IDB_SETTINGS_KEY, storedSettings);
  }
  return normalizeSettings({ ...createDefaultSettings(), ...(storedSettings || {}) });
}

function normalizeSettings(settings) {
  return {
    activeView: APP_VIEWS.includes(settings.activeView) ? settings.activeView : "home",
    monthlyBudget: Number(settings.monthlyBudget) || 0,
    backupReminderDays: BACKUP_REMINDER_OPTIONS.includes(Number(settings.backupReminderDays)) ? Number(settings.backupReminderDays) : 7,
    backupMeta: normalizeBackupMeta(settings.backupMeta),
    reminders: normalizeReminderSettings(settings.reminders),
    customCategories: Array.isArray(settings.customCategories) ? settings.customCategories.filter(Boolean) : [],
    customAccounts: Array.isArray(settings.customAccounts) ? settings.customAccounts.filter(Boolean) : [],
    templates: Array.isArray(settings.templates)
      ? settings.templates.map((template) => ({
          ...template,
          tags: normalizeTags(template.tags || []),
        }))
      : [],
    activeType: settings.activeType === "income" ? "income" : "expense",
    activeCategoryKey: settings.activeCategoryKey || "breakfast",
    activeAccountId: settings.activeAccountId || "cash",
    selectedMonth: /^\d{4}-\d{2}$/.test(settings.selectedMonth || "") ? settings.selectedMonth : getMonthKey(new Date()),
    searchQuery: String(settings.searchQuery || ""),
    entryTypeFilter: ["all", "expense", "income"].includes(settings.entryTypeFilter) ? settings.entryTypeFilter : "all",
    activeTagFilter: String(settings.activeTagFilter || ""),
    entrySort: ["newest", "oldest", "amount-desc", "amount-asc"].includes(settings.entrySort) ? settings.entrySort : "newest",
    pageSize: [8, 12, 24].includes(Number(settings.pageSize)) ? Number(settings.pageSize) : 12,
    currentPage: Math.max(1, Number(settings.currentPage) || 1),
  };
}

function normalizeEntryRecords(entries) {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        ...entry,
        id: entry.id || crypto.randomUUID(),
        amount: Number(entry.amount) || 0,
        tags: normalizeTags(entry.tags || []),
        createdAt: entry.createdAt || new Date().toISOString(),
      }))
    : [];
}

async function loadEntries() {
  const storedEntries = await idbGetValue(IDB_ENTRIES_KEY);
  if (Array.isArray(storedEntries)) {
    return normalizeEntryRecords(storedEntries);
  }

  const localEntries = readLocalJson(ENTRY_STORAGE_KEY, []);
  if (Array.isArray(localEntries) && localEntries.length) {
    void idbSetValue(IDB_ENTRIES_KEY, localEntries);
  }
  return normalizeEntryRecords(localEntries);
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
  } catch {}
  void idbSetValue(IDB_SETTINGS_KEY, state.settings);
}

function persistEntries() {
  void idbSetValue(IDB_ENTRIES_KEY, state.entries);
  tryPersistEntryMirror();
}

function tryPersistEntryMirror() {
  try {
    const raw = JSON.stringify(state.entries);
    if (backupCore.getTextByteLength(raw) <= ENTRY_LOCAL_MIRROR_SOFT_LIMIT) {
      localStorage.setItem(ENTRY_STORAGE_KEY, raw);
    }
  } catch {}
}

function readLocalJson(storageKey, fallbackValue) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

async function migrateLegacyData() {
  if (!(await idbGetValue(IDB_SETTINGS_KEY))) {
    const storedSettings = readLocalJson(SETTINGS_STORAGE_KEY, null);
    await idbSetValue(IDB_SETTINGS_KEY, storedSettings || createDefaultSettings());
  }

  if (!Array.isArray(await idbGetValue(IDB_ENTRIES_KEY))) {
    let entries = readLocalJson(ENTRY_STORAGE_KEY, null);
    if (!Array.isArray(entries) || !entries.length) {
      const legacyEntries = readLocalJson(LEGACY_ENTRY_STORAGE_KEY, []);
      if (Array.isArray(legacyEntries) && legacyEntries.length) {
        entries = legacyEntries.map((entry) => ({
          id: entry.id || crypto.randomUUID(),
          amount: Number(entry.amount) || 0,
          note: entry.note || getCategoryByKey(entry.category)?.label || "迁移记录",
          categoryKey: entry.category || "other-expense",
          type: entry.type === "income" ? "income" : "expense",
          accountId: "cash",
          tags: normalizeTags(entry.tags || []),
          source: entry.source || "legacy",
          createdAt: entry.createdAt || new Date().toISOString(),
        }));
      }
    }
    await idbSetValue(IDB_ENTRIES_KEY, Array.isArray(entries) ? entries : []);
  }
}

function getCategories(type) {
  const all = [...builtInCategories, ...state.settings.customCategories];
  return type ? all.filter((category) => category.type === type) : all;
}

function getCategoryByKey(key) {
  return getCategories().find((category) => category.key === key);
}

function getAccounts() {
  return [...builtInAccounts, ...state.settings.customAccounts];
}

function getAccountById(id) {
  return getAccounts().find((account) => account.id === id);
}

function ensureSelectionIntegrity() {
  if (!APP_VIEWS.includes(state.settings.activeView)) {
    state.settings.activeView = "home";
  }

  if (!["expense", "income"].includes(state.settings.activeType)) {
    state.settings.activeType = "expense";
  }

  const allowedCategories = getCategories(state.settings.activeType);
  if (!allowedCategories.some((category) => category.key === state.settings.activeCategoryKey)) {
    state.settings.activeCategoryKey = allowedCategories[0]?.key || "other-expense";
  }

  if (!getAccounts().some((account) => account.id === state.settings.activeAccountId)) {
    state.settings.activeAccountId = getAccounts()[0]?.id || "cash";
  }

  persistSettings();
}

function bindEvents() {
  dom.appViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.appViewTarget);
    });
  });

  dom.smartTextInput.addEventListener("input", renderParserPreview);
  dom.smartCommitButton.addEventListener("click", handleSmartCommit);
  dom.smartClearButton.addEventListener("click", () => {
    dom.smartTextInput.value = "";
    renderParserPreview();
  });
  dom.reminderFocusButton.addEventListener("click", focusSmartComposer);
  dom.dismissReminderButton.addEventListener("click", dismissReminderForToday);

  dom.smartExamples.addEventListener("click", (event) => {
    const button = event.target.closest("[data-example]");
    if (!button) {
      return;
    }
    dom.smartTextInput.value = button.dataset.example;
    renderParserPreview();
  });

  dom.presetGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (!button) {
      return;
    }
    const preset = presets[Number(button.dataset.preset)];
    commitAndRender({
      amount: preset.amount,
      note: preset.note,
      categoryKey: preset.categoryKey,
      type: "expense",
      accountId: state.settings.activeAccountId,
      source: "preset",
    });
  });

  dom.typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.activeType = button.dataset.type;
      ensureSelectionIntegrity();
      persistSettings();
      renderFormControls();
    });
  });

  dom.categoryChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-key]");
    if (!button) {
      return;
    }
    state.settings.activeCategoryKey = button.dataset.categoryKey;
    persistSettings();
    renderCategoryChips();
  });

  dom.accountSelect.addEventListener("change", () => {
    state.settings.activeAccountId = dom.accountSelect.value;
    persistSettings();
    renderPresetButtons();
  });

  dom.monthFilterInput.addEventListener("change", () => {
    state.settings.selectedMonth = dom.monthFilterInput.value || getMonthKey(new Date());
    state.settings.currentPage = 1;
    persistSettings();
    renderAll();
  });

  dom.entrySearchInput.addEventListener("input", () => {
    state.settings.searchQuery = dom.entrySearchInput.value.trim();
    state.settings.currentPage = 1;
    persistSettings();
    renderAll();
  });

  dom.entrySortSelect.addEventListener("change", () => {
    state.settings.entrySort = dom.entrySortSelect.value;
    state.settings.currentPage = 1;
    persistSettings();
    renderAll();
  });

  dom.pageSizeSelect.addEventListener("change", () => {
    state.settings.pageSize = Number(dom.pageSizeSelect.value) || 12;
    state.settings.currentPage = 1;
    persistSettings();
    renderAll();
  });

  dom.entryTypeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.entryTypeFilter = button.dataset.entryTypeFilter;
      state.settings.currentPage = 1;
      persistSettings();
      renderAll();
    });
  });

  dom.prevMonthButton.addEventListener("click", () => shiftSelectedMonth(-1));
  dom.nextMonthButton.addEventListener("click", () => shiftSelectedMonth(1));
  dom.clearFiltersButton.addEventListener("click", clearEntryFilters);
  dom.tagFilterStrip.addEventListener("click", handleTagFilterClick);
  dom.prevPageButton.addEventListener("click", () => changePage(-1));
  dom.nextPageButton.addEventListener("click", () => changePage(1));

  dom.entryForm.addEventListener("submit", handleManualSubmit);
  dom.cancelEditButton.addEventListener("click", cancelEditing);

  dom.resetForm.addEventListener("click", () => {
    cancelEditing({ resetSelection: true });
  });

  dom.saveBudgetButton.addEventListener("click", saveBudget);
  dom.monthlyBudgetInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveBudget();
    }
  });
  dom.reminderControls.forEach((control) => {
    control.addEventListener("change", handleReminderConfigChange);
  });

  dom.categoryForm.addEventListener("submit", handleCategoryCreate);
  dom.accountForm.addEventListener("submit", handleAccountCreate);
  dom.templateForm.addEventListener("submit", handleTemplateSave);
  dom.templateTypeInput.addEventListener("change", renderTemplateOptions);
  dom.templateList.addEventListener("click", handleTemplateAction);
  dom.exportJsonButton.addEventListener("click", exportJsonBackup);
  dom.downloadTransferButton.addEventListener("click", downloadTransferBackup);
  dom.copyJsonBackupButton.addEventListener("click", copyJsonBackup);
  dom.importClipboardButton.addEventListener("click", importClipboardBackup);
  dom.importJsonButton.addEventListener("click", () => dom.jsonFileInput.click());
  dom.shareJsonButton.addEventListener("click", shareJsonBackup);
  dom.restoreSnapshotButton.addEventListener("click", restoreLatestSnapshot);
  dom.jsonFileInput.addEventListener("change", importJsonBackup);
  dom.backupReminderSelect.addEventListener("change", handleBackupReminderChange);
  dom.carryoverButton.addEventListener("click", createMonthlyCarryover);

  dom.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-category]");
    if (!button) {
      return;
    }
    deleteCustomCategory(button.dataset.deleteCategory);
  });

  dom.accountList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-account]");
    if (deleteButton) {
      deleteCustomAccount(deleteButton.dataset.deleteAccount);
      return;
    }

    const pickButton = event.target.closest("[data-pick-account]");
    if (!pickButton) {
      return;
    }

    state.settings.activeAccountId = pickButton.dataset.pickAccount;
    ensureSelectionIntegrity();
    persistSettings();
    renderFormControls();
    showToast("默认账户已切换");
  });

  dom.copyShortcutLink.addEventListener("click", copyShortcutUrl);
  dom.copyVoiceTemplate.addEventListener("click", copyVoiceShortcutTemplate);
  dom.openShortcutCreate.addEventListener("click", openShortcutCreatePage);
  dom.copyRunShortcutUrl.addEventListener("click", copyRunShortcutUrl);
  dom.downloadShortcutGuide.addEventListener("click", downloadShortcutGuide);
  dom.copyReminderGuide.addEventListener("click", copyReminderGuide);
  dom.downloadReminderGuide.addEventListener("click", downloadReminderGuide);
  dom.openReminderShortcutCreate.addEventListener("click", openShortcutCreatePage);
  dom.copyOcrAutoLink.addEventListener("click", copyOcrAutoLink);
  dom.copyOcrPreviewLink.addEventListener("click", copyOcrPreviewLink);
  dom.downloadOcrGuide.addEventListener("click", downloadOcrGuide);
  dom.exportCsv.addEventListener("click", exportCsv);
  dom.seedDemo.addEventListener("click", seedDemoEntries);

  dom.entries.addEventListener("click", handleEntryAction);
  dom.undoDeleteButton.addEventListener("click", undoDelete);
  dom.dismissUndoButton.addEventListener("click", clearUndoDeletion);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      renderReminderStrip();
      renderAutomationPanel();
      maybeShowBackupReminder({ delay: 400 });
      maybeShowEntryReminder({ delay: 700 });
    }
  });
}

function renderStaticCollections() {
  renderSmartExamples();
  renderPresetButtons();
}

function renderAll() {
  ensureSelectionIntegrity();
  renderAppViews();
  renderSummary();
  renderReminderStrip();
  renderBudget();
  renderBackupPanel();
  renderFormControls();
  renderEntryMode();
  renderManageLists();
  renderTemplateOptions();
  renderTemplateList();
  renderShortcuts();
  renderAutomationPanel();
  renderFilters();
  renderVisualBoards();
  renderUndoBanner();
  renderEntries();
  renderPager();
  renderParserPreview();
}

function renderAppViews() {
  dom.appViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.appView === state.settings.activeView);
  });

  dom.appNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.appViewTarget === state.settings.activeView);
  });
}

function setActiveView(view, options = {}) {
  if (!APP_VIEWS.includes(view)) {
    return;
  }

  const { scroll = true } = options;
  state.settings.activeView = view;
  persistSettings();
  renderAppViews();

  if (scroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderSummary() {
  const monthEntries = getCurrentMonthEntries();
  const yearEntries = getCurrentYearEntries();
  const monthExpense = sumEntries(monthEntries, "expense");
  const monthIncome = sumEntries(monthEntries, "income");
  const yearExpense = sumEntries(yearEntries, "expense");
  const yearIncome = sumEntries(yearEntries, "income");
  const budgetLeft = state.settings.monthlyBudget ? state.settings.monthlyBudget - monthExpense : 0;

  dom.monthExpense.textContent = currency.format(monthExpense);
  dom.monthIncome.textContent = currency.format(monthIncome);
  dom.monthBudgetLeft.textContent = state.settings.monthlyBudget ? currency.format(budgetLeft) : "未设置";
  dom.yearExpense.textContent = currency.format(yearExpense);
  dom.yearIncome.textContent = currency.format(yearIncome);
  dom.yearNet.textContent = currency.format(yearIncome - yearExpense);
}

function renderReminderStrip() {
  const signal = getEntryReminderSignal();
  if (!signal) {
    dom.reminderStrip.hidden = true;
    dom.reminderStrip.className = "reminder-strip";
    return;
  }

  dom.reminderStrip.hidden = false;
  dom.reminderStrip.className = `reminder-strip reminder-strip--${signal.level}`;
  dom.reminderTitle.textContent = signal.title;
  dom.reminderText.textContent = signal.summary;
}

function renderBudget() {
  dom.monthlyBudgetInput.value = state.settings.monthlyBudget || "";
  const monthExpense = sumEntries(getCurrentMonthEntries(), "expense");
  const budget = state.settings.monthlyBudget;

  if (!budget) {
    dom.budgetProgressLabel.textContent = "还没设置预算";
    dom.budgetProgressValue.textContent = "0%";
    dom.budgetProgressFill.style.width = "0%";
    dom.budgetProgressFill.classList.remove("is-danger");
    dom.budgetForecast.textContent = "设置后会显示本月剩余和按当前速度的月末预测。";
    return;
  }

  const progress = Math.max(0, Math.min((monthExpense / budget) * 100, 100));
  const remaining = budget - monthExpense;
  const forecast = getMonthForecast(monthExpense);
  dom.budgetProgressLabel.textContent = remaining >= 0 ? `预算还剩 ${currency.format(remaining)}` : `预算超出 ${currency.format(Math.abs(remaining))}`;
  dom.budgetProgressValue.textContent = `${Math.round((monthExpense / budget) * 100)}%`;
  dom.budgetProgressFill.style.width = `${progress}%`;
  dom.budgetProgressFill.classList.toggle("is-danger", remaining < 0);
  dom.budgetForecast.textContent = `本月已支出 ${currency.format(monthExpense)}。照当前速度，月末大约会到 ${currency.format(forecast)}。`;
}

function renderBackupPanel() {
  const insight = getBackupInsight();
  const backupMeta = normalizeBackupMeta(state.settings.backupMeta);
  const hasLedgerData = hasMeaningfulLedgerData();
  dom.backupReminderSelect.value = String(state.settings.backupReminderDays);
  dom.backupHealth.className = `backup-health backup-health--${insight.level}`;
  dom.backupHealth.innerHTML = `
    <strong>${escapeHtml(insight.title)}</strong>
    <span>${escapeHtml(insight.summary)}</span>
  `;
  dom.backupStatus.innerHTML = insight.details.map((line) => escapeHtml(line)).join("<br />");
  dom.exportJsonButton.disabled = !hasLedgerData;
  dom.downloadTransferButton.disabled = !hasLedgerData;
  dom.copyJsonBackupButton.disabled = !hasLedgerData;
  dom.shareJsonButton.disabled = !hasLedgerData;
  dom.restoreSnapshotButton.disabled = backupMeta.localSnapshotCount <= 0;
}

function getBackupInsight() {
  const meta = normalizeBackupMeta(state.settings.backupMeta);
  const reminderDays = state.settings.backupReminderDays;
  const changeCount = meta.changeCountSinceBackup;
  const hasBaseline = Boolean(meta.baselineAt);
  const daysSinceBackup = hasBaseline ? getElapsedDays(meta.baselineAt) : null;
  const standalone = isStandaloneMode();
  const hasLedgerData = hasMeaningfulLedgerData();
  const backupSizeBytes = hasLedgerData
    ? backupCore.getTextByteLength(backupCore.serializeBackupPayload(createBackupPayload(meta.baselineAt || new Date().toISOString()), false))
    : 0;
  const overdueByAge = Boolean(reminderDays && hasBaseline && daysSinceBackup >= reminderDays);
  const severeAge = Boolean(reminderDays && hasBaseline && daysSinceBackup >= reminderDays * 2);
  const severeChanges = changeCount >= 12;
  const warningChanges = changeCount >= 5;

  let level = "safe";
  let title = "备份状态稳定";
  let summary = "最近一份 JSON 备份还算新，暂时不用着急。";

  if (!hasLedgerData) {
    level = "idle";
    title = "还没有账本数据";
    summary = standalone
      ? "主屏幕版现在还是一份空白本地账本。如果 Safari 里有旧数据，优先用“下载压缩”或“导入文件”迁过来。"
      : "等你开始记账后，这里会提醒你导出一份 JSON 备份。";
  } else if (!hasBaseline) {
    level = "danger";
    title = "还没做过 JSON 备份";
    summary = state.entries.length
      ? `已经有 ${state.entries.length} 笔记录，建议现在导出到 iCloud Drive。`
      : "已经有模板或自定义配置，建议现在导出一份备份。";
  } else if (severeAge || severeChanges) {
    level = "danger";
    title = "备份已经偏旧";
    summary = `最近一份备份距今 ${formatElapsedDays(daysSinceBackup)}，备份后又改了 ${changeCount} 次。`;
  } else if (overdueByAge || warningChanges) {
    level = "warning";
    title = "建议补一份新备份";
    summary = overdueByAge
      ? `最近一份备份已经是 ${formatElapsedDays(daysSinceBackup)} 前的，顺手再导出一份更稳。`
      : `最近一份备份后已经有 ${changeCount} 次变更，方便时导出一份。`;
  } else if (changeCount > 0) {
    level = "warning";
    title = "备份仍可用";
    summary = `最近一份备份后又改了 ${changeCount} 次，等会儿顺手导出一份就行。`;
  }

  const details = [
    `当前运行环境：${standalone ? "主屏幕 App" : "Safari / 浏览器"}`,
    `当前主存储：${runtime.storageDriver}${runtime.storageDriver === "IndexedDB" ? "（大账本模式）" : "（兼容回退）"}`,
    hasBaseline ? `最近一份备份时间：${formatFullDate(meta.baselineAt)}（${formatElapsedDays(daysSinceBackup)}）` : "最近一份备份时间：还没有",
    hasBaseline ? `备份后新增 / 修改：${changeCount} 次` : `当前记录数：${state.entries.length} 笔`,
    hasLedgerData ? `当前账本体积：约 ${backupCore.formatByteSize(backupSizeBytes)}` : "当前账本体积：还没有账本数据",
    meta.localSnapshotCount
      ? `本机快照：${meta.localSnapshotCount} 份，最近一份在 ${formatFullDate(meta.lastLocalSnapshotAt)}`
      : "本机快照：还没有，导入前会自动保一份，日常改动也会按节奏自动留存",
    meta.importedAt ? `最近一次导入：${formatFullDate(meta.importedAt)}` : "最近一次导入：还没有",
    reminderDays ? `提醒频率：每 ${reminderDays} 天检查一次` : "提醒频率：已关闭主动提醒",
    "iPhone 上 Safari 和主屏幕版默认不共享这份本地数据；剪贴板只适合少量迁移。",
    "大数据迁移优先走“下载压缩”或“系统分享” -> “导入文件”；文件导入同时支持 JSON 和压缩备份文本。",
  ];

  return { level, title, summary, details };
}

function renderSmartExamples() {
  dom.smartExamples.innerHTML = smartExamples
    .map((example) => `<button class="example-chip" type="button" data-example="${escapeHtml(example)}">${escapeHtml(example)}</button>`)
    .join("");
}

function renderPresetButtons() {
  const account = getAccountById(state.settings.activeAccountId);
  dom.presetGrid.innerHTML = presets
    .map((preset, index) => {
      const category = getCategoryByKey(preset.categoryKey);
      return `
        <button class="preset-button" type="button" data-preset="${index}">
          <strong>${escapeHtml(category?.icon || "🧾")} ${escapeHtml(preset.label)} ${currency.format(preset.amount)}</strong>
          <span>${escapeHtml(account?.name || "当前账户")} · 直接落账</span>
        </button>
      `;
    })
    .join("");
}

function renderParserPreview() {
  const text = dom.smartTextInput.value.trim();
  if (!text) {
    dom.parserPreview.textContent = "输入一句中文消费文本后，这里会显示识别结果。";
    return;
  }

  const parsed = parseEntryText(text);
  if (!parsed.amount) {
    dom.parserPreview.innerHTML = `<strong>暂时还没认出金额。</strong> 试试类似“咖啡18 支付宝”，或直接粘贴支付截图 OCR 文字。`;
    return;
  }

  const category = getCategoryByKey(parsed.categoryKey);
  const account = getAccountById(parsed.accountId);
  dom.parserPreview.innerHTML = `
    <strong>${parsed.type === "expense" ? "支出" : "收入"}</strong>
    · ${currency.format(parsed.amount)}
    · ${escapeHtml(category?.icon || "🧾")} ${escapeHtml(category?.label || "未分类")}
    · ${escapeHtml(account?.icon || "💳")} ${escapeHtml(account?.name || "默认账户")}
    ${parsed.tags?.length ? ` · 标签 ${parsed.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}` : ""}
    <br />
    备注会保存为：${escapeHtml(parsed.note)}
  `;
}

function renderFormControls() {
  renderTypeToggle();
  renderCategoryChips();
  renderAccountOptions();
  renderPresetButtons();
  if (!state.editingEntryId && !dom.entryDateInput.value) {
    dom.entryDateInput.value = formatDateTimeLocal(new Date());
  }
}

function renderEntryMode() {
  const editingEntry = state.entries.find((entry) => entry.id === state.editingEntryId);
  const category = editingEntry ? getCategoryByKey(editingEntry.categoryKey) : null;
  dom.entrySubmitButton.textContent = editingEntry ? "保存修改" : "记这一笔";
  dom.cancelEditButton.hidden = !editingEntry;
  dom.entryModeHint.innerHTML = editingEntry
    ? `当前正在编辑：<strong>${escapeHtml(category?.label || "记录")} ${currency.format(editingEntry.amount)}</strong>。保存后会覆盖原记录。`
    : "当前是新建模式。点下面任意记录的“编辑”可以把它带回表单修改。";
}

function renderUndoBanner() {
  const undo = state.undoDeletion;
  if (!undo) {
    dom.undoBanner.hidden = true;
    dom.undoDeleteText.textContent = "";
    return;
  }

  const category = getCategoryByKey(undo.entry.categoryKey);
  dom.undoBanner.hidden = false;
  dom.undoDeleteText.textContent = `刚删除了 ${category?.label || "一条记录"} ${currency.format(undo.entry.amount)}，还可以撤销。`;
}

function renderTypeToggle() {
  dom.typeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.type === state.settings.activeType);
  });
}

function renderCategoryChips() {
  const categories = getCategories(state.settings.activeType);
  dom.categoryChips.innerHTML = categories
    .map(
      (category) => `
        <button
          class="chip ${category.key === state.settings.activeCategoryKey ? "is-selected" : ""}"
          type="button"
          data-category-key="${escapeHtml(category.key)}"
        >
          ${escapeHtml(category.icon)} ${escapeHtml(category.label)}
        </button>
      `
    )
    .join("");
}

function renderAccountOptions() {
  const accounts = getAccounts();
  dom.accountSelect.innerHTML = accounts
    .map(
      (account) => `
        <option value="${escapeHtml(account.id)}" ${account.id === state.settings.activeAccountId ? "selected" : ""}>
          ${escapeHtml(account.icon)} ${escapeHtml(account.bank ? `${account.bank} ${account.name}` : account.name)}
        </option>
      `
    )
    .join("");
}

function renderManageLists() {
  renderCategoryList();
  renderAccountList();
}

function renderCategoryList() {
  const categories = getCategories();
  dom.categoryList.innerHTML = categories
    .map((category) => {
      const usageCount = state.entries.filter((entry) => entry.categoryKey === category.key).length;
      return `
        <article class="manage-item">
          <div class="manage-icon">${escapeHtml(category.icon)}</div>
          <div class="manage-copy">
            <strong>${escapeHtml(category.label)}</strong>
            <span>${category.type === "expense" ? "支出" : "收入"} · 关键词：${escapeHtml((category.keywords || []).join("、") || "无")} · 已用 ${usageCount} 次</span>
          </div>
          ${
            category.builtIn
              ? `<span class="badge">内置</span>`
              : `<button class="danger-button" type="button" data-delete-category="${escapeHtml(category.key)}">删除</button>`
          }
        </article>
      `;
    })
    .join("");
}

function renderAccountList() {
  const accounts = getAccounts();
  const monthEntries = getCurrentMonthEntries();
  dom.accountList.innerHTML = accounts
    .map((account) => {
      const expense = sumEntries(monthEntries.filter((entry) => entry.accountId === account.id), "expense");
      const income = sumEntries(monthEntries.filter((entry) => entry.accountId === account.id), "income");
      const accountLabel = account.bank ? `${account.bank} ${account.name}` : account.name;
      return `
        <article class="manage-item">
          <div class="manage-icon">${escapeHtml(account.icon)}</div>
          <div class="manage-copy">
            <strong>${escapeHtml(accountLabel)}</strong>
            <span>${escapeHtml(accountTypeLabelMap[account.type] || "账户")} · 本月支出 ${currency.format(expense)} · 本月收入 ${currency.format(income)}</span>
          </div>
          <div class="panel-tools">
            <button class="ghost-button" type="button" data-pick-account="${escapeHtml(account.id)}">设为默认</button>
            ${
              account.builtIn
                ? `<span class="badge">内置</span>`
                : `<button class="danger-button" type="button" data-delete-account="${escapeHtml(account.id)}">删除</button>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTemplateOptions() {
  const templateType = dom.templateTypeInput.value === "income" ? "income" : "expense";
  const categories = getCategories(templateType);
  const accounts = getAccounts();
  const currentCategoryValue = dom.templateCategoryInput.value;
  const currentAccountValue = dom.templateAccountInput.value;

  dom.templateCategoryInput.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category.key)}">${escapeHtml(category.icon)} ${escapeHtml(category.label)}</option>`)
    .join("");

  dom.templateAccountInput.innerHTML = accounts
    .map((account) => {
      const label = account.bank ? `${account.bank} ${account.name}` : account.name;
      return `<option value="${escapeHtml(account.id)}">${escapeHtml(account.icon)} ${escapeHtml(label)}</option>`;
    })
    .join("");

  dom.templateCategoryInput.value = categories.some((category) => category.key === currentCategoryValue)
    ? currentCategoryValue
    : categories[0]?.key || "";
  dom.templateAccountInput.value = accounts.some((account) => account.id === currentAccountValue)
    ? currentAccountValue
    : state.settings.activeAccountId;
}

function renderTemplateList() {
  if (!state.settings.templates.length) {
    dom.templateList.innerHTML = `<div class="empty-state">还没有固定账单模板。你可以先加一个房租、会员费或固定收入。</div>`;
    return;
  }

  dom.templateList.innerHTML = state.settings.templates
    .map((template) => {
      const category = getCategoryByKey(template.categoryKey);
      const account = getAccountById(template.accountId);
      const accountLabel = account ? (account.bank ? `${account.bank} ${account.name}` : account.name) : "默认账户";
      const tags = (template.tags || []).map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`).join("");
      return `
        <article class="manage-item">
          <div class="manage-icon">${escapeHtml(category?.icon || "🧾")}</div>
          <div class="manage-copy">
            <strong>${escapeHtml(template.name)}</strong>
            <span>${template.type === "expense" ? "支出" : "收入"} · ${currency.format(template.amount)} · ${escapeHtml(accountLabel)}</span>
            ${tags ? `<div class="entry-tags">${tags}</div>` : ""}
          </div>
          <div class="panel-tools">
            <button class="ghost-button" type="button" data-use-template="${escapeHtml(template.id)}">入账</button>
            <button class="ghost-button" type="button" data-edit-template="${escapeHtml(template.id)}">编辑</button>
            <button class="danger-button" type="button" data-delete-template="${escapeHtml(template.id)}">删除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderShortcuts() {
  const expenseCategories = getCategories("expense");
  const accounts = getAccounts();

  dom.shortcutCategory.innerHTML = expenseCategories
    .map((category) => `<option value="${escapeHtml(category.key)}">${escapeHtml(category.icon)} ${escapeHtml(category.label)}</option>`)
    .join("");

  dom.shortcutAccount.innerHTML = accounts
    .map((account) => {
      const label = account.bank ? `${account.bank} ${account.name}` : account.name;
      return `<option value="${escapeHtml(account.id)}">${escapeHtml(account.icon)} ${escapeHtml(label)}</option>`;
    })
    .join("");

  dom.shortcutCategory.value = expenseCategories.some((category) => category.key === state.settings.activeCategoryKey)
    ? state.settings.activeCategoryKey
    : expenseCategories[0]?.key || "other-expense";
  dom.shortcutAccount.value = state.settings.activeAccountId;
  if (!dom.shortcutName.value.trim()) {
    dom.shortcutName.value = "Pocket Ledger 一句话记账";
  }
  renderShortcutStatus();
}

function renderShortcutStatus() {
  if (dom.shortcutStatus.dataset.lockedCopy) {
    return;
  }
  dom.shortcutStatus.textContent =
    "快捷指令除了传金额和分类，也可以直接传 `text=瑞幸咖啡18 支付宝` 这类中文文本，让页面自动识别并入账。";
}

function renderAutomationPanel() {
  const reminders = normalizeReminderSettings(state.settings.reminders);
  const enabledSlots = getReminderSlots().filter((slot) => slot.enabled);
  const signal = getEntryReminderSignal();

  dom.reminderControls.forEach((control) => {
    const slotKey = control.dataset.reminderKey;
    const field = control.dataset.reminderField;
    if (!slotKey || !field) {
      return;
    }

    const stateKey = `${slotKey}${field === "enabled" ? "Enabled" : "Time"}`;
    if (control.type === "checkbox") {
      control.checked = Boolean(reminders[stateKey]);
      return;
    }
    control.value = reminders[stateKey];
  });

  if (!dom.reminderStatus.dataset.lockedCopy) {
    dom.reminderStatus.textContent = enabledSlots.length
      ? `当前已开启 ${enabledSlots.length} 个时段：${enabledSlots.map((slot) => `${slot.label} ${slot.time}`).join(" · ")}。页面内会在打开时提醒；真正到点弹出建议按下面模板建 iPhone 快捷指令个人自动化。`
      : "提醒时段已全部关闭。你仍然可以只保留截图 OCR 快捷记账。";
  }

  if (!dom.ocrShortcutName.value.trim()) {
    dom.ocrShortcutName.value = "Pocket Ledger 截图记账";
  }

  if (!dom.ocrStatus.dataset.lockedCopy) {
    dom.ocrStatus.textContent = signal
      ? `${signal.title}。如果你刚付完款，直接截图分享给 OCR 快捷指令，它会自动把金额、商户和支付账户带进来。`
      : "推荐流程：付款截图 -> 分享到快捷指令 -> 提取图片文字 -> 打开页面自动入账。页面会优先识别金额、商户和支付账户。";
  }
}

function getReminderSlots() {
  const reminders = normalizeReminderSettings(state.settings.reminders);
  return Object.entries(REMINDER_SLOT_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    time: reminders[`${key}Time`],
    enabled: Boolean(reminders[`${key}Enabled`]),
  }));
}

function getEntryReminderSignal(now = new Date()) {
  const reminders = normalizeReminderSettings(state.settings.reminders);
  if (reminders.lastDismissedOn === getDayKey(now)) {
    return null;
  }

  const dueSlots = getReminderSlots()
    .filter((slot) => slot.enabled && getMinutesSinceMidnight(now) >= parseTimeToMinutes(slot.time))
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  if (!dueSlots.length) {
    return null;
  }

  const todayEntries = getEntriesForDay(now);
  const todayExpenses = todayEntries.filter((entry) => entry.type === "expense");
  const latestDue = dueSlots[dueSlots.length - 1];
  if (!todayExpenses.length) {
    return {
      key: latestDue.key,
      level: "warning",
      title: "今天还没记支出",
      summary: `${latestDue.label}到了，顺手补一笔就行。也可以直接用截图 OCR 快捷指令。`,
      toast: `${latestDue.label}到了，今天还没记支出`,
    };
  }

  if (latestDue.key === "dinner" && !hasExpenseSinceHour(todayExpenses, 12)) {
    return {
      key: latestDue.key,
      level: "warning",
      title: "下午到晚饭这段还没补",
      summary: "如果刚才用的是微信、支付宝或信用卡，直接写一句话或走截图 OCR 都可以。",
      toast: "晚饭后提醒：下午这段消费可能还没补",
    };
  }

  if (latestDue.key === "night" && (!hasExpenseSinceHour(todayExpenses, 18) || todayExpenses.length < 2)) {
    return {
      key: latestDue.key,
      level: "soft",
      title: "睡前扫一眼今天账单",
      summary: "尤其看下微信、支付宝和信用卡，有漏单就现在补掉，明天更省事。",
      toast: "睡前补账提醒：今天可能还有漏记",
    };
  }

  return null;
}

function getEntriesForDay(dateLike) {
  const dayKey = getDayKey(dateLike);
  return state.entries
    .filter((entry) => getDayKey(entry.createdAt) === dayKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getDayKey(dateLike) {
  const date = new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMinutesSinceMidnight(dateLike) {
  const date = new Date(dateLike);
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeToMinutes(timeString) {
  const [hours, minutes] = String(timeString || "00:00").split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function hasExpenseSinceHour(entries, hour) {
  return entries.some((entry) => new Date(entry.createdAt).getHours() >= hour);
}

function renderFilters() {
  dom.monthFilterInput.value = state.settings.selectedMonth;
  dom.entrySearchInput.value = state.settings.searchQuery;
  dom.entrySortSelect.value = state.settings.entrySort;
  dom.pageSizeSelect.value = String(state.settings.pageSize);

  dom.entryTypeFilters.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.entryTypeFilter === state.settings.entryTypeFilter);
  });

  const availableTagLabels = getPopularTags(getMonthScopedEntries()).map((item) => item.label);
  if (state.settings.activeTagFilter && !availableTagLabels.includes(state.settings.activeTagFilter)) {
    state.settings.activeTagFilter = "";
    persistSettings();
  }

  renderTagFilters();
  renderFilterSummary();
}

function renderTagFilters() {
  const tags = getPopularTags(getMonthScopedEntries());
  if (!tags.length) {
    dom.tagFilterStrip.innerHTML = `<div class="empty-state">这个月还没有标签。你可以在记录里加上 #工作、#差旅 这种标签。</div>`;
    return;
  }

  const allChip = `
    <button class="tag-chip is-clickable ${state.settings.activeTagFilter ? "" : "is-active"}" type="button" data-tag-filter="">
      全部标签
    </button>
  `;

  dom.tagFilterStrip.innerHTML =
    allChip +
    tags
      .map(
        (tag) => `
          <button
            class="tag-chip is-clickable ${state.settings.activeTagFilter === tag.label ? "is-active" : ""}"
            type="button"
            data-tag-filter="${escapeHtml(tag.label)}"
          >
            #${escapeHtml(tag.label)} · ${tag.count}
          </button>
        `
      )
      .join("");
}

function renderFilterSummary() {
  const monthEntries = getMonthScopedEntries();
  const filteredEntries = getFilteredEntries();
  const monthLabel = formatMonthLabel(state.settings.selectedMonth);
  const total = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const parts = [`当前查看 ${monthLabel}`];

  if (state.settings.entryTypeFilter !== "all") {
    parts.push(state.settings.entryTypeFilter === "expense" ? "只看支出" : "只看收入");
  }
  if (state.settings.searchQuery) {
    parts.push(`搜索“${state.settings.searchQuery}”`);
  }
  if (state.settings.activeTagFilter) {
    parts.push(`标签 #${state.settings.activeTagFilter}`);
  }

  parts.push(`共 ${filteredEntries.length} / ${monthEntries.length} 笔`);
  if (filteredEntries.length) {
    parts.push(`金额合计 ${currency.format(total)}`);
  }

  const summaryText = parts.join(" · ");
  dom.filterSummary.textContent = summaryText;
  dom.insightsSummary.textContent = `当前分析基于：${summaryText}`;
}

function renderVisualBoards() {
  const filteredEntries = getFilteredEntries();
  renderIconBoard(dom.expenseIconBoard, aggregateByCategory(filteredEntries.filter((entry) => entry.type === "expense")), "当前筛选下还没有支出记录。");
  renderIconBoard(dom.incomeIconBoard, aggregateByCategory(filteredEntries.filter((entry) => entry.type === "income")), "当前筛选下还没有收入记录。");
  renderAccountBoard();
}

function renderIconBoard(container, items, emptyText) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items
    .slice(0, 6)
    .map((item) => {
      const category = getCategoryByKey(item.key);
      return `
        <article class="icon-item">
          <div class="icon-symbol">${escapeHtml(category?.icon || "🧾")}</div>
          <div class="icon-main">
            <strong>${escapeHtml(category?.label || "未分类")}</strong>
            <span>${currency.format(item.total)} · ${item.count} 笔</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAccountBoard() {
  const monthEntries = getFilteredEntries();
  const accounts = getAccounts()
    .map((account) => {
      const expense = sumEntries(monthEntries.filter((entry) => entry.accountId === account.id), "expense");
      const income = sumEntries(monthEntries.filter((entry) => entry.accountId === account.id), "income");
      return { account, expense, income, activity: expense + income };
    })
    .filter((item) => item.activity > 0)
    .sort((a, b) => b.activity - a.activity);

  if (!accounts.length) {
    dom.accountBoard.innerHTML = `<div class="empty-state">先记几笔，账户视图会显示每张卡的本月金额。</div>`;
    return;
  }

  dom.accountBoard.innerHTML = accounts
    .slice(0, 6)
    .map(({ account, expense, income }) => {
      const label = account.bank ? `${account.bank} ${account.name}` : account.name;
      return `
        <article class="account-item">
          <div class="account-symbol">${escapeHtml(account.icon)}</div>
          <div class="account-main">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(accountTypeLabelMap[account.type] || "账户")}</span>
          </div>
          <div class="account-side">
            <strong>${currency.format(expense)}</strong>
            <span>支出 / 收入 ${currency.format(income)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderEntries() {
  const filteredEntries = getSortedFilteredEntries();
  const pagedEntries = getPagedEntries(filteredEntries);
  if (!state.entries.length) {
    dom.entries.innerHTML = `<div class="empty-state">还没有记录。先试试“一句话快记”或者上面的快捷键。</div>`;
    return;
  }

  if (!filteredEntries.length) {
    dom.entries.innerHTML = `<div class="empty-state">这个筛选条件下没有记录。可以换月份、清空搜索，或者先记一笔带标签的记录。</div>`;
    return;
  }

  dom.entries.innerHTML = pagedEntries
    .map((entry) => {
      const category = getCategoryByKey(entry.categoryKey);
      const account = getAccountById(entry.accountId);
      const amountClass = entry.type === "expense" ? "expense" : "income";
      const amountPrefix = entry.type === "expense" ? "-" : "+";
      const accountLabel = account ? (account.bank ? `${account.bank} ${account.name}` : account.name) : "未知账户";
      const tagMarkup = (entry.tags || [])
        .map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`)
        .join("");

      return `
        <article class="entry">
          <div class="entry-badge">${escapeHtml(category?.icon || "🧾")}</div>
          <div class="entry-stack">
            <div class="entry-main">
              <strong>${escapeHtml(entry.note)}</strong>
              <span>${escapeHtml(category?.label || "未分类")} · ${escapeHtml(accountLabel)} · ${formatDate(entry.createdAt)} · ${escapeHtml(entry.source)}</span>
            </div>
            ${tagMarkup ? `<div class="entry-tags">${tagMarkup}</div>` : ""}
            <div class="entry-actions">
              <button class="ghost-button" type="button" data-edit-entry="${escapeHtml(entry.id)}">编辑</button>
              <button class="danger-button" type="button" data-delete-entry="${escapeHtml(entry.id)}">删除</button>
            </div>
          </div>
          <div class="entry-amount">
            <strong class="${amountClass}">${amountPrefix}${currency.format(entry.amount)}</strong>
            <span>${entry.type === "expense" ? "支出" : "收入"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPager() {
  const totalEntries = getSortedFilteredEntries();
  if (!totalEntries.length) {
    dom.pager.hidden = true;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalEntries.length / state.settings.pageSize));
  if (state.settings.currentPage > totalPages) {
    state.settings.currentPage = totalPages;
    persistSettings();
  }

  dom.pager.hidden = false;
  dom.prevPageButton.disabled = state.settings.currentPage <= 1;
  dom.nextPageButton.disabled = state.settings.currentPage >= totalPages;
  dom.pageSummary.textContent = `第 ${state.settings.currentPage} / ${totalPages} 页 · 共 ${totalEntries.length} 笔`;
}

function handleEntryAction(event) {
  const editButton = event.target.closest("[data-edit-entry]");
  if (editButton) {
    startEditingEntry(editButton.dataset.editEntry);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-entry]");
  if (deleteButton) {
    deleteEntry(deleteButton.dataset.deleteEntry);
  }
}

function startEditingEntry(entryId) {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  setActiveView("ledger", { scroll: false });
  state.editingEntryId = entryId;
  state.settings.activeType = entry.type;
  state.settings.activeCategoryKey = entry.categoryKey;
  state.settings.activeAccountId = entry.accountId;
  persistSettings();

  dom.amountInput.value = String(entry.amount);
  dom.entryDateInput.value = formatDateTimeLocal(entry.createdAt);
  dom.noteInput.value = entry.note;
  dom.tagsInput.value = (entry.tags || []).map((tag) => `#${tag}`).join(" ");
  renderFormControls();
  renderEntryMode();
  dom.amountInput.focus();
  dom.entryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditing(options = {}) {
  state.editingEntryId = null;
  dom.amountInput.value = "";
  dom.entryDateInput.value = formatDateTimeLocal(new Date());
  dom.noteInput.value = "";
  dom.tagsInput.value = "";

  if (options.resetSelection) {
    state.settings.activeType = "expense";
    state.settings.activeCategoryKey = "breakfast";
    state.settings.activeAccountId = "cash";
    persistSettings();
  }

  ensureSelectionIntegrity();
  renderFormControls();
  renderEntryMode();
}

function handleManualSubmit(event) {
  event.preventDefault();
  const amount = Number(dom.amountInput.value);
  if (!amount || amount <= 0) {
    showToast("金额需要大于 0");
    return;
  }

  const payload = {
    amount,
    createdAt: parseDateTimeInput(dom.entryDateInput.value),
    note: dom.noteInput.value.trim() || getCategoryByKey(state.settings.activeCategoryKey)?.label || "手动记账",
    categoryKey: state.settings.activeCategoryKey,
    type: state.settings.activeType,
    accountId: dom.accountSelect.value || state.settings.activeAccountId,
    tags: parseTagsInput(dom.tagsInput.value),
    source: "manual",
  };

  if (state.editingEntryId) {
    updateEntry(state.editingEntryId, payload);
    cancelEditing();
    return;
  }

  commitAndRender(payload);
  cancelEditing();
}

function handleSmartCommit() {
  const text = dom.smartTextInput.value.trim();
  if (!text) {
    showToast("先输入一句中文消费文本");
    return;
  }

  const parsed = parseEntryText(text);
  if (!parsed.amount) {
    showToast("还没识别出金额，试试“咖啡18 支付宝”或直接粘贴截图 OCR 文字");
    return;
  }

  commitAndRender({ ...parsed, source: "smart" });
  dom.smartTextInput.value = "";
  renderParserPreview();
}

function prefillEntryDraft(entryInput, originalText = "") {
  cancelEditing();
  state.settings.activeType = entryInput.type === "income" ? "income" : "expense";
  state.settings.activeCategoryKey = entryInput.categoryKey || state.settings.activeCategoryKey;
  state.settings.activeAccountId = entryInput.accountId || state.settings.activeAccountId;
  persistSettings();

  dom.smartTextInput.value = originalText || entryInput.note || "";
  dom.amountInput.value = entryInput.amount ? String(entryInput.amount) : "";
  dom.entryDateInput.value = formatDateTimeLocal(entryInput.createdAt || new Date());
  dom.noteInput.value = entryInput.note || "";
  dom.tagsInput.value = (entryInput.tags || []).map((tag) => `#${tag}`).join(" ");
  renderParserPreview();
  renderFormControls();
  renderEntryMode();
  setActiveView("ledger", { scroll: false });
  window.setTimeout(() => {
    dom.entryForm.scrollIntoView({ behavior: "smooth", block: "start" });
    dom.amountInput.focus();
  }, 120);
}

function updateEntry(entryId, entryInput) {
  const index = state.entries.findIndex((entry) => entry.id === entryId);
  if (index < 0) {
    showToast("没找到要编辑的记录");
    return;
  }

  const existing = state.entries[index];
  state.entries[index] = {
    ...existing,
    amount: Number(entryInput.amount),
    createdAt: entryInput.createdAt || existing.createdAt,
    note: entryInput.note || existing.note,
    categoryKey: entryInput.categoryKey,
    type: entryInput.type === "income" ? "income" : "expense",
    accountId: entryInput.accountId || existing.accountId,
    tags: normalizeTags(entryInput.tags || existing.tags || []),
    source: "edited",
  };
  persistEntries();
  markBackupDirty();
  renderAll();
  showToast("记录已更新");
}

function deleteEntry(entryId) {
  const index = state.entries.findIndex((entry) => entry.id === entryId);
  if (index < 0) {
    return;
  }

  const [entry] = state.entries.splice(index, 1);
  state.undoDeletion = { entry, index };
  if (state.editingEntryId === entryId) {
    cancelEditing();
  }
  persistEntries();
  markBackupDirty();
  renderAll();
  showToast("记录已删除");
}

function undoDelete() {
  if (!state.undoDeletion) {
    return;
  }

  state.entries.splice(state.undoDeletion.index, 0, state.undoDeletion.entry);
  state.undoDeletion = null;
  persistEntries();
  markBackupDirty();
  renderAll();
  showToast("删除已撤销");
}

function clearUndoDeletion() {
  state.undoDeletion = null;
  renderUndoBanner();
}

function handleReminderConfigChange(event) {
  const control = event.currentTarget;
  const slotKey = control.dataset.reminderKey;
  const field = control.dataset.reminderField;
  if (!slotKey || !field) {
    return;
  }

  const current = normalizeReminderSettings(state.settings.reminders);
  const next = { ...current };
  const stateKey = `${slotKey}${field === "enabled" ? "Enabled" : "Time"}`;
  next[stateKey] =
    field === "enabled" ? Boolean(control.checked) : normalizeReminderTime(control.value, REMINDER_SLOT_PRESETS[slotKey]?.defaultTime || "21:00");
  next.lastDismissedOn = "";
  state.settings.reminders = next;
  persistSettings();
  renderReminderStrip();
  renderAutomationPanel();
  showToast(`${REMINDER_SLOT_PRESETS[slotKey]?.label || "提醒"}已更新`);
}

function focusSmartComposer() {
  setActiveView("home");
  window.setTimeout(() => {
    dom.smartTextInput.focus();
    dom.smartTextInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 120);
}

function dismissReminderForToday() {
  const reminders = normalizeReminderSettings(state.settings.reminders);
  state.settings.reminders = {
    ...reminders,
    lastDismissedOn: getDayKey(new Date()),
  };
  persistSettings();
  renderReminderStrip();
  renderAutomationPanel();
  showToast("今天先不提醒了");
}

function handleBackupReminderChange() {
  state.settings.backupReminderDays = BACKUP_REMINDER_OPTIONS.includes(Number(dom.backupReminderSelect.value))
    ? Number(dom.backupReminderSelect.value)
    : 7;
  persistSettings();
  renderBackupPanel();
  showToast(state.settings.backupReminderDays ? `备份提醒已改成每 ${state.settings.backupReminderDays} 天` : "备份提醒已关闭");
  maybeShowBackupReminder({ force: true, delay: 500 });
}

function markBackupDirty() {
  const meta = normalizeBackupMeta(state.settings.backupMeta);
  state.settings.backupMeta = {
    ...meta,
    lastDataChangeAt: new Date().toISOString(),
    changeCountSinceBackup: meta.changeCountSinceBackup + 1,
  };
  persistSettings();
  scheduleAutoSnapshot("数据变更");
}

function markBackupFresh(baselineAt) {
  const meta = normalizeBackupMeta(state.settings.backupMeta);
  state.settings.backupMeta = {
    ...meta,
    baselineAt,
    lastDataChangeAt: baselineAt,
    changeCountSinceBackup: 0,
    lastReminderAt: "",
  };
  persistSettings();
}

function markBackupImported(importedAt, baselineAt) {
  const meta = normalizeBackupMeta(state.settings.backupMeta);
  state.settings.backupMeta = {
    ...meta,
    baselineAt,
    importedAt,
    lastDataChangeAt: importedAt,
    changeCountSinceBackup: 0,
    lastReminderAt: "",
  };
  persistSettings();
}

function maybeShowBackupReminder(options = {}) {
  const { force = false, delay = 0 } = options;
  const reminderMessage = getBackupReminderMessage();
  if (!reminderMessage) {
    return;
  }

  const meta = normalizeBackupMeta(state.settings.backupMeta);
  const lastReminderAt = Date.parse(meta.lastReminderAt || "");
  if (!force && Number.isFinite(lastReminderAt) && Date.now() - lastReminderAt < BACKUP_REMINDER_COOLDOWN_MS) {
    return;
  }

  state.settings.backupMeta = {
    ...meta,
    lastReminderAt: new Date().toISOString(),
  };
  persistSettings();

  window.clearTimeout(maybeShowBackupReminder.timer);
  maybeShowBackupReminder.timer = window.setTimeout(() => {
    showToast(reminderMessage);
  }, delay);
}

function getBackupReminderMessage() {
  if (!hasMeaningfulLedgerData() || !state.settings.backupReminderDays) {
    return "";
  }

  const meta = normalizeBackupMeta(state.settings.backupMeta);
  if (!meta.baselineAt) {
    return "还没做过 JSON 备份，建议现在导出到 iCloud Drive";
  }

  const daysSinceBackup = getElapsedDays(meta.baselineAt);
  if (daysSinceBackup >= state.settings.backupReminderDays * 2 || meta.changeCountSinceBackup >= 12) {
    return `最近一份备份已经 ${formatElapsedDays(daysSinceBackup)}，建议现在补一份 JSON 备份`;
  }

  if (daysSinceBackup >= state.settings.backupReminderDays) {
    return `最近一份备份已经 ${formatElapsedDays(daysSinceBackup)}，方便时导出一份 JSON 更稳`;
  }

  if (meta.changeCountSinceBackup >= 5) {
    return `备份后已经有 ${meta.changeCountSinceBackup} 次变更，方便时导出一份 JSON 更稳`;
  }

  return "";
}

function maybeShowEntryReminder(options = {}) {
  const { force = false, delay = 0 } = options;
  const signal = getEntryReminderSignal();
  if (!signal) {
    return;
  }

  const reminders = normalizeReminderSettings(state.settings.reminders);
  const toastKey = `${getDayKey(new Date())}-${signal.key}`;
  const lastToastAt = Date.parse(reminders.lastToastKey.split("|")[1] || "");
  if (!force && reminders.lastToastKey.startsWith(`${toastKey}|`) && Number.isFinite(lastToastAt) && Date.now() - lastToastAt < ENTRY_REMINDER_COOLDOWN_MS) {
    return;
  }

  state.settings.reminders = {
    ...reminders,
    lastToastKey: `${toastKey}|${new Date().toISOString()}`,
  };
  persistSettings();

  window.clearTimeout(maybeShowEntryReminder.timer);
  maybeShowEntryReminder.timer = window.setTimeout(() => {
    showToast(signal.toast);
  }, delay);
}

function saveBudget() {
  state.settings.monthlyBudget = Number(dom.monthlyBudgetInput.value) || 0;
  persistSettings();
  markBackupDirty();
  renderSummary();
  renderBudget();
  renderBackupPanel();
  showToast(state.settings.monthlyBudget ? "月预算已保存" : "月预算已清空");
}

function handleCategoryCreate(event) {
  event.preventDefault();
  const label = dom.categoryLabelInput.value.trim();
  const icon = dom.categoryIconInput.value.trim() || "🗂";
  const type = dom.categoryTypeInput.value === "income" ? "income" : "expense";
  const keywords = splitKeywords(dom.categoryKeywordsInput.value);

  if (!label) {
    showToast("分类名不能为空");
    return;
  }

  if (getCategories().some((category) => category.label === label)) {
    showToast("已经有同名分类了");
    return;
  }

  state.settings.customCategories.unshift({
    key: `custom-${slugify(label)}-${Date.now()}`,
    label,
    icon,
    type,
    keywords,
    builtIn: false,
  });
  persistSettings();
  markBackupDirty();
  dom.categoryForm.reset();
  renderAll();
  showToast("自定义分类已添加");
}

function handleAccountCreate(event) {
  event.preventDefault();
  const name = dom.accountNameInput.value.trim();
  const bank = dom.accountBankInput.value.trim();
  const icon = dom.accountIconInput.value.trim() || "💳";
  const type = dom.accountTypeInput.value || "credit";
  const keywords = splitKeywords(dom.accountKeywordsInput.value);

  if (!name) {
    showToast("账户名不能为空");
    return;
  }

  if (getAccounts().some((account) => `${account.bank}-${account.name}` === `${bank}-${name}`)) {
    showToast("已经有同名账户了");
    return;
  }

  state.settings.customAccounts.unshift({
    id: `account-${slugify(bank || name)}-${Date.now()}`,
    name,
    bank,
    type,
    icon,
    keywords,
    builtIn: false,
  });
  persistSettings();
  markBackupDirty();
  dom.accountForm.reset();
  renderAll();
  showToast("账户已添加");
}

function handleTemplateSave(event) {
  event.preventDefault();
  const name = dom.templateNameInput.value.trim();
  const amount = Number(dom.templateAmountInput.value);
  const type = dom.templateTypeInput.value === "income" ? "income" : "expense";
  const categoryKey = dom.templateCategoryInput.value;
  const accountId = dom.templateAccountInput.value;
  const tags = parseTagsInput(dom.templateTagsInput.value);

  if (!name || !amount || amount <= 0) {
    showToast("模板名和金额都需要有效");
    return;
  }

  const payload = {
    id: state.editingTemplateId || `template-${Date.now()}`,
    name,
    amount,
    type,
    categoryKey,
    accountId,
    tags,
  };

  if (state.editingTemplateId) {
    state.settings.templates = state.settings.templates.map((template) => (template.id === payload.id ? payload : template));
    state.editingTemplateId = null;
    showToast("模板已更新");
  } else {
    state.settings.templates.unshift(payload);
    showToast("模板已保存");
  }

  persistSettings();
  markBackupDirty();
  dom.templateForm.reset();
  dom.templateTypeInput.value = "expense";
  renderAll();
}

function handleTemplateAction(event) {
  const useButton = event.target.closest("[data-use-template]");
  if (useButton) {
    useTemplate(useButton.dataset.useTemplate);
    return;
  }

  const editButton = event.target.closest("[data-edit-template]");
  if (editButton) {
    startEditingTemplate(editButton.dataset.editTemplate);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-template]");
  if (deleteButton) {
    deleteTemplate(deleteButton.dataset.deleteTemplate);
  }
}

function useTemplate(templateId) {
  const template = state.settings.templates.find((item) => item.id === templateId);
  if (!template) {
    return;
  }

  commitAndRender({
    amount: template.amount,
    createdAt: new Date().toISOString(),
    note: template.name,
    categoryKey: template.categoryKey,
    type: template.type,
    accountId: template.accountId,
    tags: template.tags,
    source: "template",
  });
}

function startEditingTemplate(templateId) {
  const template = state.settings.templates.find((item) => item.id === templateId);
  if (!template) {
    return;
  }

  state.editingTemplateId = template.id;
  dom.templateNameInput.value = template.name;
  dom.templateTypeInput.value = template.type;
  renderTemplateOptions();
  dom.templateAmountInput.value = String(template.amount);
  dom.templateCategoryInput.value = template.categoryKey;
  dom.templateAccountInput.value = template.accountId;
  dom.templateTagsInput.value = (template.tags || []).map((tag) => `#${tag}`).join(" ");
  dom.templateNameInput.focus();
}

function deleteTemplate(templateId) {
  state.settings.templates = state.settings.templates.filter((template) => template.id !== templateId);
  if (state.editingTemplateId === templateId) {
    state.editingTemplateId = null;
    dom.templateForm.reset();
    dom.templateTypeInput.value = "expense";
  }
  persistSettings();
  markBackupDirty();
  renderAll();
  showToast("模板已删除");
}

function deleteCustomCategory(key) {
  if (state.entries.some((entry) => entry.categoryKey === key) || state.settings.templates.some((template) => template.categoryKey === key)) {
    showToast("这个分类已经被使用，先保留更安全");
    return;
  }

  state.settings.customCategories = state.settings.customCategories.filter((category) => category.key !== key);
  persistSettings();
  markBackupDirty();
  ensureSelectionIntegrity();
  renderAll();
  showToast("分类已删除");
}

function deleteCustomAccount(id) {
  if (state.entries.some((entry) => entry.accountId === id) || state.settings.templates.some((template) => template.accountId === id)) {
    showToast("这个账户已经有记录了，先保留更安全");
    return;
  }

  state.settings.customAccounts = state.settings.customAccounts.filter((account) => account.id !== id);
  persistSettings();
  markBackupDirty();
  ensureSelectionIntegrity();
  renderAll();
  showToast("账户已删除");
}

function parseNaturalText(text) {
  const tags = extractTagsFromText(text);
  const cleanText = stripTagsFromText(text).trim() || text.trim();
  const normalizedText = normalizeText(cleanText);
  const matchedCategory = matchCategoryAcrossAll(cleanText, normalizedText);
  const type = matchedCategory?.type || detectType(cleanText);
  const amount = extractAmount(cleanText);
  const category =
    matchedCategory?.type === type
      ? matchedCategory
      : matchCategoryWithinType(cleanText, normalizedText, type) || inferCategoryByMeaning(cleanText, normalizedText, type);
  const fallbackCategory = getCategories(type).find((item) => item.key === (type === "income" ? "other-income" : "other-expense"));
  const account =
    matchAccount(cleanText, normalizedText) ||
    inferAccountByMeaning(cleanText, normalizedText) ||
    getAccountById(state.settings.activeAccountId) ||
    getAccounts()[0];

  return {
    amount,
    type,
    categoryKey: category?.key || fallbackCategory?.key || getCategories(type)[0]?.key,
    accountId: account?.id || "cash",
    note: cleanText,
    tags,
  };
}

function parseEntryText(text, options = {}) {
  return shouldUseReceiptParser(text, options) ? parseReceiptText(text) : parseNaturalText(text);
}

function shouldUseReceiptParser(text, options = {}) {
  if (options.ocr) {
    return true;
  }

  const rawText = String(text || "");
  return /[\n\r]/.test(rawText) && /(支付|付款|收款方|商户|订单|实付|总计|消费|到账|入账)/.test(rawText);
}

function parseReceiptText(text) {
  const cleanText = normalizeReceiptText(text);
  const tags = extractTagsFromText(cleanText);
  const amount = extractReceiptAmount(cleanText) || extractAmount(cleanText);
  const merchant = extractReceiptMerchant(cleanText);
  const semanticText = [merchant, cleanText].filter(Boolean).join(" ");
  const normalizedText = normalizeText(semanticText);
  const type = detectReceiptType(cleanText) || detectType(semanticText);
  const matchedCategory = matchCategoryAcrossAll(semanticText, normalizedText);
  const category =
    matchedCategory?.type === type
      ? matchedCategory
      : matchCategoryWithinType(semanticText, normalizedText, type) || inferCategoryByMeaning(semanticText, normalizedText, type);
  const fallbackCategory = getCategories(type).find((item) => item.key === (type === "income" ? "transfer" : "other-expense"));
  const account = inferReceiptAccount(semanticText, normalizedText) || getAccountById(state.settings.activeAccountId) || getAccounts()[0];

  return {
    amount,
    type,
    categoryKey: category?.key || fallbackCategory?.key || getCategories(type)[0]?.key,
    accountId: account?.id || "cash",
    note: merchant || inferReceiptNote(cleanText, type, category?.label),
    tags,
  };
}

function normalizeReceiptText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function detectReceiptType(text) {
  if (receiptIncomeKeywords.some((keyword) => text.includes(keyword)) && !receiptExpenseKeywords.some((keyword) => text.includes(keyword))) {
    return "income";
  }

  if (receiptExpenseKeywords.some((keyword) => text.includes(keyword))) {
    return "expense";
  }

  return inferSemanticType(text);
}

function extractReceiptAmount(text) {
  const candidates = [...text.matchAll(/\d+(?:\.\d{1,2})?/g)]
    .map((match) => ({
      value: Number(match[0]),
      raw: match[0],
      index: match.index || 0,
    }))
    .filter((candidate) => !looksLikeDateToken(text, candidate));

  if (!candidates.length) {
    return null;
  }

  candidates.forEach((candidate) => {
    const around = text.slice(Math.max(0, candidate.index - 10), candidate.index + candidate.raw.length + 10);
    let score = 100;
    if (/[¥￥元块]/.test(around)) {
      score += 8000;
    }
    if (receiptStrongAmountKeywords.some((keyword) => around.includes(keyword))) {
      score += 9000;
    }
    if (receiptWeakAmountKeywords.some((keyword) => around.includes(keyword))) {
      score += 2500;
    }
    if (receiptNegativeAmountKeywords.some((keyword) => around.includes(keyword))) {
      score -= 14000;
    }
    if (candidate.value >= 1000 && !candidate.raw.includes(".") && !/[¥￥]/.test(around)) {
      score -= 7000;
    }
    if (/^\d{4,}$/.test(candidate.raw)) {
      score -= 2000;
    }
    candidate.score = score + Math.min(candidate.value, 999) / 100;
  });

  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.value || null;
}

function extractReceiptMerchant(text) {
  const lines = normalizeReceiptText(text).split("\n");
  for (const line of lines) {
    for (const pattern of receiptMerchantLabelPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const cleaned = cleanReceiptMerchantLine(match[1]);
        if (cleaned) {
          return cleaned;
        }
      }
    }
  }

  return (
    lines
      .map(cleanReceiptMerchantLine)
      .find((line) => isLikelyMerchantLine(line)) || ""
  );
}

function cleanReceiptMerchantLine(line) {
  return String(line || "")
    .replace(/[¥￥]\s*\d+(?:\.\d{1,2})?.*$/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[（][^）]*[）]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyMerchantLine(line) {
  if (!line || line.length > 22) {
    return false;
  }

  if (!/[\u4e00-\u9fa5A-Za-z]/.test(line)) {
    return false;
  }

  if (/^\d+(?:\.\d+)?$/.test(line) || /\d{4,}/.test(line)) {
    return false;
  }

  return !receiptMerchantIgnoreKeywords.some((keyword) => line.includes(keyword));
}

function inferReceiptNote(text, type, categoryLabel) {
  if (categoryLabel && categoryLabel !== "其他支出" && categoryLabel !== "转入") {
    return categoryLabel;
  }
  return type === "income" ? "截图收入" : "截图消费";
}

function detectType(text) {
  const semanticType = inferSemanticType(text);
  if (semanticType) {
    return semanticType;
  }

  return incomeKeywords.some((keyword) => text.includes(keyword)) ? "income" : "expense";
}

function inferSemanticType(text) {
  if (matchesContextRules(text, incomeContextRules)) {
    return "income";
  }

  if (matchesContextRules(text, expenseContextRules)) {
    return "expense";
  }

  return "";
}

function matchesContextRules(text, rules) {
  return rules.some((rule) => rule.includeAll.every((keyword) => text.includes(keyword)));
}

function extractAmount(text) {
  const candidates = [...text.matchAll(/\d+(?:\.\d{1,2})?/g)]
    .map((match) => ({
      value: Number(match[0]),
      raw: match[0],
      index: match.index || 0,
    }))
    .filter((candidate) => !looksLikeDateToken(text, candidate));

  if (!candidates.length) {
    return null;
  }

  candidates.forEach((candidate) => {
    const around = text.slice(Math.max(0, candidate.index - 2), candidate.index + candidate.raw.length + 2);
    let score = candidate.value;
    if (/[¥￥元块]/.test(around)) {
      score += 5000;
    }
    if (candidate.value <= 0) {
      score -= 10000;
    }
    candidate.score = score;
  });

  return candidates.sort((a, b) => b.score - a.score)[0]?.value || null;
}

function looksLikeDateToken(text, candidate) {
  const prev = text[candidate.index - 1] || "";
  const next = text[candidate.index + candidate.raw.length] || "";
  const isYear = candidate.value >= 1900 && candidate.value <= 2100 && next === "年";
  return /[月日号:]/.test(next) || /[\/-]/.test(prev) || /[\/-]/.test(next) || isYear;
}

function matchCategoryAcrossAll(text, normalizedText) {
  return chooseBestMatch(getCategories(), (category) => categoryMatchScore(category, text, normalizedText));
}

function matchCategoryWithinType(text, normalizedText, type) {
  return chooseBestMatch(getCategories(type), (category) => categoryMatchScore(category, text, normalizedText));
}

function matchAccount(text, normalizedText) {
  return chooseBestMatch(getAccounts(), (account) => accountMatchScore(account, text, normalizedText));
}

function inferAccountByMeaning(text, normalizedText) {
  const semanticAccount = chooseBestMatch(
    accountSemanticRules.map((rule) => ({
      ...rule,
      account: getAccountById(rule.accountId),
    })),
    (rule) => (rule.account ? keywordMatchScore(rule.keywords, text, normalizedText) : 0)
  );

  if (semanticAccount?.account) {
    const preferredByType =
      semanticAccount.account.type === "credit" || semanticAccount.account.type === "debit"
        ? chooseAccountByTypePreference(semanticAccount.account.type)
        : null;
    return preferredByType || semanticAccount.account;
  }

  return null;
}

function inferReceiptAccount(text, normalizedText) {
  const matchedCardAccount = chooseBestMatch(
    getAccounts().filter((account) => account.type === "credit" || account.type === "debit"),
    (account) => accountMatchScore(account, text, normalizedText)
  );
  if (matchedCardAccount) {
    return matchedCardAccount;
  }

  const semanticCardRule = chooseBestMatch(
    accountSemanticRules
      .filter((rule) => ["credit-default", "debit-default"].includes(rule.accountId))
      .map((rule) => ({
        ...rule,
        account: getAccountById(rule.accountId),
      })),
    (rule) => (rule.account ? keywordMatchScore(rule.keywords, text, normalizedText) : 0)
  );
  if (semanticCardRule?.account) {
    return chooseAccountByTypePreference(semanticCardRule.account.type) || semanticCardRule.account;
  }

  return matchAccount(text, normalizedText) || inferAccountByMeaning(text, normalizedText);
}

function chooseAccountByTypePreference(type) {
  const activeAccount = getAccountById(state.settings.activeAccountId);
  if (activeAccount?.type === type) {
    return activeAccount;
  }

  const customAccounts = state.settings.customAccounts.filter((account) => account.type === type);
  if (customAccounts.length === 1) {
    return customAccounts[0];
  }

  return getAccounts().find((account) => account.type === type && account.builtIn) || getAccounts().find((account) => account.type === type) || null;
}

function inferCategoryByMeaning(text, normalizedText, type) {
  if (type !== "expense") {
    return null;
  }

  return inferMealCategory(text, normalizedText) || inferSemanticCategory(text, normalizedText);
}

function inferMealCategory(text, normalizedText) {
  const breakfastScore = keywordMatchScore(breakfastFoodKeywords, text, normalizedText);
  const lunchCueScore = keywordMatchScore(lunchCueKeywords, text, normalizedText);
  const dinnerCueScore = keywordMatchScore(dinnerCueKeywords, text, normalizedText);
  const mealScore = keywordMatchScore(mealFoodKeywords, text, normalizedText);

  if (!breakfastScore && !lunchCueScore && !dinnerCueScore && !mealScore) {
    return null;
  }

  if (breakfastScore > 0 && breakfastScore >= lunchCueScore && breakfastScore >= dinnerCueScore) {
    return getCategoryByKey("breakfast");
  }

  if (lunchCueScore > dinnerCueScore) {
    return getCategoryByKey("lunch");
  }

  if (dinnerCueScore > lunchCueScore) {
    return getCategoryByKey("dinner");
  }

  if (mealScore > 0) {
    return getCategoryByKey(inferMealCategoryKeyByClock());
  }

  return null;
}

function inferMealCategoryKeyByClock(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) {
    return "breakfast";
  }
  if (hour >= 10 && hour < 16) {
    return "lunch";
  }
  return "dinner";
}

function inferSemanticCategory(text, normalizedText) {
  const matchedRule = chooseBestMatch(
    semanticCategoryRules.map((rule) => ({
      ...rule,
      category: getCategoryByKey(rule.categoryKey),
    })),
    (rule) => (rule.category ? keywordMatchScore(rule.keywords, text, normalizedText) : 0)
  );

  return matchedRule?.category || null;
}

function chooseBestMatch(items, scorer) {
  const scored = items
    .map((item) => ({ item, score: scorer(item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item || null;
}

function categoryMatchScore(category, text, normalizedText) {
  const tokens = [category.label, ...(category.keywords || [])];
  return tokenScore(tokens, text, normalizedText);
}

function accountMatchScore(account, text, normalizedText) {
  const tokens = [account.name, account.bank, ...(account.keywords || [])].filter(Boolean);
  return tokenScore(tokens, text, normalizedText);
}

function keywordMatchScore(keywords, text, normalizedText) {
  return tokenScore(keywords, text, normalizedText);
}

function tokenScore(tokens, text, normalizedText) {
  return tokens.reduce((best, token) => {
    const normalizedToken = normalizeText(token);
    if (!normalizedToken) {
      return best;
    }
    const hit = text.includes(token) || normalizedText.includes(normalizedToken);
    return hit ? Math.max(best, normalizedToken.length) : best;
  }, 0);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s,，。！!？?、\-_/]/g, "");
}

function extractTagsFromText(value) {
  const tags = [...String(value || "").matchAll(/[#＃]([^\s#＃,，。！!？?、]+)/g)].map((match) => match[1]);
  return normalizeTags(tags);
}

function stripTagsFromText(value) {
  return String(value || "").replace(/[#＃][^\s#＃,，。！!？?、]+/g, " ").replace(/\s+/g, " ").trim();
}

function splitKeywords(value) {
  return String(value || "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags || "").split(/[，,\s]+/);
  const seen = new Set();
  return values
    .map((tag) => String(tag || "").trim().replace(/^#+/, "").replace(/^＃+/, ""))
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    })
    .slice(0, 6);
}

function parseTagsInput(value) {
  return normalizeTags(
    String(value || "")
      .replace(/[#＃]/g, " ")
      .split(/[，,\s]+/)
  );
}

function commitAndRender(entryInput) {
  const entry = {
    id: crypto.randomUUID(),
    amount: Number(entryInput.amount),
    note: entryInput.note || "记账",
    categoryKey: entryInput.categoryKey,
    type: entryInput.type === "income" ? "income" : "expense",
    accountId: entryInput.accountId || state.settings.activeAccountId,
    tags: normalizeTags(entryInput.tags || []),
    source: entryInput.source || "manual",
    createdAt: entryInput.createdAt || new Date().toISOString(),
  };

  state.entries.unshift(entry);
  persistEntries();
  markBackupDirty();
  renderAll();

  const budgetAlert = getBudgetAlert();
  const category = getCategoryByKey(entry.categoryKey);
  if (budgetAlert) {
    showToast(`${category?.label || "已记账"} ${currency.format(entry.amount)}，${budgetAlert}`);
  } else {
    showToast(`${category?.label || "已记账"} ${currency.format(entry.amount)} 已保存`);
  }
}

function getBudgetAlert() {
  if (!state.settings.monthlyBudget) {
    return "";
  }

  const monthExpense = sumEntries(getCurrentMonthEntries(), "expense");
  if (monthExpense <= state.settings.monthlyBudget) {
    return "";
  }

  return `本月预算已超出 ${currency.format(monthExpense - state.settings.monthlyBudget)}`;
}

function getMonthKey(dateLike) {
  const date = new Date(dateLike);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-");
  if (!year || !month) {
    return "当前月份";
  }
  return `${year} 年 ${Number(month)} 月`;
}

function getMonthScopedEntries() {
  return state.entries.filter((entry) => getMonthKey(entry.createdAt) === state.settings.selectedMonth);
}

function getFilteredEntries() {
  return getMonthScopedEntries().filter((entry) => {
    if (state.settings.entryTypeFilter !== "all" && entry.type !== state.settings.entryTypeFilter) {
      return false;
    }

    if (state.settings.activeTagFilter && !(entry.tags || []).includes(state.settings.activeTagFilter)) {
      return false;
    }

    if (!state.settings.searchQuery) {
      return true;
    }

    return matchesEntrySearch(entry, state.settings.searchQuery);
  });
}

function getSortedFilteredEntries() {
  const entries = [...getFilteredEntries()];
  switch (state.settings.entrySort) {
    case "oldest":
      return entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case "amount-desc":
      return entries.sort((a, b) => b.amount - a.amount || new Date(b.createdAt) - new Date(a.createdAt));
    case "amount-asc":
      return entries.sort((a, b) => a.amount - b.amount || new Date(b.createdAt) - new Date(a.createdAt));
    case "newest":
    default:
      return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

function getPagedEntries(entries) {
  const totalPages = Math.max(1, Math.ceil(entries.length / state.settings.pageSize));
  const currentPage = Math.min(state.settings.currentPage, totalPages);
  const start = (currentPage - 1) * state.settings.pageSize;
  return entries.slice(start, start + state.settings.pageSize);
}

function matchesEntrySearch(entry, query) {
  const category = getCategoryByKey(entry.categoryKey);
  const account = getAccountById(entry.accountId);
  const haystack = [
    entry.note,
    category?.label,
    account?.name,
    account?.bank,
    ...(entry.tags || []),
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeText(haystack).includes(normalizeText(query));
}

function getPopularTags(entries) {
  const counts = new Map();
  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"))
    .slice(0, 10);
}

function handleTagFilterClick(event) {
  const button = event.target.closest("[data-tag-filter]");
  if (!button) {
    return;
  }

  state.settings.activeTagFilter = button.dataset.tagFilter || "";
  state.settings.currentPage = 1;
  persistSettings();
  renderAll();
}

function shiftSelectedMonth(offset) {
  const [year, month] = state.settings.selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  state.settings.selectedMonth = getMonthKey(date);
  state.settings.currentPage = 1;
  persistSettings();
  renderAll();
}

function clearEntryFilters() {
  state.settings.selectedMonth = getMonthKey(new Date());
  state.settings.searchQuery = "";
  state.settings.entryTypeFilter = "all";
  state.settings.activeTagFilter = "";
  state.settings.entrySort = "newest";
  state.settings.pageSize = 12;
  state.settings.currentPage = 1;
  persistSettings();
  renderAll();
}

function changePage(offset) {
  const totalEntries = getSortedFilteredEntries();
  const totalPages = Math.max(1, Math.ceil(totalEntries.length / state.settings.pageSize));
  state.settings.currentPage = Math.min(totalPages, Math.max(1, state.settings.currentPage + offset));
  persistSettings();
  renderEntries();
  renderPager();
}

function aggregateByCategory(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    const current = map.get(entry.categoryKey) || { key: entry.categoryKey, total: 0, count: 0 };
    current.total += entry.amount;
    current.count += 1;
    map.set(entry.categoryKey, current);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function getCurrentMonthEntries() {
  return state.entries.filter((entry) => isInCurrentMonth(entry.createdAt));
}

function getCurrentYearEntries() {
  return state.entries.filter((entry) => isInCurrentYear(entry.createdAt));
}

function sumEntries(entries, type) {
  return entries.filter((entry) => entry.type === type).reduce((sum, entry) => sum + entry.amount, 0);
}

function isInCurrentMonth(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isInCurrentYear(dateString) {
  return new Date(dateString).getFullYear() === new Date().getFullYear();
}

function getMonthForecast(monthExpense) {
  const now = new Date();
  const day = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (!monthExpense || !day) {
    return 0;
  }
  return (monthExpense / day) * totalDays;
}

function getElapsedDays(dateString) {
  const timestamp = Date.parse(dateString || "");
  if (!Number.isFinite(timestamp)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function formatElapsedDays(days) {
  if (!Number.isFinite(days) || days <= 0) {
    return "今天";
  }
  return `${days} 天前`;
}

function formatFullDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDateTimeLocal(dateLike) {
  const date = new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeInput(value) {
  if (!value) {
    return new Date().toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "");
}

function exportCsv() {
  if (!state.entries.length) {
    showToast("还没有可导出的记录");
    return;
  }

  const header = ["时间", "类型", "分类", "账户", "金额", "备注", "标签", "来源"];
  const rows = state.entries.map((entry) => {
    const category = getCategoryByKey(entry.categoryKey);
    const account = getAccountById(entry.accountId);
    const accountLabel = account ? (account.bank ? `${account.bank} ${account.name}` : account.name) : "";
    return [
      entry.createdAt,
      entry.type === "expense" ? "支出" : "收入",
      category?.label || "未分类",
      accountLabel,
      entry.amount.toFixed(2),
      entry.note,
      (entry.tags || []).join("|"),
      entry.source,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pocket-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createBackupPayload(exportedAt = new Date().toISOString()) {
  return {
    exportedAt,
    version: 2,
    settings: state.settings,
    entries: state.entries,
  };
}

function hasMeaningfulLedgerData() {
  return Boolean(
    state.entries.length ||
      state.settings.customCategories.length ||
      state.settings.customAccounts.length ||
      state.settings.templates.length ||
      state.settings.monthlyBudget
  );
}

async function buildBackupTransferBundle() {
  const payload = createBackupPayload();
  const rawText = backupCore.serializeBackupPayload(payload, false);
  const transferText = await backupCore.encodeBackupTransfer(rawText);
  return {
    payload,
    rawText,
    transferText,
    rawBytes: backupCore.getTextByteLength(rawText),
    transferBytes: backupCore.getTextByteLength(transferText),
    compressed: transferText.startsWith(backupCore.BACKUP_TRANSFER_PREFIX),
  };
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportJsonBackup() {
  const payload = createBackupPayload();
  const backupText = backupCore.serializeBackupPayload(payload);
  markBackupFresh(payload.exportedAt);
  downloadBlob(backupText, "application/json;charset=utf-8;", backupCore.getBackupFilename(payload.exportedAt));
  renderBackupPanel();
  showToast("JSON 备份已导出，请确认文件已保存到 iCloud Drive");
}

async function downloadTransferBackup() {
  const bundle = await buildBackupTransferBundle();
  downloadBlob(bundle.transferText, "text/plain;charset=utf-8;", backupCore.getTransferFilename(bundle.payload.exportedAt));
  markBackupFresh(bundle.payload.exportedAt);
  renderBackupPanel();
  showToast(`压缩备份已下载，约 ${backupCore.formatByteSize(bundle.transferBytes)}，可直接用“导入文件”恢复`);
}

async function copyJsonBackup() {
  const bundle = await buildBackupTransferBundle();
  const successMessage =
    bundle.transferBytes > CLIPBOARD_BACKUP_SOFT_LIMIT
      ? `压缩备份已复制，约 ${backupCore.formatByteSize(bundle.transferBytes)}，如果导入不稳请改用下载压缩或系统分享`
      : "压缩备份已复制，去主屏幕版直接粘贴导入";
  const copied = await copyText(bundle.transferText, successMessage, null);
  if (!copied) {
    return;
  }
  markBackupFresh(bundle.payload.exportedAt);
  renderBackupPanel();
}

async function shareJsonBackup() {
  const bundle = await buildBackupTransferBundle();
  const filename = bundle.compressed
    ? backupCore.getTransferFilename(bundle.payload.exportedAt)
    : backupCore.getBackupFilename(bundle.payload.exportedAt);
  const shareText = bundle.compressed ? bundle.transferText : bundle.rawText;
  const fileType = bundle.compressed ? "text/plain" : "application/json";

  try {
    if (navigator.share) {
      const file = typeof File !== "undefined" ? new File([shareText], filename, { type: fileType }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Pocket Ledger 备份" });
      } else {
        await navigator.share({ title: "Pocket Ledger 备份", text: shareText });
      }
      markBackupFresh(bundle.payload.exportedAt);
      renderBackupPanel();
      showToast(bundle.compressed ? "系统分享已打开，建议直接保存这个压缩备份文件" : "系统分享已打开");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
  }

  await downloadTransferBackup();
}

function importJsonBackup(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    await importBackupText(String(reader.result || ""), "备份文件");
  };
  reader.readAsText(file, "utf-8");
}

async function importClipboardBackup() {
  let text = "";

  try {
    if (navigator.clipboard?.readText) {
      text = await navigator.clipboard.readText();
    }
  } catch {}

  if (!text.trim()) {
    text = window.prompt("把备份文本或 JSON 粘贴到这里") || "";
  }

  if (!text.trim()) {
    showToast("没有读到备份内容");
    return;
  }

  await importBackupText(text, "剪贴板备份");
}

async function importBackupText(rawText, sourceLabel) {
  try {
    const decodedText = await backupCore.decodeBackupTransfer(String(rawText || ""));
    const parsed = JSON.parse(decodedText);
    if (!Array.isArray(parsed.entries) || typeof parsed.settings !== "object" || !parsed.settings) {
      throw new Error("invalid shape");
    }

    if (!window.confirm(`${sourceLabel}会整体替换当前本地数据，是否继续？`)) {
      dom.jsonFileInput.value = "";
      return;
    }

    if (hasMeaningfulLedgerData()) {
      await saveLocalSnapshot(`${sourceLabel} 导入前`, { force: true, silent: true });
    }

    state.settings = normalizeSettings(parsed.settings);
    state.entries = normalizeEntryRecords(parsed.entries);
    state.editingEntryId = null;
    state.editingTemplateId = null;
    state.undoDeletion = null;
    markBackupImported(new Date().toISOString(), parsed.exportedAt || new Date().toISOString());
    persistEntries();
    dom.jsonFileInput.value = "";
    renderAll();
    showToast(`${sourceLabel}已导入`);
  } catch {
    dom.jsonFileInput.value = "";
    showToast("备份内容格式不对，导入失败。支持 JSON 和压缩备份文本");
  }
}

async function loadLocalSnapshots() {
  const snapshots = await idbGetValue(IDB_SNAPSHOTS_KEY);
  return Array.isArray(snapshots) ? snapshots : [];
}

async function persistLocalSnapshots(snapshots) {
  const limitedSnapshots = snapshots.slice(0, LOCAL_SNAPSHOT_LIMIT);
  const saved = await idbSetValue(IDB_SNAPSHOTS_KEY, limitedSnapshots);
  if (!saved) {
    return [];
  }
  const meta = normalizeBackupMeta(state.settings.backupMeta);
  state.settings.backupMeta = {
    ...meta,
    localSnapshotCount: limitedSnapshots.length,
    lastLocalSnapshotAt: limitedSnapshots[0]?.createdAt || "",
  };
  persistSettings();
  return limitedSnapshots;
}

async function syncLocalSnapshotMeta() {
  const snapshots = await loadLocalSnapshots();
  const meta = normalizeBackupMeta(state.settings.backupMeta);
  const latestSnapshotAt = snapshots[0]?.createdAt || "";
  if (meta.localSnapshotCount === snapshots.length && meta.lastLocalSnapshotAt === latestSnapshotAt) {
    return;
  }
  state.settings.backupMeta = {
    ...meta,
    localSnapshotCount: snapshots.length,
    lastLocalSnapshotAt: latestSnapshotAt,
  };
  persistSettings();
}

async function saveLocalSnapshot(reason, options = {}) {
  const { force = false, silent = false } = options;
  if (!hasMeaningfulLedgerData()) {
    return false;
  }

  const meta = normalizeBackupMeta(state.settings.backupMeta);
  const lastSnapshotAt = Date.parse(meta.lastLocalSnapshotAt || "");
  if (!force && Number.isFinite(lastSnapshotAt) && Date.now() - lastSnapshotAt < AUTO_SNAPSHOT_COOLDOWN_MS) {
    return false;
  }

  const bundle = await buildBackupTransferBundle();
  const snapshots = await loadLocalSnapshots();
  if (snapshots[0]?.transferText === bundle.transferText) {
    return false;
  }

  const persistedSnapshots = await persistLocalSnapshots([
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reason,
      entryCount: state.entries.length,
      transferBytes: bundle.transferBytes,
      transferText: bundle.transferText,
    },
    ...snapshots,
  ]);
  if (!persistedSnapshots.length) {
    return false;
  }

  if (!silent) {
    showToast("本机快照已保存");
  }
  return true;
}

function scheduleAutoSnapshot(reason) {
  window.clearTimeout(runtime.autoSnapshotTimer);
  runtime.autoSnapshotTimer = window.setTimeout(() => {
    void saveLocalSnapshot(reason, { silent: true });
  }, 1200);
}

async function restoreLatestSnapshot() {
  const snapshots = await loadLocalSnapshots();
  const latestSnapshot = snapshots[0];
  if (!latestSnapshot) {
    showToast("还没有可恢复的本机快照");
    return;
  }
  await importBackupText(latestSnapshot.transferText, "最近快照");
}

function createMonthlyCarryover() {
  const [year, month] = state.settings.selectedMonth.split("-").map(Number);
  const targetDate = new Date(year, month - 1, 1, 9, 0, 0);
  const previousMonthKey = getMonthKey(new Date(year, month - 2, 1));
  const previousEntries = state.entries.filter((entry) => getMonthKey(entry.createdAt) === previousMonthKey);

  if (!previousEntries.length) {
    showToast("上个月没有记录，暂时无法结转");
    return;
  }

  const previousIncome = sumEntries(previousEntries, "income");
  const previousExpense = sumEntries(previousEntries, "expense");
  const net = previousIncome - previousExpense;
  if (net === 0) {
    showToast("上个月收支刚好持平，不需要结转");
    return;
  }

  const carryoverMonthLabel = formatMonthLabel(previousMonthKey);
  const carryoverNote = `${carryoverMonthLabel}结转`;
  const alreadyExists = state.entries.some(
    (entry) => getMonthKey(entry.createdAt) === state.settings.selectedMonth && entry.note === carryoverNote
  );
  if (alreadyExists) {
    showToast("这个月已经生成过结转了");
    return;
  }

  commitAndRender({
    amount: Math.abs(net),
    createdAt: targetDate.toISOString(),
    note: carryoverNote,
    categoryKey: net > 0 ? "transfer" : "other-expense",
    type: net > 0 ? "income" : "expense",
    accountId: state.settings.activeAccountId,
    tags: ["结转"],
    source: "carryover",
  });
}

function seedDemoEntries() {
  if (state.entries.length) {
    showToast("已有真实数据，没再覆盖示例");
    return;
  }

  state.settings.customAccounts = [
    {
      id: "account-demo-credit",
      name: "信用卡",
      bank: "招商银行",
      type: "credit",
      icon: "💳",
      keywords: ["招行", "招商"],
      builtIn: false,
    },
  ];
  state.settings.monthlyBudget = 4000;
  state.settings.templates = [
    {
      id: "template-rent",
      name: "房租",
      amount: 3200,
      type: "expense",
      categoryKey: "rent",
      accountId: "alipay",
      tags: ["固定支出", "住房"],
    },
    {
      id: "template-subscription",
      name: "会员月费",
      amount: 38,
      type: "expense",
      categoryKey: "other-expense",
      accountId: "wechat",
      tags: ["订阅"],
    },
  ];
  persistSettings();

  const now = new Date();
  state.entries = [
    { id: crypto.randomUUID(), amount: 18, note: "瑞幸咖啡18 支付宝", categoryKey: "coffee", type: "expense", accountId: "alipay", tags: ["工作日", "提神"], source: "smart", createdAt: now.toISOString() },
    { id: crypto.randomUUID(), amount: 28, note: "午饭", categoryKey: "lunch", type: "expense", accountId: "wechat", tags: ["工作"], source: "preset", createdAt: new Date(now.getTime() - 86_400_000).toISOString() },
    { id: crypto.randomUUID(), amount: 26, note: "打车26 招行信用卡", categoryKey: "taxi", type: "expense", accountId: "account-demo-credit", tags: ["通勤"], source: "smart", createdAt: new Date(now.getTime() - 2 * 86_400_000).toISOString() },
    { id: crypto.randomUUID(), amount: 8500, note: "工资8500 工资卡", categoryKey: "salary", type: "income", accountId: "cash", tags: ["月薪"], source: "smart", createdAt: new Date(now.getTime() - 4 * 86_400_000).toISOString() },
  ];
  persistEntries();
  markBackupDirty();
  renderAll();
  showToast("示例数据已填充");
}

function buildShortcutUrl() {
  const base = `${window.location.origin}${window.location.pathname}`;
  const amount = encodeURIComponent(dom.shortcutAmount.value || "18");
  const category = encodeURIComponent(dom.shortcutCategory.value || "coffee");
  const note = encodeURIComponent(dom.shortcutNote.value.trim() || "快捷记账");
  const accountId = encodeURIComponent(dom.shortcutAccount.value || state.settings.activeAccountId);
  return `${base}?autocommit=1&type=expense&amount=${amount}&category=${category}&account=${accountId}&note=${note}&source=shortcut`;
}

function getShortcutName() {
  return dom.shortcutName.value.trim() || "Pocket Ledger 一句话记账";
}

function buildNaturalTextShortcutTarget() {
  return `${window.location.origin}${window.location.pathname}?autocommit=1&text={URL编码后的一句话}&source=shortcut`;
}

function getOcrShortcutName() {
  return dom.ocrShortcutName.value.trim() || "Pocket Ledger 截图记账";
}

function buildOcrAutoTarget() {
  return `${window.location.origin}${window.location.pathname}?autocommit=1&ocr=1&text={URL编码后的OCR全文}&source=ocr`;
}

function buildOcrPreviewTarget() {
  return `${window.location.origin}${window.location.pathname}?prefill=1&ocr=1&text={URL编码后的OCR全文}&source=ocr`;
}

function buildRunShortcutUrl() {
  const name = encodeURIComponent(getShortcutName());
  const sampleText = encodeURIComponent(dom.smartTextInput.value.trim() || "瑞幸咖啡18 支付宝");
  return `shortcuts://run-shortcut?name=${name}&input=text&text=${sampleText}`;
}

function buildReminderGuideText() {
  const enabledSlots = getReminderSlots().filter((slot) => slot.enabled);
  const targetUrl = `${window.location.origin}${window.location.pathname}`;
  return [
    "建议路线：快捷指令 -> 自动化 -> 个人自动化 -> 时间",
    "",
    enabledSlots.length
      ? `当前启用时段：${enabledSlots.map((slot) => `${slot.label} ${slot.time}`).join(" / ")}`
      : "当前没有启用任何页面内提醒时段，可先在设置里打开。",
    "",
    "每个时段都建一个自动化，动作建议：",
    "1. 时间：选上面的对应时刻，重复每天。",
    "2. 动作 A：显示通知，文案写“到点了，补一笔 Pocket Ledger”。",
    `3. 动作 B：打开 URL -> ${targetUrl}`,
    "4. 如果你只想提醒不自动打开，可以只保留通知动作。",
    "",
    "说明：",
    "- 纯 PWA 不能在 iPhone 上自己后台定时弹提醒，所以这一步需要借助快捷指令个人自动化。",
    "- 页面内提醒仍然保留；你打开 App 时也会按时段提示。",
  ].join("\n");
}

function buildOcrGuideText() {
  return [
    `快捷指令名：${getOcrShortcutName()}`,
    "",
    "建议把这个快捷指令设成“显示在共享表单”，这样截图后直接分享到它。",
    "",
    "动作顺序：",
    "1. 获取“快捷指令输入”里的图片。",
    "2. 如果有多张图，只取第一张。",
    "3. 对图片执行“从图像中提取文本”。",
    "4. 如果提取结果为空：显示通知“这张截图没识别到文字”。",
    "5. 对提取到的文本做“URL 编码”。",
    "6. 用“文本”拼出下面这个自动入账地址：",
    buildOcrAutoTarget(),
    "",
    "如果你想先检查再保存，把第 6 步改成这个预览地址：",
    buildOcrPreviewTarget(),
    "",
    "补充：",
    "- 付款截图里如果同时有订单号、卡尾号和金额，页面会优先抓真正的支付金额。",
    "- 商户、微信/支付宝/信用卡等账户信息也会一起尝试识别。",
  ].join("\n");
}

async function copyShortcutUrl() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  await copyText(buildShortcutUrl(), "结构化自动落账链接已复制", dom.shortcutStatus, "已复制结构化链接，回到快捷指令里直接粘贴即可。");
}

async function copyVoiceShortcutTemplate() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  const template = [
    `快捷指令名：${getShortcutName()}`,
    "动作 1：如果“快捷指令输入”有值，就直接使用它；否则用“询问输入”让你说或输入一句话。",
    "动作 2：对这句话做“URL 编码”。",
    "动作 3：用“文本”拼出下面这个地址：",
    buildNaturalTextShortcutTarget(),
    "动作 4：执行“打开 URL”。",
    "建好以后，这个运行 URL 可以直接触发它：",
    buildRunShortcutUrl(),
  ].join("\n");
  await copyText(template, "一句话快捷指令模板已复制", dom.shortcutStatus, "已复制一句话模板，去快捷指令按空白处粘贴即可。");
}

function openShortcutCreatePage() {
  window.location.href = "shortcuts://create-shortcut";
}

async function copyRunShortcutUrl() {
  await copyText(buildRunShortcutUrl(), "运行快捷指令的 URL 已复制", dom.shortcutStatus, "已复制运行 URL，可用来直接触发已创建的快捷指令。");
}

async function copyReminderGuide() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  await copyText(buildReminderGuideText(), "提醒自动化模板已复制", dom.reminderStatus, "已复制提醒自动化模板，去快捷指令新建个人自动化后直接粘贴。");
}

function downloadReminderGuide() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  downloadTextFile(buildReminderGuideText(), "pocket-ledger-reminder-guide.txt");
  showToast("提醒自动化模板已下载");
}

async function copyOcrAutoLink() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  await copyText(buildOcrGuideText(), "截图 OCR 模板已复制", dom.ocrStatus, "已复制截图 OCR 模板，去快捷指令共享表单里粘贴即可。");
}

async function copyOcrPreviewLink() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  await copyText(buildOcrPreviewTarget(), "OCR 预览地址模板已复制", dom.ocrStatus, "已复制 OCR 预览地址，适合先检查再保存。");
}

function downloadOcrGuide() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }
  downloadTextFile(buildOcrGuideText(), "pocket-ledger-ocr-guide.txt");
  showToast("截图 OCR 模板已下载");
}

function downloadShortcutGuide() {
  if (!window.location.origin.startsWith("http")) {
    showToast("请先把页面跑在 http 或 https 地址上");
    return;
  }

  const content = [
    `快捷指令名：${getShortcutName()}`,
    "",
    "建议动作顺序：",
    "1. 获取“快捷指令输入”",
    "2. 如果输入为空：使用“询问输入”，提示词写“说一句账单，例如 瑞幸咖啡18 支付宝”",
    "3. URL 编码",
    "4. 文本",
    `   ${buildNaturalTextShortcutTarget()}`,
    "5. 打开 URL",
    "",
    "创建完成后，可用这个 URL 直接运行它：",
    buildRunShortcutUrl(),
    "",
    "说明：",
    "- 从网页直接生成全新的 .shortcut 文件不是 Apple 公开支持的能力。",
    "- 这个模板走的是 Apple 官方支持的 create-shortcut / run-shortcut 路线。",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${getShortcutName().replace(/[^\w\u4e00-\u9fa5-]/g, "-") || "shortcut-template"}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("快捷指令创建模板已下载");
}

async function copyText(text, successMessage, statusTarget = dom.shortcutStatus, statusMessage = successMessage) {
  const textBytes = backupCore.getTextByteLength(text);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (textBytes <= CLIPBOARD_BACKUP_SOFT_LIMIT) {
      window.prompt("复制下面的内容", text);
    } else {
      showToast("当前环境不适合复制大备份，请改用下载压缩或系统分享");
      return false;
    }
    if (statusTarget) {
      statusTarget.textContent = statusMessage;
      statusTarget.dataset.lockedCopy = "1";
      window.clearTimeout(statusTarget.__copyTimer);
      statusTarget.__copyTimer = window.setTimeout(() => {
        delete statusTarget.dataset.lockedCopy;
        renderStatusRegion(statusTarget);
      }, 10_000);
    }
    showToast(successMessage);
    return true;
  } catch {
    if (textBytes > CLIPBOARD_BACKUP_SOFT_LIMIT) {
      showToast("复制失败，数据偏大，请改用下载压缩或系统分享");
      return false;
    }
    window.prompt("复制下面的内容", text);
    if (statusTarget) {
      statusTarget.textContent = `${statusMessage} 如果系统没直接复制成功，刚刚已经弹出手动复制框。`;
      statusTarget.dataset.lockedCopy = "1";
      window.clearTimeout(statusTarget.__copyTimer);
      statusTarget.__copyTimer = window.setTimeout(() => {
        delete statusTarget.dataset.lockedCopy;
        renderStatusRegion(statusTarget);
      }, 10_000);
    }
    showToast("系统复制受限，已弹出手动复制框");
    return true;
  }
}

function renderStatusRegion(target) {
  if (target === dom.shortcutStatus) {
    renderShortcutStatus();
    return;
  }
  if (target === dom.reminderStatus || target === dom.ocrStatus) {
    renderAutomationPanel();
  }
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function applyLaunchQuery() {
  const params = new URLSearchParams(window.location.search);
  const shouldAutocommit = params.get("autocommit") === "1";
  const shouldPrefill = params.get("prefill") === "1";
  if (!shouldAutocommit && !shouldPrefill) {
    return;
  }

  const freeText = params.get("text");
  const fromReceipt = params.get("ocr") === "1";
  const source = params.get("source") || (fromReceipt ? "ocr" : "shortcut");
  if (freeText) {
    const parsed = parseEntryText(freeText, { ocr: fromReceipt });
    if (parsed.amount) {
      if (shouldAutocommit) {
        commitAndRender({ ...parsed, source });
      } else {
        prefillEntryDraft(parsed, freeText);
        showToast(fromReceipt ? "截图识别结果已带入，确认一下再保存" : "快捷内容已带入表单");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
  }

  const amount = Number(params.get("amount"));
  const categoryKey = params.get("category");
  const type = params.get("type") || "expense";
  const accountId = params.get("account") || state.settings.activeAccountId;
  const note = params.get("note") || getCategoryByKey(categoryKey)?.label || "快捷记账";

  if (!amount || amount <= 0 || !getCategoryByKey(categoryKey)) {
    showToast("快捷指令参数不完整，未自动保存");
    return;
  }

  const payload = {
    amount,
    categoryKey,
    type,
    accountId: getAccountById(accountId) ? accountId : state.settings.activeAccountId,
    note,
    source,
  };
  if (shouldAutocommit) {
    commitAndRender(payload);
  } else {
    prefillEntryDraft(payload, note);
    showToast("快捷内容已带入表单");
  }
  window.history.replaceState({}, document.title, window.location.pathname);
}

function updateInstallHint() {
  const standalone = isStandaloneMode();
  dom.installHint.innerHTML = standalone
    ? "<span>主屏幕</span><strong>已安装</strong>"
    : "<span>Safari</span><strong>可添加</strong>";
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
        if (registration.waiting) {
          registration.waiting.postMessage("SKIP_WAITING");
        }
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) {
            return;
          }
          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              installingWorker.postMessage("SKIP_WAITING");
            }
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (runtime.reloadingForUpdate) {
            return;
          }
          runtime.reloadingForUpdate = true;
          window.location.reload();
        });
      } catch {
        showToast("离线缓存注册失败");
      }
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 2400);
}

void boot().catch((error) => {
  console.error(error);
  showToast("启动失败，请重新打开页面");
});
