import { EventEmitter } from 'events'
import { strord } from '@jacobbubu/between-ts'
import { Doc, Rows } from './doc'
import { Row, RowId, RowState, RowChanges } from './row'

export type PossibleId = RowId | number | Row | RowState

export type SetFilter = (rowState: RowState) => boolean

export type IterFunc = (value: Row, index: number, array: Row[]) => void

export interface Set {
  addListener(event: 'add' | 'remove' | 'move', listener: (row: Row) => void): this
  on(event: 'add' | 'remove' | 'move', listener: (row: Row) => void): this
  once(event: 'add' | 'remove' | 'move', listener: (row: Row) => void): this
  removeListener(event: 'add' | 'remove' | 'move', listener: (row: Row) => void): this
  off(event: 'add' | 'remove' | 'move', listener: (row: Row) => void): this
  emit(event: 'add' | 'remove' | 'move', row: Row): boolean

  addListener(event: 'changes', listener: (row: Row, changed: RowChanges) => void): this
  on(event: 'changes', listener: (row: Row, changed: RowChanges) => void): this
  once(event: 'changes', listener: (row: Row, changed: RowChanges) => void): this
  removeListener(event: 'changes', listener: (row: Row, changed: RowChanges) => void): this
  off(event: 'changes', listener: (row: Row, changed: RowChanges) => void): this
  emit(event: 'changes', row: Row, changed: RowChanges): boolean
}

export class Set extends EventEmitter {
  protected readonly _key: string | null
  protected readonly _rows: Rows = {}
  protected readonly _array: Row[] = []
  protected readonly _filter?: SetFilter

  constructor(
    protected readonly _doc: Doc,
    key: string | SetFilter,
    private readonly _value?: any
  ) {
    super()

    if ('function' === typeof key) {
      this._filter = key
      this._key = null
    } else {
      // DO NOT CHANGE once you have created the set.
      this._key = key
    }

    const self = this
    if (!self.filter) {
      const eventName = key as string
      this._doc.setsEvent.on(eventName, (row: Row, changed: RowChanges) => {
        if (changed[eventName] !== _value) {
          return
        }
        self.add(row)
      })
    } else {
      this._doc.on('create', function(row: Row) {
        if (self.filter!(row.state)) {
          self.add(row)
        }
      })
    }

    for (let id in _doc.rows) {
      const row = _doc.get(id)
      if (self.key && row.get(self.key) === _value) {
        self.add(row)
      } else if (self.filter && self.filter(row.state)) {
        self.add(row)
      }
    }
    this.setMaxListeners(Infinity)
  }

  public get doc() {
    return this._doc
  }

  get key() {
    return this._key
  }

  get value() {
    return this._value
  }

  get filter() {
    return this._filter
  }

  add(row: Row) {
    if (this._rows[row.id]) {
      return
    }

    this._array.push(row)
    this._rows[row.id] = row
    this.emit('add', row)

    const self = this

    function remove(_: RowChanges | null, changed: RowChanges) {
      const key = self.key
      if ((key && row.state[key] === self.value) || (self.filter && self.filter(row.state))) {
        self.emit('changes', row, changed)
        return
      }
      delete self._rows[row.id]
      const i = self._array.indexOf(row)
      if (~i) self._array.splice(i, 1)
      self.emit('changes', row, changed)
      self.emit('remove', row)
      row.removeListener('changes', remove)
    }

    row.on('changes', remove)
  }

  getRow(id?: PossibleId) {
    if (!arguments.length) {
      return this._array
    }
    switch (typeof id) {
      case 'undefined':
        return null
      case 'string':
        return this._rows[id]
      case 'number':
        return this._rows[id.toString()]
      default:
        if (id instanceof Row) {
          return id
        } else if (id.id) {
          return this._rows[id.id]
        } else {
          return null
        }
    }
  }

  remove(id?: PossibleId) {
    if (!arguments.length) {
      return
    }
    const row = this.getRow(id) as Row
    if (!row) {
      return
    }
    if (this._key) {
      return row.set(this._key, null)
    } else {
      throw new Error('Set cannot remove rows with arbitrary filters')
    }
  }

  forEach(iter: IterFunc) {
    return this._array.forEach(iter)
  }

  onEach(callback: IterFunc) {
    this.forEach(callback)
    this.on('add', row => {
      callback(row, this._array.length - 1, this._array)
    })
  }

  asArray() {
    return this._array
  }

  toJSON() {
    return this._array
      .map(function(e) {
        return e.state
      })
      .sort(function(a, b) {
        return strord(a._sort || a.id, b._sort || b.id)
      })
  }

  has(row: PossibleId) {
    return this.getRow(row)
  }
}
