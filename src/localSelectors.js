export default function(selectors, getLocalState) {
  const _selectors = {}
  for (let selectorName of Object.keys(selectors)) {
    _selectors[selectorName] = (state) => {
      return selectors[selectorName](getLocalState(state))
    }
  }
  return _selectors
}
