import { Doc } from '../src'
import { link } from '@jacobbubu/scuttlebutt-pull'
import { delay } from './utils'

describe('simple', () => {
  it('sync', async () => {
    const doc = new Doc()
    const hoc = new Doc()
    const ds = doc.createStream()
    const hs = hoc.createStream()

    link(ds, hs)

    doc.add({ id: 'abc', hello: 3 })
    await delay(10)
    expect(hoc.toJSON()).toEqual(doc.toJSON())

    hoc.set('abc', { goodbye: 5 })
    await delay(10)
    expect(hoc.toJSON()).toEqual(doc.toJSON())

    const moc = new Doc()
    const hs2 = hoc.createStream()
    const ms = moc.createStream()

    link(hs2, ms)
    await delay(10)

    expect(moc.toJSON()).toEqual(doc.toJSON())
  })

  it('listen', done => {
    const doc = new Doc()
    const hoc = new Doc()
    const ds = doc.createStream()
    const hs = hoc.createStream()

    const random = Math.random()
    const thing = doc.get('thing')

    thing.on('changes', function(changes, changed) {
      expect(changes).toEqual(changed)
      expect(changes).toEqual({ id: 'thing', random })
      expect(thing.get('random')).toBe(random)
      done()
    })

    link(ds, hs)
    hoc.add({ id: 'thing', random })
  })

  it('single row', async () => {
    const doc = new Doc()
    const hoc = new Doc()
    const ds = doc.createStream()
    const hs = hoc.createStream()

    const random = Math.random()
    const thing = doc.get('thing')

    link(ds, hs)

    thing.set({
      whatever: Math.random(),
      prop: 'value',
      number: Math.floor(Math.random() * 92)
    })

    await delay(10)

    const hThing = hoc.get('thing')
    expect(hThing.toJSON()).toEqual(thing.toJSON())

    const hThing2 = hoc.get('thing2').set({ random: Math.random() })
    const thing2 = doc.get('thing2')

    await delay(10)
    expect(hThing2.toJSON()).toEqual(thing2.toJSON())
  })
})
