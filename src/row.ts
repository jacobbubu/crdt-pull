import { EventEmitter } from 'events'
import { Update } from '@jacobbubu/scuttlebutt-pull'

export type RowId = string

export interface RowState {
  id: RowId
  // Seq uses _sort to maintain the relative order between rows
  _sort?: string | null

  [key: string]: any
}

export type RowChanges = Partial<RowState>

export interface Row {
  addListener(event: 'preupdate', listener: (changes: RowChanges | null) => void): this
  on(event: 'preupdate', listener: (changes: RowChanges | null) => void): this
  once(event: 'preupdate', listener: (changes: RowChanges | null) => void): this
  removeListener(event: 'preupdate', listener: (changes: RowChanges | null) => void): this
  off(event: 'preupdate', listener: (changes: RowChanges | null) => void): this
  emit(event: 'preupdate', changes: RowChanges | null): boolean

  addListener(event: 'removed', listener: () => void): this
  on(event: 'removed', listener: () => void): this
  once(event: 'removed', listener: () => void): this
  removeListener(event: 'removed', listener: () => void): this
  off(event: 'removed', listener: () => void): this
  emit(event: 'removed'): boolean

  addListener(event: 'update', listener: (update: Update, changed: RowChanges) => void): this
  on(event: 'update', listener: (update: Update, changed: RowChanges) => void): this
  once(event: 'update', listener: (update: Update, changed: RowChanges) => void): this
  removeListener(event: 'update', listener: (update: Update, changed: RowChanges) => void): this
  off(event: 'update', listener: (update: Update, changed: RowChanges) => void): this
  emit(event: 'update', update: Update, changed: RowChanges): boolean

  addListener(
    event: 'changes',
    listener: (changes: RowChanges | null, changed: RowChanges) => void
  ): this
  on(event: 'changes', listener: (changes: RowChanges | null, changed: RowChanges) => void): this
  once(event: 'changes', listener: (changes: RowChanges | null, changed: RowChanges) => void): this
  removeListener(
    event: 'changes',
    listener: (changes: RowChanges | null, changed: RowChanges) => void
  ): this
  off(event: 'changes', listener: (changes: RowChanges | null, changed: RowChanges) => void): this
  emit(event: 'changes', changes: RowChanges | null, changed: RowChanges): boolean

  addListener(event: 'change', listener: (changed: RowChanges) => void): this
  on(event: 'change', listener: (changed: RowChanges) => void): this
  once(event: 'change', listener: (changed: RowChanges) => void): this
  removeListener(event: 'change', listener: (changed: RowChanges) => void): this
  off(event: 'change', listener: (changed: RowChanges) => void): this
  emit(event: 'change', changed: RowChanges): boolean
}

export class Row extends EventEmitter {
  public new: boolean = false
  public state: RowState

  constructor(id: RowId) {
    super()
    this.state = { id }
    this.setMaxListeners(Infinity)
  }

  get id() {
    return this.state.id
  }

  set(changes: string | RowChanges | null, v?: any): Row {
    let newChanges: RowChanges | null
    if (typeof changes === 'string') {
      const key = changes
      newChanges = {}
      newChanges[key] = v
    } else {
      newChanges = changes
    }

    // tslint:disable-next-line strict-type-predicates
    if (newChanges !== null && newChanges.id && newChanges.id !== this.state.id) {
      throw new Error('id cannot be changed')
    }

    this._set(newChanges)
    return this
  }

  _set(changes: RowChanges | null): Row {
    // the change is applied by the Doc!
    this.emit('preupdate', changes)
    return this
  }

  get(key?: string) {
    return key ? this.state[key] : this.state
  }

  toJSON() {
    return this.state
  }
}
