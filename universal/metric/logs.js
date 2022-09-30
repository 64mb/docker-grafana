module.exports = {
  name: 'logs',
  help: 'logs connect status',
  default: 0,
  expired: 120000, // 2 min
  label: ['instance'],
  type: 'gauge',
}
