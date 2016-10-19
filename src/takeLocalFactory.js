import { take } from 'redux-saga/effects'

import ModuxRegistry from './moduxRegistry'

const { isChild } = ModuxRegistry

export default function(id) {
  return (pattern) => {
    const getIdFromAction = (action) =>
      typeof action.meta === 'undefined' ? null : (
        typeof action.meta.__modux__ === 'undefined' ? null : (
          action.meta.__modux__.id
        )
      )
    const matcher = (
        pattern === '*' ? action => isChild(id, getIdFromAction(action))
      : Array.isArray(pattern) ? action => isChild(id, getIdFromAction(action)) && pattern.some(p => p === action.type)
      : typeof pattern === 'function' ? action => isChild(id, getIdFromAction(action)) && pattern(action)
      : action => isChild(id, getIdFromAction(action)) && action.type === pattern
    )
    return take(matcher)
  }
}
