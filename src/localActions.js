export default function(actions, id) {
  const _actions = {}
  for (let actionName of Object.keys(actions)) {
    _actions[actionName] = (...args) => ({
      ...actions[actionName](...args),
      meta: {
        ...actions[actionName](...args).meta,
        __modux__: { id }
      }
    })
  }
  return _actions
}
