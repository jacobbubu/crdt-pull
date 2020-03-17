import { Doc, Seq } from '../src'
import { link } from '@jacobbubu/scuttlebutt-pull'
import { delay } from './utils'

const main = async () => {
  const doc = new Doc({ id: 'doc' })
  const hoc = new Doc({ id: 'hoc' })
  const ds = doc.createStream({ name: 'd-h' })
  const hs = hoc.createStream({ name: 'h-d' })

  const todosOnDoc = new Seq(doc, 'tag', 'todo')
  const todosOnHoc = hoc.createSeq('tag', 'todo')

  todosOnDoc.push({ id: 'b', tag: 'todo', text: 'start project X' })
  todosOnDoc.unshift({ id: 'd', text: 'have dinner with my mom' })

  console.log('todosOnDoc:', todosOnDoc.toJSON())
  console.log('last on todosOnDoc:', todosOnDoc.last().state)

  link(ds, hs)

  await delay(10)

  console.log('todosOnHoc:', todosOnHoc.toJSON())
  console.log('last on todosOnHoc:', todosOnHoc.last().state)
}

// tslint:disable-next-line no-floating-promises
main()
