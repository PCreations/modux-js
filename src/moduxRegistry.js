import archy from 'archy'

const moduxRegistry = () => {
  const moduxes = {}
  const moduxesNames = {}
  const adjacencyMap = {}
  const familyCache = {}

  return {
    __debug__: {
      moduxes,
      moduxesNames,
      adjacencyMap,
      familyCache,
      logTree() {
        let treeRoot
        for (let key of Object.keys(adjacencyMap)) {
          if (!(adjacencyMap[key] in adjacencyMap)) {
            treeRoot = adjacencyMap[key]
            break
          }
        }
        const makeTree = (parent) => {
          let nodes = []
          for (let key of Object.keys(adjacencyMap)) {
            if (adjacencyMap[key] === parent) {
              nodes.push(makeTree(key))
            }
          }
          return {
            label: (moduxesNames[parent] || 'root') + ' | ' + parent,
            nodes
          }
        }
        console.log(archy(makeTree(treeRoot)))
      }
    },
    add(parentId, modux, mountPoint) {
      adjacencyMap[modux.id] = parentId
      moduxes[modux.id] = modux
      moduxesNames[modux.id] = mountPoint
    },
    get(id) {
      return moduxes[id]
    },
    isChild(myId, id) {
      if (myId === id) return true
      if (myId in (familyCache[id] || [])) return true

      let currentNode = adjacencyMap[id]
      while (typeof currentNode !== 'undefined' && currentNode !== myId) {
        currentNode = adjacencyMap[currentNode]
      }
      if (currentNode === myId) {
        familyCache[id] = [
          ...(familyCache[id] || []),
          myId
        ]
        return true
      }
      return false
    }
  }
}

global.ModuxRegistry = moduxRegistry()
export default global.ModuxRegistry
