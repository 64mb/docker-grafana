const client = require('prom-client')
const fastify = require('fastify')({
  logger: false,
})
const log = require('./logger')

const helper = require('./helper')

helper.init()

fastify.get('/', async (request, reply) => {
  const metrics = await client.register.metrics()
  return metrics
})

fastify.listen(6464, '0.0.0.0', (err, address) => {
  if (err) {
    log.error({ msg: 'error server init', error: err.stack || err })
    process.exit(1)
  }
  log.info(`server listening on ${address}`)
})
