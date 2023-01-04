const path = require('path');
const { getDbModule, getCapi, getSQLite3Error } = require("./dbModule");

const dbMap = new Map();

async function getDatabse(dbFile, mode) {
  let dbObj = dbMap.get(dbFile);
  if (dbObj && dbObj.mode === mode && dbFile !== ":memory:") {
    return dbObj.db;
  }
  const { sqlite3: { nodefs } } = await getDbModule();

  db = new nodefs.NodefsDb(dbFile, mode);
  dbMap.set(dbFile, { db, mode });
  return db;
}

class Database {
  wasmDB = null
  _open = false
  constructor() {
    this.wasmDB = (async () => {
      const capi = await getCapi()
      const mode = typeof arguments[1] === 'number' ? arguments[1] : capi.SQLITE_OPEN_READWRITE | capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_FULLMUTEX
      return getDatabse(arguments[0], mode);
    })()
      .then((db) => {
        this._open = true;
        arguments[arguments.length - 1]?.()
        return db
      }) // no error
      .catch(arguments[arguments.length - 1]); // pass the error to the callback
  }

  close() {
    (async () => {
      const db = await this.wasmDB;
      try {
        if (!this._open) { // already closed
          const capi = await getCapi()
          const SQLite3Error = await getSQLite3Error()
          throw new SQLite3Error(capi.SQLITE_MISUSE, 'Database is not open');
        }
        await db.close();
        this._open = false;
        arguments[arguments.length - 1]?.()
      } catch (e) {
        arguments[arguments.length - 1]?.(e)
      }
    })()
  }

  exec() {
    (async () => {
      const db = await this.wasmDB;
      try {
        db.exec(arguments[0]);
        arguments[arguments.length - 1]?.()
      } catch (e) {
        console.log(e)
        arguments[arguments.length - 1]?.(e)
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
