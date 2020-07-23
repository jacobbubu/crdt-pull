import { Doc } from './doc'
import { Row, RowId, RowState, RowChanges } from './row'
import { Set, PossibleId, SetFilter } from './set'
import { between, randstr, strord, lo as lowChar, hi as highChar } from '@jacobbubu/between-ts'

type RowPointer = RowId | Row | RowState

function sort(array: Row[]) {
  return array.sort(function(a, b) {
    return strord(a.get('_sort'), b.get('_sort'))
  })
}

function id(obj: RowState) {
  return obj.id || obj._id || '_' + Date.now() + '_' + Math.round(Math.random() * 1000)
}

function find(ary: Row[], iter: (row: Row, index: string, ary: Row[]) => boolean) {
  for (let index in ary) {
    const row = ary[index]
    if (iter(row, index, ary)) return row
  }
  return null
}

function toKey(key?: RowPointer) {
  if ('string' === typeof key) return key

  if (key instanceof Row) return key?.get('_sort') as string

  // key is RowState
  if (key) {
    return key._sort === null ? undefined : key._sort
  } else {
    return undefined
  }
}

/*
  items are relative to each other,
  more like a linked list.
  although it is possible to make an
  index based interface, before after,
  etc is more natural
*/

type TestFunc = (M?: RowPointer, m?: RowPointer) => boolean

function max(ary: Row[], test: TestFunc, wantIndex: boolean = false) {
  let max = undefined
  let _max = -1
  if (!ary.length) return

  for (let i = 0; i < ary.length; i++) {
    if (test(max, ary[i])) {
      max = ary[(_max = i)]
    }
  }
  return wantIndex ? _max : max
}

export class Seq extends Set {
  constructor(doc: Doc, key: string | SetFilter, value: any) {
    super(doc, key, value)

    const self = this
    this.on('changes', function(row, changes) {
      if (!changes._sort) {
        return
      }

      sort(self._array)

      // check if there is already an item with this sort key.
      const prev = find(self._array, function(other: Row) {
        return other !== row && other.get('_sort') === row.get('_sort')
      })

      // nudge it forward if it has the same key.
      if (prev) {
        self.insert(row, prev, self.next(row))
      } else {
        self.emit('move', row)
      }
    })
  }

  insert(rowPointer: RowPointer, before?: PossibleId, after?: PossibleId) {
    const beforeId = toKey((before && (this.getRow(before) as RowPointer)) || lowChar)
    const afterId = toKey((after && (this.getRow(after) as RowPointer)) || highChar)

    // must get id from the doc,
    // because may be moving this item into this set.
    rowPointer = 'string' === typeof rowPointer ? this._doc.rows[rowPointer] : rowPointer

    // _sort is a key that is between beforeId and afterId
    const _sort = between(beforeId, afterId) + randstr(3)
    // add a random tail so it's hard
    // to concurrently add two items with the
    // same sort.

    let row: Row
    if (rowPointer instanceof Row) {
      row = rowPointer
      const changes: RowChanges = { _sort }
      if (this.key && row.get(this.key) !== this.value) {
        changes[this.key] = this.value
      }
      // merge changes
      row.set(changes)
    } else {
      // rowPointer is a value object
      const changes = rowPointer
      changes._sort = _sort
      if (this.key) {
        changes[this.key] = this.value
      }
      row = this.doc.set(id(changes), changes)
    }
    sort(this._array)
    return row
  }

  prev(key?: PossibleId) {
    const sortKey = toKey((this.getRow(key) as RowPointer) || highChar)
    // find the greatest item that is less than `key`.
    // since the list is kept in order,
    // a binary search is used.
    // think about that later
    return max(this._array, function(M, m) {
      if (toKey(m)! < sortKey!) {
        return M ? toKey(m)! > toKey(M)! : true
      } else {
        return false
      }
    })
  }

  next(key?: PossibleId) {
    const sortKey = toKey((this.getRow(key) as RowPointer) || lowChar)

    return max(this._array, function(M, m) {
      if (toKey(m)! > sortKey!) {
        return M ? toKey(m)! < toKey(M)! : true
      } else {
        return false
      }
    })
  }

  asArray() {
    return sort(this._array)
  }

  before(rowPointer: RowPointer, before: PossibleId) {
    return this.insert(rowPointer, this.prev(before), before)
  }

  after(rowPointer: RowPointer, after: PossibleId) {
    return this.insert(rowPointer, after, this.next(after))
  }

  first() {
    return this._array[0]
  }

  last() {
    return this._array[this._array.length - 1]
  }

  indexOf(rowOrId: RowId | Row) {
    return this._array.indexOf('string' === typeof rowOrId ? this._rows[rowOrId] : rowOrId)
  }

  at(i: number) {
    return this._array[i]
  }

  unshift(rowPointer: RowPointer) {
    return this.insert(rowPointer, lowChar, this.first())
  }

  push(rowPointer: RowPointer) {
    return this.insert(rowPointer, this.last(), highChar)
  }

  length() {
    return this._array.length
  }

  pop() {
    return this.remove(this.last())
  }

  shift() {
    return this.remove(this.first())
  }
}
