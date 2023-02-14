const path = require('path');
const { getDbModule, getCapi, getSQLite3Error } = require("./dbModule");
const Scheduler = require("./scheduler");
const { callCallback } = require("./utils");

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

class Database extends Scheduler {
  wasmDB = null
  _open = false
  constructor() {
    super()
    const filename = arguments[0]
    const callback = typeof arguments[arguments.length - 1] === 'function' ?arguments[arguments.length - 1] :null ;

    this.wasmDB = new Promise((resolve, reject) => {
      this.schedule(async (innerCallback) => {
        try {
          const capi = await getCapi()
          const mode = typeof arguments[1] === 'number' ? arguments[1] : capi.SQLITE_OPEN_READWRITE | capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_FULLMUTEX
          const db = await getDatabse(filename, mode);
          this._open = true;
          callCallback(innerCallback)(null)
          resolve(db)
        } catch (e) {
          callCallback(innerCallback)(e)
        }
      }, 'sqlite3.Database.Open', callback)
    })
  }

  close() {
      const callback = arguments[arguments.length - 1];
      this.schedule(async (innerCallback) => {
        const db = await this.wasmDB;
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
          callCallback(innerCallback)(null)
        } catch (e) {
          callCallback(innerCallback)(e)
        }
      }, "sqlite3.Database.Close", callback)
    return this
  }

  exec() {
    const callback = arguments[arguments.length - 1];
    this.schedule(async (innerCallback) => {
      const db = await this.wasmDB;
      try {
        db.exec(arguments[0]);
        callCallback(innerCallback)(null)
      } catch (e) {
        callCallback(innerCallback)(e)
      }
    }, "sqlite3.Database.Exec", callback)
    return this
  }

  wait(cb) {
    this.waitQueue.push(cb)
    this.process(cb)
    return this
  }
  loadExtension() {
  }

  serialize(callback) {
    const before = this._serialize
    if (!callback) {
      this._serialize = true
      return
    }
    this.cleanQueue()
    this.schedule(async () => {
      this._serialize = true
      try {
        await callCallback(callback)()
      } finally {
        this._serialize = before
      }
    })
    this.cleanQueue()

  }

  parallelize(callback) {
    const before = this._serialize
    if (!callback) {
      this._serialize = false
      return
    }
    this.cleanQueue()
    this.schedule(async () => {
      this._serialize = false
      try {
        await callCallback(callback)()
      } finally {
        this._serialize = before
      }
    })
    this.cleanQueue()

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
