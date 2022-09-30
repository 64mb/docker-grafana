module.exports = {
  name: 'status',
  help: 'service status',
  default: 1,
  expired: 120000, // 2 min
  label: ['instance'],
  type: 'gauge',
}
