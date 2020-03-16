import { EventEmitter } from 'events'

export type RowId = string

export interface RowState {
  _sort?: string | null
  [key: string]: any
}

export interface RowValue extends RowState {
  id: RowId
}

export class Row extends EventEmitter {
  public new: boolean = false
  public state: RowValue

  constructor(public id: RowId) {
    super()
    this.state = { id }
    this.setMaxListeners(Infinity)
  }

  // 这里干了半天，最终会触发 doc 的 localUpdate，触发 applyUpdate，然后把 changes merge 回到 row.state
  // 这个 set 方法是用来本地改变 row 的值的
  set(changes: string | RowState | null, v?: any): Row {
    let newChanges: RowState | null
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

  _set(changes: RowState | null): Row {
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
