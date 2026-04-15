(function attachPocketLedgerBackupCore(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  globalScope.PocketLedgerBackupCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPocketLedgerBackupCore() {
  const BACKUP_TRANSFER_PREFIX = "PLZ1:";

  function serializeBackupPayload(payload, pretty = true) {
    return JSON.stringify(payload, null, pretty ? 2 : 0);
  }

  function getBackupFilename(exportedAt) {
    const value = String(exportedAt || new Date().toISOString());
    return `pocket-ledger-backup-${value.slice(0, 10)}.json`;
  }

  function getTransferFilename(exportedAt) {
    const value = String(exportedAt || new Date().toISOString());
    return `pocket-ledger-transfer-${value.slice(0, 10)}.txt`;
  }

  async function encodeBackupTransfer(text) {
    if (typeof CompressionStream !== "function") {
      return text;
    }

    try {
      const compressedStream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
      const buffer = await new Response(compressedStream).arrayBuffer();
      return `${BACKUP_TRANSFER_PREFIX}${arrayBufferToBase64(buffer)}`;
    } catch {
      return text;
    }
  }

  async function decodeBackupTransfer(text) {
    const value = String(text || "").trim();
    if (!value.startsWith(BACKUP_TRANSFER_PREFIX)) {
      return value;
    }

    if (typeof DecompressionStream !== "function") {
      throw new Error("decompression unsupported");
    }

    const compressedBytes = base64ToUint8Array(value.slice(BACKUP_TRANSFER_PREFIX.length));
    const decompressedStream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(decompressedStream).text();
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return encodeBase64(binary);
  }

  function base64ToUint8Array(base64) {
    const binary = decodeBase64(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function encodeBase64(binary) {
    if (typeof btoa === "function") {
      return btoa(binary);
    }
    if (typeof Buffer === "function") {
      return Buffer.from(binary, "binary").toString("base64");
    }
    throw new Error("base64 encode unsupported");
  }

  function decodeBase64(base64) {
    if (typeof atob === "function") {
      return atob(base64);
    }
    if (typeof Buffer === "function") {
      return Buffer.from(base64, "base64").toString("binary");
    }
    throw new Error("base64 decode unsupported");
  }

  function getTextByteLength(text) {
    return new TextEncoder().encode(String(text || "")).length;
  }

  function formatByteSize(bytes) {
    const value = Math.max(0, Number(bytes) || 0);
    if (value < 1024) {
      return `${value} B`;
    }
    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(value >= 10 * 1024 ? 0 : 1)} KB`;
    }
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return {
    BACKUP_TRANSFER_PREFIX,
    serializeBackupPayload,
    getBackupFilename,
    getTransferFilename,
    encodeBackupTransfer,
    decodeBackupTransfer,
    getTextByteLength,
    formatByteSize,
  };
});
