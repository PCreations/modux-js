import { combineReducers } from 'redux'

import ModuxRegistry from './moduxRegistry'

const { isChild } = ModuxRegistry

export default function(id) {
  return reducer => {
    return (state, action = {}) => {
      if (typeof state === 'undefined') {
        return reducer(state, action)
      }
      if (typeof action.meta !== 'undefined' && typeof action.meta.__modux__ !== 'undefined') {
        if (isChild(id, action.meta.__modux__.id)) {
          return reducer(state, action)
        }
        if (typeof action.meta.__modux__.factoryID !== 'undefined' && isChild(action.meta.__modux__.id, id)) {
          return reducer(state, action)
        }
      }
      return state
    }
  }
}
