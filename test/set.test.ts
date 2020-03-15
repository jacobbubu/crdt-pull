import { Doc, Set, RowState } from '../src'

describe('set', () => {
  const doc = new Doc()
  const set = doc.createSet('type', 'thing')
  const set2 = doc.createSet('type', 'other')

  function subscribe(set: Set, eventName: string, fn: Function) {
    set.on(eventName, fn as any)
    return function unsubscribe() {
      set.removeListener(eventName, fn as any)
    }
  }

  it('basic', () => {
    const setOnAdd = jest.fn()
    const setOnRemove = jest.fn()

    const unsubFns = [
      subscribe(set, 'add', setOnAdd),
      subscribe(set2, 'add', setOnAdd),
      subscribe(set, 'remove', setOnRemove),
      subscribe(set2, 'remove', setOnRemove)
    ]

    doc.add({ id: 'a', type: 'thing', what: 3 })
    doc.add({ id: 'b', type: 'thing', what: 5 })
    doc.add({ id: 'a', type: 'other', what: 7 })
    doc.add({ id: 'c', type: 'thing', what: 9 })

    const rowA = doc.get('a')
    const rowB = doc.get('b')
    const rowC = doc.get('c')

    expect(set.toJSON()).toEqual([
      { id: 'b', type: 'thing', what: 5 },
      { id: 'c', type: 'thing', what: 9 }
    ])

    expect(set2.toJSON()).toEqual([{ id: 'a', type: 'other', what: 7 }])

    expect(setOnAdd).toHaveBeenCalledTimes(4)
    expect(setOnAdd.mock.calls[0][0]).toBe(rowA)
    expect(setOnAdd.mock.calls[1][0]).toBe(rowB)
    expect(setOnAdd.mock.calls[2][0]).toBe(rowA)
    expect(setOnAdd.mock.calls[3][0]).toBe(rowC)

    expect(setOnAdd.mock.calls[0][0]).toBe(rowA)

    expect(setOnRemove.mock.calls[0][0]).toBe(rowA)

    unsubFns.map(unsub => unsub())
  })

  it('filters', () => {
    const doc = new Doc()

    const set = doc.createSet(state => {
      return state.type === 'thing' && state.what <= 5
    })
    const set2 = doc.createSet(state => {
      return state.type === 'other' && state.what > 8
    })

    doc.add({ id: 'a', type: 'thing', what: 3 })
    doc.add({ id: 'b', type: 'thing', what: 5 })
    // overwrite the first 'a'
    doc.add({ id: 'a', type: 'other', what: 7 })
    doc.add({ id: 'c', type: 'thing', what: 9 })

    expect(set.toJSON()).toEqual([{ id: 'b', type: 'thing', what: 5 }])
    expect(set2.toJSON()).toEqual([])
  })

  it('set caching', () => {
    const doc = new Doc()

    const set1 = doc.createSet('foo', 'bar')
    const set2 = doc.createSet('foo', 'bar')

    expect(set1).toBe(set2)

    const set3 = doc.createSet(state => false)
    const set4 = doc.createSet(state => false)
    expect(set3 === set4).toBeFalsy()
  })

  it('create set later', () => {
    const doc = new Doc()

    doc.add({ id: 'a', type: 'thing', what: 3 })
    doc.add({ id: 'b', type: 'thing', what: 5 })
    // overwrite the first 'a'
    doc.add({ id: 'a', type: 'other', what: 7 })
    doc.add({ id: 'c', type: 'thing', what: 9 })

    const set = doc.createSet('type', 'thing')
    const states: RowState = []

    set.onEach(function(row, state) {
      states.push(row.state)
    })

    expect(states).toEqual([
      { id: 'b', type: 'thing', what: 5 },
      { id: 'c', type: 'thing', what: 9 }
    ])
  })
})
