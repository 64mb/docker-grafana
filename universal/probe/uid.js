const { default: axios } = require('axios')
const log = require('../logger')

module.exports = {
  instance: 'google.com',
  interval: 60000, // 60 sec
  job: async ({ instance, set }) => axios.post(`https://${instance}/api/`, { act: 'deep_service_check' }).then(({ data }) => {
    ['status', 'user', 'logs', 'bull'].forEach((key) => {
      set(key, data[key] === 0 || data[key] === false ? 0 : 1, { instance })
    })
  }).catch((err) => {
    set('status', null, { instance })
    set('user', null, { instance })
    set('logs', null, { instance })
    set('bull', null, { instance })
    log.error({
      msg: 'error request', instance, error: err.stack || err,
    })
  }),
}
