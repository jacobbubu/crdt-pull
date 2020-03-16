import { Doc } from '../src'
import { link } from '@jacobbubu/scuttlebutt-pull'
import { delay } from './utils'

const main = async () => {
  const doc = new Doc({ id: 'doc' })
  const hoc = new Doc({ id: 'hoc' })
  const ds = doc.createStream({ name: 'd-h' })
  const hs = hoc.createStream({ name: 'h-d' })

  link(ds, hs)
  doc.add({ id: 'a', tag: 'h1', text: 'Chapter_1', color: 'red' })
  doc.add({ id: 'a1', tag: 'h2', text: 'Paragraph_1' })
  doc.add({ id: 'b', tag: 'h1', text: 'Chapter_2', color: 'yellow' })

  const h1Set = hoc.createSet('tag', 'h1')

  await delay(10)

  h1Set.forEach(function(row) {
    row.set('color', 'black')
    // row.set('tag', 'h3')
    // row.set({ ...row.state, fontSize: 16, fontFamily: 'Helvetica' })
  })

  console.log('h1 tags:', h1Set.toJSON())

  await delay(10)

  console.log('whole doc:', doc.toJSON())
}

// tslint:disable-next-line no-floating-promises
main()
