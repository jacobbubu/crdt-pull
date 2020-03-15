import {
  Scuttlebutt,
  filter,
  createId,
  Update,
  ScuttlebuttOptions,
  Sources,
  order,
  sort,
  UpdateItems
} from '@jacobbubu/scuttlebutt-pull'
import { Row, RowId, RowValue, RowState } from './row'
import { Set, SetFilter } from './set'
import { Seq } from './seq'
import { merge } from './utils'
import { EventEmitter } from 'events'

export enum DocItems {
  Id,
  Changes
}

type Sets = { [setId: string]: Set } & EventEmitter

export class Doc extends Scuttlebutt {
  private _rows: Record<RowId, Row> = {}
  private _sets: Sets = new EventEmitter() as Sets
  private _hist: Record<RowId, Record<string, Update>> = {}

  constructor(opts?: ScuttlebuttOptions) {
    super(opts)
    this.setMaxListeners(Infinity)
  }

  get rows() {
    return this._rows
  }

  get sets() {
    return this._sets
  }

  add(initial: RowState) {
    const id = initial.id === undefined ? createId() : initial.id
    const r = this._add(id)
    r._set(initial)
    return r
  }

  _add(id: RowId | Row) {
    const doc = this

    let r: Row
    if (typeof id === 'string') {
      if (this._rows[id]) {
        return this._rows[id]
      }
      r = new Row(id)
    } else if (id instanceof Row) {
      r = id
    } else {
      throw new TypeError('id must be an instance of Row or a string')
    }
    this._rows[r.id] = r

    // any further changes occurred on this row will trigger this event
    function track(changes: RowValue) {
      doc.localUpdate([r.id, changes])
    }

    r.on('preupdate', track)

    r.on('remove', function() {
      r.removeAllListeners('preupdate')
    })

    r.new = true
    return r
  }

  set(id: RowId, change: RowState | null) {
    const r = this._add(id)
    return r.set(change)
  }

  rm(id: RowId) {
    this.set(id, null)
  }

  get(id: RowId) {
    return (this._rows[id] = this._rows[id] || this._add(new Row(id)))
  }

  toJSON() {
    const j: Record<string, any> = {}
    for (let k in this._rows) {
      if (this._rows.hasOwnProperty(k)) {
        j[k] = this._rows[k].state
      }
    }
    return j
  }

  _set(key: string | SetFilter, val: any, type: typeof Set) {
    // tslint:disable-next-line strict-type-predicates
    const id = typeof key === 'string' && key + ':' + val
    if (id && this._sets[id]) {
      return this._sets[id]
    }
    const set = new type(this, key, val)

    if (id) {
      this._sets[id] = set
    }
    return set
  }

  createSet(key: string | SetFilter, val?: string) {
    return this._set(key, val, Set)
  }

  createSeq(key: string, val: string) {
    return this._set(key, val, Seq)
  }

  applyUpdate(update: Update) {
    // apply an update to a row.
    // take into account history.
    // and insert the change into the correct place.
    if (
      !(
        Array.isArray(update[UpdateItems.Data]) &&
        'string' === typeof update[UpdateItems.Data][DocItems.Id]
      )
    ) {
      this.emit('invalid', new Error('invalid update'))
      return false
    }

    const [id, changes]: [RowId, RowState | null] = update[UpdateItems.Data]

    const changed: Record<string, any> = {}
    const row = this._add(id)

    const hist = (this._hist[id] = this._hist[id] || {})
    let emit = false

    if (changes === null) {
      // clean up the history
      for (let key in row.state) {
        if (row.state.hasOwnProperty(key)) {
          if (!hist[key] || order(hist[key], update) < 0) {
            if (hist[key]) {
              this.emit('_remove', hist[key])
            }
            hist[key] = [null, update[1], update[2]]
            emit = true
          }
        }
      }
      // remove from all sets that contain row
      for (let setId in this._sets) {
        const isSet = setId.indexOf(':') > 0
        const set = this._sets[setId]
        const setContainsRow = isSet && set && set.getRow(row.id)
        if (setContainsRow) {
          set.remove(row)
        }
      }

      // delete from the doc rows
      delete this._rows[id]
      row.emit('removed')
      this.emit('remove', row)
    } else {
      const maybe = []
      for (let key in changes) {
        if (changes.hasOwnProperty(key)) {
          const value = changes[key]

          if (!hist[key] || order(hist[key], update) < 0) {
            if (hist[key] && maybe.indexOf(hist[key]) === -1) {
              maybe.push(hist[key])
            }
            hist[key] = update
            changed[key] = value

            emit = true
          }
        }
      }

      const h = this.history({})

      const self = this
      maybe.forEach(function(e) {
        if (h.indexOf(e) === -1) {
          self.emit('_remove', e)
        }
      })
    }

    merge(row.state, changed)
    for (let k in changed) {
      this._sets.emit(k, row, changed)
    }

    if (!emit) {
      return false
    }

    if (row.new) {
      this.emit('add', row)
      this.emit('create', row) // alias
      row.new = false
    }

    this.emit('_update', update)

    row.emit('update', update, changed)
    row.emit('changes', changes, changed)
    row.emit('change', changed) // installing this in parallel, so tests still pass.
    // will depreciate the old way later.
    this.emit('raw_update', update)
    this.emit('update', row)

    return false
  }

  history(sources: Sources) {
    const h = []

    for (let id in this._hist) {
      const hist = this._hist[id]

      for (let k in hist) {
        if (h.indexOf(hist[k]) === -1 && filter(hist[k], sources)) {
          h.push(hist[k])
        }
      }
    }
    return sort(h)
  }
}
