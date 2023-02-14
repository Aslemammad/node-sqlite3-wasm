const { AsyncResource } = require('async_hooks')

class Scheduler {
  queue = []
  waitQueue = []
  promise = Promise.resolve()
  runningTask = false
  _serialize = false

  schedule(cb, name, innerCallback) {
    const newCallback = async () => {
      if (name) {
        return await new Promise((resolve, reject) => {
          const resource = new AsyncResource(name)
          const _cb = resource.bind(cb)
          resource.runInAsyncScope(async () => {
            await _cb(innerCallback ? resource.bind(innerCallback) : undefined)
            resolve()
          })
        })
      }
      return await cb()
    }
    this.queue.push(newCallback)
    this.process()
    return this
  }

  process() {
    if (((this.queue.length === 1 || this.waitQueue.length === 1) && !this.runningTask)) {
      this.cleanQueue()
    }
    return this
  }

  cleanQueue() {
    const promise = new Promise((resolve, reject) => {
      this.runningTask = true
      queueMicrotask(async () => {
        await this.promise
        this.promise = promise
        const queue = [...this.queue]
        const waitQueue = [...this.waitQueue]
        this.queue.length = 0
        this.waitQueue.length = 0
        this.runningTask = false
        try {
          if (this._serialize) {
            for (const cb of queue) {
              await cb()
            }
          } else {
            await Promise.all(queue.map(async (_cb) => {
              await _cb()
            }))
          }
          if (this._serialize) {
            for (const cb of waitQueue) {
              await cb()
            }
          } else {
            await Promise.all(waitQueue.map(async (_cb) => {
              await _cb()
            }))
          }
        } finally {
          resolve()
        }
      });
    })
  }

}

module.exports = Scheduler
