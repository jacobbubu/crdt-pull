# @jacobbubu/crdt-pull

[![Build Status](https://travis-ci.org/jacobbubu/crdt-pull.svg)](https://travis-ci.org/jacobbubu/crdt-pull)
[![Coverage Status](https://coveralls.io/repos/github/jacobbubu/crdt-pull/badge.svg)](https://coveralls.io/github/jacobbubu/crdt-pull)
[![npm](https://img.shields.io/npm/v/@jacobbubu/crdt-pull.svg)](https://www.npmjs.com/package/@jacobbubu/crdt-pull/)

> Rewritten [crdt](https://github.com/dominictarr/crdt) in TypeScript and work with [scuttlebutt-pull](https://github.com/jacobbubu/scuttlebutt-pull)

## Intro.

``

## Usage

```bash
npm install @jacobbubu/crdt-pull
```

``` ts
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
```

Please see the test cases  for the detail.
