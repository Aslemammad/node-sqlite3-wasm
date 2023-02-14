const Scheduler = require("./scheduler");
const { callCallback } = require("./utils");
const { getCapi, getDbModule } = require("./dbModule");

class Statement {
  capi = null
  wasmStmt = null;
  DB = null
  wasmDB = null;
  changes = 0;
  lastID = 0

  constructor(_db, sql, callback) {
    // super()
    this.wasmDB = _db.wasmDB;
    this.DB = _db;

    this.wasmStmt = new Promise((resolve, reject) => {
      _db.schedule(async (innerCallback) => {
        try {
          this.capi = await getCapi();
          const db = await this.wasmDB;
          const stmt = db.prepare(sql);
          callCallback(innerCallback)();
          resolve(stmt);
        } catch (e) {
          callCallback(innerCallback)(e);
        }
      }, "sqlite3.Statement.Prepare", callback)
    })

  }
  bind() {
    const callback = arguments[arguments.length - 1];
    const params = Array.from(arguments).slice(0, -1);
    // this.schedule(async () => {
    this.DB.schedule(async () => {
      const stmt = await this.wasmStmt;
      try {
        // stmt.step()
        if (params.length) {
          stmt.reset(true);
          stmt.bind(params);
        }
        callCallback(callback?.bind(this))(null);
      } catch (e) {
        callCallback(callback?.bind(this))(e);
      }
    });
    return this;
  }
  get(callback) {
    // this.schedule(async () => {
    this.DB.schedule(async () => {
      const stmt = await this.wasmStmt;
      stmt.step();
      try {
        const result = stmt.get({});
        callCallback(callback?.bind(this))(null, result);
      } catch (e) {
        callCallback(callback?.bind(this))(e);
      }
    });

    return this;
  }
  run() {
    // all of the arguments are params and the last one is callback
    let params = Array.from(arguments).slice(0, -1);
    let callback = arguments[arguments.length - 1];

    // this.schedule(async () => {
    this.DB.schedule(async () => {
      if (arguments.length === 1) {
        if (typeof arguments[0] === 'function') {
          callback = arguments[0];
        } else {
          params.push(arguments[0]);
          callback = null;
        }
      }

      const stmt = await this.wasmStmt;
      const db = stmt.db;
      try {
        if (!params.length) {
          stmt.reset()
        }
        let result = null;
        if (params.length) {
          stmt.reset(true)
          result = stmt.bind(params);
        }
        stmt.step()
        this.changes = db.changes();
        /* TODO: try {
          this.lastID = this.capi.sqlite3_last_insert_rowid(db.pointer)
        } catch (e) {
        } */
        callCallback(callback?.bind(this))(null, result);
      } catch (e) {
        callCallback(callback?.bind(this))(e);
      }
    });

    return this;
  }
  all() {
    const callback = arguments[arguments.length - 1];
    const params = Array.from(arguments).slice(0, -1);
    // this.schedule(async () => {
    this.DB.schedule(async () => {
      const stmt = await this.wasmStmt;
      try {
        if (!params.length) {
          stmt.reset()
        }
        if (params.length) {
          stmt.bind(params);
        }
        const results = [];
        while (stmt.step()) {
          const result = stmt.get({});
          results.push(result);
        }
        callCallback(callback?.bind(this))(null, results);
      } catch (e) {
        callCallback(callback?.bind(this))(e, null);
      }
    });
    return this;
  }
  each() {
    return this;
  }
  reset() {
    return this;
  }
  finalize(callback) {
    this.DB.schedule(async () => {
      const stmt = await this.wasmStmt;
      try {
        stmt.finalize();
        callCallback(callback?.bind(this))(null);
      } catch (e) {
        callCallback(callback?.bind(this))(e);
      }
    });
    return this;
  }
}

module.exports = Statement;
