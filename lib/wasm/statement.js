class Statement {
  wasmStmt = null;
  wasmDB = null;

  constructor(_db, sql, callback) {
    this.wasmDB = _db.wasmDB;
    this.wasmStmt = (async () => {
      try {
        const db = await this.wasmDB;
        const stmt = db.prepare(sql);
        callback?.();
        return stmt;
      } catch (e) {
        callback?.(e);
      }
    })();
  }
  bind() {
    console.log('bind')
    return this;
  }
  get(callback) {
    (async () => {
      const stmt = await this.wasmStmt;
      stmt.step();
      try {
        const result = stmt.get({});
        callback?.(null, result);
      } catch (e) {
        callback?.(e);
      }
    })();

    return this;
  }
  run() {
    // all of the arguments are params and the last one is callback
    const callback = arguments[arguments.length - 1];
    const params = Array.from(arguments).slice(0, -1);
    (async () => {
      const stmt = await this.wasmStmt;
      try {
        if (!params.length) {
          stmt.step()
          stmt.reset()
        }
        if (params.length) {
          const result = stmt.bind(params);
          callback?.(null, result);
        } else {
          callback?.(null, null);
        }
      } catch (e) {
        callback?.(e);
      }
    })();

    return this;
  }
  all() {
    // console.log("all", arguments);
    return this;
  }
  each() {
    // console.log("each", arguments);
    return this;
  }
  reset() {
    // console.log("reset", arguments);
    return this;
  }
  finalize(callback) {
    (async () => {
      const stmt = await this.wasmStmt;
      try {
        stmt.finalize();
        callback?.(null);
      } catch (e) {
        callback?.(e);
      }
    })();
    return this;
  }
}

module.exports = Statement;
