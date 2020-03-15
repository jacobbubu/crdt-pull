import { Doc, Set, Seq, Row, RowId, RowState } from '../src'

/*
  each function should accept the row, or the id.
*/
function id(e: Row) {
  return Math.random() < 0.5 ? e : e && e.id
}

function validateNextPrev(seq: Seq) {
  seq.forEach(function(e) {
    expect(seq.next(id(e))).toBe(seq.at(seq.indexOf(id(e)) + 1))
    expect(seq.prev(id(e))).toBe(seq.at(seq.indexOf(id(e)) - 1))

    expect(seq.prev(seq.next(id(e)))).toBe(e)
    expect(seq.next(seq.prev(id(e)))).toBe(e)
  })
}

describe('set', () => {
  it('basic', () => {
    function go() {
      const doc = new Doc()
      const seq = new Seq(doc, 'type', 'thing')

      const A = seq.push({ id: 'a', type: 'thing', what: 3 })
      const B = seq.push({ id: 'b', type: 'thing', what: 4 })
      const C = seq.unshift({ id: 'c', type: 'thing', what: 2 })

      expect(seq.first()).toBe(C)
      expect(seq.last()).toBe(B)
      expect(seq.indexOf(id(A))).toBe(1)

      seq.remove({ id: 'c' })
      expect(seq.first()).toBe(A)

      seq.push(C)

      expect(seq.last().id).toBe(C.id)

      const _C = seq.pop()
      expect(_C).toBe(C)

      expect(seq.length()).toBe(2)

      const _A = seq.shift()
      expect(_A).toBe(A)
      expect(seq.length()).toBe(1)
    }

    /*
      if two users insert a item into the same place concurrently
      it will get the same sort.
      in that case it should be sorted by the timestamp that the _sort
      was updated.

      if you try to insert an item between two items with equal
      _sort, it is necessary to nudge them apart...
    */
    // was getting intermittent failures,
    // so run this test heaps, to catch it.
    let l = 122
    while (l--) go()
  })

  it('push', () => {
    const doc = new Doc()
    const seq = new Seq(doc, 'type', 'thing')

    const A = seq.push({ id: 'a', type: 'thing', what: 3 })
    const B = seq.push({ id: 'b', type: 'thing', what: 4 })
    const C = seq.push({ id: 'c', type: 'thing', what: 2 })

    expect(seq.next()).toBe(A)
    expect(seq.next(id(A))).toBe(B)
    expect(seq.next(id(B))).toBe(C)

    expect(seq.prev()).toBe(C)
    expect(seq.prev(id(B))).toBe(A)
    expect(seq.prev(id(C))).toBe(B)

    validateNextPrev(seq)
  })

  it('collision', () => {
    const doc = new Doc()
    const seq = new Seq(doc, 'type', 'thing')

    const A = seq.push({ id: 'a', type: 'thing', what: 3 })
    const C = seq.push({ id: 'c', type: 'thing', what: 2 })

    C.set({ _sort: A.get('_sort') }) // this may be the easiest place to nudge the items apart.

    expect(A.get('_sort') !== C.get('_sort'))

    expect(() => {
      seq.insert({ id: 'd', type: 'thing', what: 6 }, A, C)
    }).toThrow(/Impossible*/)
  })

  /*
  insert before.

*/

  // function sync(array: [], seq: Seq) {
  //   const r: Record<string, Function> = {};
  //   "pop,push,shift,unshift".split(",").forEach(function(method) {
  //     r[method] = function(row: Row | undefined) {
  //       (seq as any)[method](/push|unshift/.test(method) ? row : id(row));
  //       array[method](row);
  //       if (row) {
  //         expect(array.indexOf(row)).toBe(seq.indexOf(row.id))
  //       }
  //       expect(seq.toJSON()).toBe(array)
  //     };
  //   });
  //   return r;
  // }
  //   it('random', () => {
  //     const doc = new Doc()
  //     const seq = new Seq(doc, 'type', 'thing')
  //     const ary = []

  //   })
})
