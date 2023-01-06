const path = require('path');
const { getDbModule, getCapi, getSQLite3Error } = require("./dbModule");

const dbMap = new Map();

let memoryCacheNum = 0; // to differentiate between :memory: databases

async function getDatabse(dbFile, mode) {
  let dbObj = dbMap.get(dbFile);
  if (dbObj && dbObj.mode === mode && dbFile !== ":memory:") {
    return dbObj.db;
  }
  const { sqlite3: { nodefs } } = await getDbModule();

  db = new nodefs.NodefsDb(dbFile, mode);

  if (dbFile !== ':memory:') {
    dbMap.set(dbFile, { db, mode });
  } else {
    db.memoryCacheNum = memoryCacheNum;
    dbMap.set(dbFile + memoryCacheNum, { db, mode });
    memoryCacheNum++
  }

  return db;
}

async function removeDatabase(dbFile, db) {
  if (dbFile !== ':memory:') {
    dbMap.delete(dbFile);
  } else {
    dbMap.delete(dbFile + db.memoryCacheNum);
  }
  if (dbMap.size === 0) {
    const { PThread } = await getDbModule();
    PThread.terminateAllThreads()
  }
}

class Database {
  wasmDB = null
  _open = false
  constructor() {
    const callback = arguments[arguments.length - 1];
    this.wasmDB = (async () => {
      const capi = await getCapi()
      const mode = typeof arguments[1] === 'number' ? arguments[1] : capi.SQLITE_OPEN_READWRITE | capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_FULLMUTEX
      return getDatabse(arguments[0], mode);
    })()
      .then((db) => {
        this._open = true;
        callback?.(null)
        return db
      }) // no error
      .catch((e) => callback?.(e)); // pass the error to the callback
  }

  close() {
    (async () => {
      const db = await this.wasmDB;
      const callback = arguments[arguments.length - 1];
      try {
        const filename = db.filename
        if (!this._open) { // already closed
          const capi = await getCapi()
          const SQLite3Error = await getSQLite3Error()
          throw new SQLite3Error(capi.SQLITE_MISUSE, 'Database is not open');
        }
        await db.close();
        this._open = false;
        removeDatabase(filename, db)
        callback?.(null)
      } catch (e) {
        callback?.(e)
      }
    })()
  }

  exec() {
    (async () => {
      const db = await this.wasmDB;
      const callback = arguments[arguments.length - 1];
      try {
        db.exec(arguments[0]);
        callback?.(null)
      } catch (e) {
        callback?.(e)
      }
    })()
  }

  wait() {
  }

  loadExtension() {
  }

  serialize() {
  }

  parallelize() {
  }

  configure() {
  }

  interrupt() {
  }

  get open() {
    return this._open
  }
}

module.exports = Database;
