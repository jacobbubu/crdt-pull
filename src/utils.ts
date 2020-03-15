export function merge(to: Record<string, any>, from: Record<string, any>) {
  for (let k in from) {
    to[k] = from[k]
  }
  return to
}
