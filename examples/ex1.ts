import { Doc } from '../src'
import { link } from '@jacobbubu/scuttlebutt-pull'
import { delay } from './utils'

const main = async () => {
  const doc = new Doc({ id: 'doc' })
  const hoc = new Doc({ id: 'hoc' })
  const ds = doc.createStream({ name: 'd-h', wrapper: 'raw' })
  const hs = hoc.createStream({ name: 'h-d', wrapper: 'raw' })

  link(ds, hs)
  doc.add({ id: 'abc', hello: 3 })
  await delay(100)

  console.log(hoc.toJSON())
}

// tslint:disable-next-line no-floating-promises
main()
