import uniqueid from 'lodash.uniqueid'
import { combineReducers } from 'redux'
import { fork } from 'redux-saga/effects'
import invariant from 'invariant'

import ModuxRegistry from './moduxRegistry'
import localSelectors from './localSelectors'

let root = true
export default function(parentId, localSelector, initialState) {
  const moduxesIdByMountPoint = {}
  return {
    add(moduxFactory, mountPoint, initialState) {
      root = false
      mountPoint = {
        localSelector: (state) => localSelector(state)[mountPoint.mountPoint],
        mountPoint
      }
      moduxFactory.rootFlag = false
      const modux = moduxFactory(mountPoint, initialState)
      moduxesIdByMountPoint[mountPoint.mountPoint] = modux.id
      ModuxRegistry.add(parentId, modux, mountPoint.mountPoint)
    },
    get(mountPoint) {
      return ModuxRegistry.get(moduxesIdByMountPoint[mountPoint])
    },
    getActions(mountPoint) {
      return this.get(mountPoint).actions
    },
    getView(mountPoint) {
      return this.get(mountPoint).view
    },
    getSaga(mountPoint) {
      return this.get(mountPoint).saga
    },
    getSelectors(mountPoint) {
      return this.get(mountPoint).selectors
    },
    getInitialState(defaultInitialState) {
      return initialState || defaultInitialState
    },
    _assertReducerSanity(ownReducer, hasChildrenReducers) {
      return hasChildrenReducers ? typeof ownReducer() === 'object' : true
    },
    _getRootReducer(mountPoint, reducer) {
      const getChildrenReducers = () => {
        let childrenReducers = {}
        for (let mountPoint of Object.keys(moduxesIdByMountPoint)) {
          childrenReducers[mountPoint] = ModuxRegistry.get(moduxesIdByMountPoint[mountPoint]).reducer
        }
        return childrenReducers
      }
      let childrenReducers = getChildrenReducers()
      if (Object.keys(childrenReducers).length > 0 && typeof reducer === 'undefined') {
        return combineReducers(childrenReducers)
      }
      if (Object.keys(childrenReducers).length === 0 && typeof reducer === 'undefined') {
        // We are in presence of a dynamic reducer
        return (state, action) => {
          let childrenReducers = getChildrenReducers()
          if (Object.keys(childrenReducers).length > 0 && typeof reducer === 'undefined') {
            return combineReducers(childrenReducers)(state, action)
          }
          return typeof state === 'undefined' ? {} : state
        }
      }
      invariant(this._assertReducerSanity(reducer, Object.keys(childrenReducers).length > 0), mountPoint + ' does have children and thus its initReducer method must return a combination obtained with combineReducers.' + (reducer()) + ' was returned instead')
      if (Object.keys(moduxesIdByMountPoint).length === 0) {
        return typeof mountPoint === 'undefined' ? reducer : (
          root ? combineReducers({ [mountPoint]: reducer }) : reducer
        )
      }
      if (typeof mountPoint === 'undefined') {
        if (Object.keys(childrenReducers).length === 0) {
          return reducer
        }
      }
      return (state, action) => {
        let defaultStateFromReducer = reducer()
        let stateForMyReducer = typeof state === 'undefined' ? undefined : { ...state }
        if (typeof stateForMyReducer !== 'undefined' && typeof defaultStateFromReducer === 'object') {
          let handledKeys = Object.keys(defaultStateFromReducer)
          for (let key of Object.keys(stateForMyReducer)) {
            if (handledKeys.indexOf(key) === -1) {
              delete stateForMyReducer[key]
            }
          }
        }
        const reducedState = reducer(stateForMyReducer, action)
        let stateForCombination = { ...reducedState }
        for (let key of Object.keys(reducedState)) {
          delete stateForCombination[key]
        }

        return {
          ...combineReducers(childrenReducers)(stateForCombination, action),
          ...reducedState
        }
      }
    },
    _getRootSaga(saga) {
      let childrenSagas = []
      for (let mountPoint of Object.keys(moduxesIdByMountPoint)) {
        childrenSagas.push(fork(ModuxRegistry.get(moduxesIdByMountPoint[mountPoint]).saga))
      }
      function *rootSaga() {
        let sagas = []
        if (typeof saga !== 'undefined') {
          sagas.push(fork(saga))
        }
        sagas = [
          ...sagas,
          ...childrenSagas
        ]
        try {
          yield sagas
        }
        catch(err) {
          if (process.env.NODE_ENV !== 'production') {
            console.err(err)
          }
        }
      }
      return rootSaga
    }
  }
}
