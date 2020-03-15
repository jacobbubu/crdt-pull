import { EventEmitter } from 'events'
import { strord } from '@jacobbubu/between-ts'
import { Doc } from './doc'
import { Row, RowId, RowState } from './row'

export type RowIdParam = RowId | number | Row

export type SetFilter = (rowState: RowState) => boolean

export type IterFunc = (value: Row, index: number, array: Row[]) => void

export class Set extends EventEmitter {
  protected _key: string | null
  protected _rows: Record<RowId, Row> = {}
  protected _array: Row[] = []
  protected _filter?: SetFilter

  constructor(protected _doc: Doc, key: string | SetFilter, protected _value?: any) {
    super()
    if ('function' === typeof key) {
      this._filter = key
      this._key = null
    } else {
      // DO NOT CHANGE once you have created the set.
      this._key = key
    }

    const self = this as Set
    if (!self.filter) {
      const eventName = key as string
      this._doc.sets.on(eventName, (row: Row, changed: RowState) => {
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

    function remove(_: RowState | null, changed: RowState) {
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

  getRow(id?: RowIdParam | RowState) {
    if (!arguments.length) {
      return this._array
    }

    return 'string' === typeof id
      ? this._rows[id]
      : 'number' === typeof id
      ? this._rows[id.toString()]
      : id && id.id // is a row object
      ? this._rows[id.id]
      : null
  }

  remove(id: RowIdParam | RowState) {
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
    this.on('add', callback)
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

  has(row: RowIdParam) {
    return this.getRow(row)
  }
}
