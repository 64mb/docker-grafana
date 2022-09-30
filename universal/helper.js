const client = require('prom-client')
const path = require('path')
const klaw = require('klaw-sync')
const log = require('./logger')

const METRIC_FOLDER = './metric'
const PROBE_FOLDER = './probe'
const PROBE_DEFAULT_INTERVAL = 30000 // 30 seconds

const METRIC = {}
const PROBE = {}

const STORAGE = {}

function setMetric(name, value, label = null) {
  if (STORAGE[name] == null) {
    log.error({ msg: 'error metric name', name, value })
    return
  }

  if (value == null) {
    value = METRIC[name].default
  }

  const seed = {
    value,
    label: {},
  }

  let key = '_'
  if (label != null) {
    key = Object.entries(label).map(([k, v]) => {
      seed.label[k.toString()] = v.toString()
      return `${k}_${v}`
    }).join('$')
  }
  seed.time = Date.now()

  STORAGE[name][key] = seed
}

function prepareMetric(metric) {
  const metricConfig = metric

  const gauge = new client.Gauge({
    name: metricConfig.name,
    help: metricConfig.help,
    labelNames: metricConfig.label,
    async collect() {
      if (STORAGE[metricConfig.name] == null) {
        return
      }

      const seeds = Object.values(STORAGE[metricConfig.name])
      seeds.forEach((seed) => {
        try {
          if (Date.now() - seed.time < metricConfig.expired) {
            this.set({ ...seed.label }, +seed.value)
          } else {
            this.set({ ...seed.label }, +metricConfig.default)
          }
        } catch (err) {
          log.error({
            msg: 'error set metric in collect', metric: metricConfig, seed, error: err.stack || err,
          })
        }
      })
    },
  })
  metricConfig.metric = gauge

  return metricConfig
}

function prepareProbe(probe) {
  const prepareObj = {
    instance: probe.instance,
  }
  if (probe.job == null) {
    log.error({ msg: 'error probe job empty handler', instance: probe.instance })
    process.exit(1)
  }

  const job = setInterval(() => {
    try {
      return probe.job({ instance: probe.instance, set: setMetric })
    } catch (err) {
      log.error({ msg: 'error job execute', instance: probe.instance, error: err.stack || err })
      return null
    }
  }, probe.interval || PROBE_DEFAULT_INTERVAL)
  prepareObj.handler = probe.job
  prepareObj.job = job
  prepareObj.interval = probe.interval || PROBE_DEFAULT_INTERVAL

  return prepareObj
}

function init() {
  // metric init
  klaw(path.join(__dirname, METRIC_FOLDER), {
    nodir: true,
  })
    .filter((file) => path.extname(file.path) === '.js')
    .forEach((file) => {
      const metricConfig = require(file.path)

      if (METRIC[metricConfig.name] != null) {
        log.error({ msg: 'duplicate metric name', name: metricConfig.name })
        process.exit(1)
      }

      STORAGE[metricConfig.name] = {}
      METRIC[metricConfig.name] = prepareMetric(metricConfig)
      log.info({ msg: 'metric init success', name: metricConfig.name, label: metricConfig.label })
    })

  // probe job init
  let probes = klaw(path.join(__dirname, PROBE_FOLDER), {
    nodir: true,
  }).filter((file) => path.extname(file.path) === '.js')
    .map((file) => require(file.path))

  const pOnly = probes.filter((p) => p.only)
  if (pOnly.length > 0) probes = pOnly

  probes.forEach((probeConfig) => {
    if (probeConfig.skip) {
      log.info({ msg: 'probe skip', instance: probeConfig.instance })
      return
    }

    if (PROBE[probeConfig.instance] != null) {
      log.error({ msg: 'duplicate instance probe key', instance: probeConfig.instance })
      process.exit(1)
    }

    PROBE[probeConfig.instance] = prepareProbe(probeConfig)
    log.info({ msg: 'probe init success', instance: probeConfig.instance })
  })

  // first run
  Object.values(PROBE).forEach((probe) => {
    try {
      return probe.handler({ instance: probe.instance, set: setMetric })
    } catch (err) {
      log.error({ msg: 'error job execute first', instance: probe.instance, error: err.stack || err })
      return null
    }
  })
}

function clear() {
  Object.entries(PROBE).forEach((probe) => {
    if (probe.job != null) clearInterval(probe.job)
  })
}

module.exports = {
  init,
  clear,
}
