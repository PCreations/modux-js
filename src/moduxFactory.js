import uniqueid from 'lodash.uniqueid'

import localActions from './localActions'
import localSelectors from './localSelectors'
import takeLocalFactory from './takeLocalFactory'
import localReducerFactory from './localReducerFactory'
import contextFactory from './contextFactory'

export default function(getModuxSpecs) {
  return (mountPoint, initialState) => {
    const id = uniqueid()
    let localSelector = typeof mountPoint === 'object' ? mountPoint.localSelector : (state) => typeof mountPoint === 'undefined' ? state : state[mountPoint]
    mountPoint = typeof mountPoint === 'object' ? mountPoint.mountPoint : mountPoint
    let context = contextFactory(id, localSelector, initialState)
    let moduxSpec = getModuxSpecs(context)

    const localReducer = localReducerFactory(id)
    const takeLocal = takeLocalFactory(id)

    const scopedActions = typeof moduxSpec.actions === 'object' ? localActions(moduxSpec.actions, id) : {}
    const scopedSelectors = typeof moduxSpec.selectors === 'object' ? localSelectors(moduxSpec.selectors, localSelector) : {}
    const scopedReducer = context._getRootReducer(
      mountPoint,
      typeof moduxSpec.initReducer === 'function' ? localReducer(moduxSpec.initReducer(initialState)) : undefined
    )
    const saga = context._getRootSaga(typeof moduxSpec.initSaga === 'function' ? moduxSpec.initSaga({
      actions: scopedActions,
      selectors: scopedSelectors,
      takeLocal
    }) : undefined)
    const scopedView = moduxSpec.initView({ actions: scopedActions, selectors: scopedSelectors })

    return {
      selectors: scopedSelectors,
      actions: scopedActions,
      reducer: scopedReducer,
      view: scopedView,
      saga,
      id
    }
  }
}
