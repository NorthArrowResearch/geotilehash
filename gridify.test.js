const lib = require('./index')

test('long2tile', () => {
  // z= 0
  expect(lib.long2tile(0, 0)).toBe(0)
  expect(lib.long2tile(-180, 0)).toBe(0)
  expect(lib.long2tile(+180, 0)).toBe(1)

  expect(lib.long2tile(0, 1)).toBe(1)
  expect(lib.long2tile(-180, 1)).toBe(0)
  expect(lib.long2tile(+180, 1)).toBe(2)

  expect(lib.long2tile(0, 12)).toBe(2048)
  expect(lib.long2tile(-180, 12)).toBe(0)
  expect(lib.long2tile(180, 12)).toBe(Math.pow(2, 12))
})

test('lat2tile', () => {
  expect(lib.lat2tile(0, 0)).toBe(0)
  expect(lib.lat2tile(85, 0)).toBe(0)
  expect(lib.lat2tile(-85, 0)).toBe(0)

  expect(lib.lat2tile(0, 1)).toBe(1)
  expect(lib.lat2tile(85, 1)).toBe(0)
  expect(lib.lat2tile(-85, 1)).toBe(1)

  expect(lib.lat2tile(0, 12)).toBe(2048)
  expect(lib.lat2tile(85.051, 12)).toBe(0)
  expect(lib.lat2tile(-85.051, 12)).toBe(Math.pow(2, 12) - 1)
})

test('encode, decode single', () => {
  expect(lib.encodeSingleHash([0, 0])).toBe('0')
  expect(lib.encodeSingleHash([1, 0])).toBe('1')
  expect(lib.encodeSingleHash([0, 1])).toBe('2')
  expect(lib.encodeSingleHash([1, 1])).toBe('3')

  expect(lib.decodeSingleHash('0')).toEqual([0, 0])
  expect(lib.decodeSingleHash('1')).toEqual([1, 0])
  expect(lib.decodeSingleHash('2')).toEqual([0, 1])
  expect(lib.decodeSingleHash('3')).toEqual([1, 1])
})

test('Gridify tst z1', () => {
  expect(lib.gridify(0.00001, 0.000001)).toBe('0122222222222222')
  expect(lib.gridify(0.00001, -0.000001)).toBe('0300000000000000')
  expect(lib.gridify(-0.00001, 0.000001)).toBe('0033333333333333')
  expect(lib.gridify(-0.00001, -0.000001)).toBe('0211111111111111')
})

test('degridify', () => {
  const minLat = lib.tile2lat(0, 0)
  expect(lib.degridify('0').bounds).toEqual([-180, minLat, 180, -minLat])
  expect(lib.degridify('00').bounds).toEqual([-180, minLat, 0, 0])
  expect(lib.degridify('01').bounds).toEqual([0, minLat, 180, 0])
  expect(lib.degridify('02').bounds).toEqual([-180, 0, 0, -minLat])
  expect(lib.degridify('03').bounds).toEqual([0, 0, 180, -minLat])

  expect(lib.degridify('000').bounds).toEqual([-180, minLat, -90, 66.51326044311186])

  const c = lib.gridify(-123.13901424407958, 49.304195417949884)
  console.log('HERE', c)
  expect(lib.degridify(c)).toEqual([-180, minLat, -90, 66.51326044311186])
})

test('smallestHash', () => {
  const c = [-123.13901424407958, 49.304195417949884]
  // This is the full precision result
  const gridified = lib.gridify(c[0], c[1])

  // little helper function
  const createBounds = (coords, delta) => [...coords, coords[0] + delta, coords[1] + delta]

  // 180 degree Arc. This is technically impossible
  expect(lib.smallestHash(createBounds(c, 40))).toBe('')

  // 40 degree Arc. This is so big it requires everything
  expect(lib.smallestHash(createBounds(c, 40))).toBe('')

  // 10 degree Arc
  expect(lib.smallestHash(createBounds(c, 10))).toBe(gridified.slice(0, 4))

  // 0.01 degree Arc
  expect(lib.smallestHash(createBounds(c, 0.01))).toBe(gridified.slice(0, 12))

  // So small it doesn't register
  expect(lib.smallestHash(createBounds(c, 0.001))).toBe(gridified)

  // 180 degree Arc. This is technically impossible
  expect(lib.smallestHash([-0.01, -0.01, 0.01, 0.01])).toBe('0')
})

test('getRelevantHashes', () => {
  const c = [0, 0]
  // This is the full precision result
  const gridified = lib.gridify(c[0], c[1])
  // little helper function

  expect(lib.getRelevantHashes([0, 0, 0.1, 0.00000001])).toEqual(['300000000000', '300000000002'])
  expect(lib.getRelevantHashes([0, 0, 0.00000001, 0.1])).toEqual(['300000000000', '300000000001'])

  // const resultExpect1 = lib.getRelevantHashes([0, 0, 0.00000001, 0.1])
  // const resultExpect2Wide = lib.getRelevantHashes([0, 0, 0.00000001, 0.1])
  // const resultExpect2Tall = lib.getRelevantHashes([0, 0, 0.00000001, 0.1])

  // 4 tiles at z 6: 6/9/21  6/10/21 6/9/22 6/10/22
  const resultExpect4 = lib.getRelevantHashes([ -125.20019531249999, 46.56641407568593, -119.783935546875, 49.880477638742555 ])

  resultExpect4.map(r => console.log(`---${r}`, lib.degridify(r)))
})
