require("sqlite3-wasm-nodefs");

let cachedRes = null;
async function getDbModule() {
  if (cachedRes) {
    return cachedRes;
  }
  const res = await globalThis.sqlite3InitModule();
  await res.sqlite3.asyncPostInit();

  return res;
}

async function getCapi() {
  const { sqlite3: { capi } } = await getDbModule()
  return capi
}

async function getSQLite3Error() {
  const { sqlite3: { SQLite3Error } } = await getDbModule()
  return SQLite3Error
}
module.exports = { getDbModule, getCapi, getSQLite3Error };
