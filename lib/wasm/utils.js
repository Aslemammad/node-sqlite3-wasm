function callCallback(callback) {
  return (...args) => {
    try {
      callback?.(...args);
    } catch (e) {
      console.log(e)
    }
  }
}

module.exports = { callCallback }
