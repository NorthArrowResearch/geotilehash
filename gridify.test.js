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
  const minLat = lib.tile2lat(0, 0)

  expect(lib.gridify(-180, minLat - 0.0000001)).toBe('0000000000000000')
  expect(lib.gridify(0, minLat - 0.0000001)).toBe('1000000000000000')
  expect(lib.gridify(-180, 0)).toBe('2000000000000000')
  expect(lib.gridify(0, 0)).toBe('3000000000000000')

  const minVal = 0.000000000001
  expect(lib.gridify(-minVal, minVal)).toBe('0333333333333333')
  expect(lib.gridify(minVal, minVal)).toBe('1222222222222222')
  expect(lib.gridify(-minVal, -minVal)).toBe('2111111111111111')
  expect(lib.gridify(minVal, -minVal)).toBe('3000000000000000')
})

test('degridify', () => {
  const minLat = lib.tile2lat(0, 0)
  expect(lib.degridify('0').bounds).toEqual([-180, minLat, 0, 0])
  expect(lib.degridify('1').bounds).toEqual([0, minLat, 180, 0])
  expect(lib.degridify('2').bounds).toEqual([-180, 0, 0, -minLat])
  expect(lib.degridify('3').bounds).toEqual([0, 0, 180, -minLat])

  expect(lib.degridify('00').bounds).toEqual([-180, minLat, -90, 66.51326044311186])

  // Try to find stanley park. I use Mapbox's debug tile boundaries layer to figure this stuff out
  // look for The beaver lake viewpoint
  const c = lib.gridify(-123.13901424407958, 49.304195417949884)
  const degrid = lib.degridify(c)
  expect(degrid.bounds).toEqual([-123.1402587890625, 49.30721745093608, -123.134765625, 49.303635761871256])
  expect(degrid.tiles).toEqual([16, 10351, 22421])
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
  expect(lib.smallestHash(createBounds(c, 10))).toBe(gridified.slice(0, 3))

  // 0.01 degree Arc
  expect(lib.smallestHash(createBounds(c, 0.01))).toBe(gridified.slice(0, 11))

  // So small it doesn't register
  expect(lib.smallestHash(createBounds(c, 0.001))).toBe(gridified)

  // Nothing. We cross the 0 0  line and so we have everythign in common
  expect(lib.smallestHash([-0.01, -0.01, 0.01, 0.01])).toBe('')
})

test('getRelevantHashes', () => {
  // One set of coordinates should return a single tile at max zoom:
  const test1In = [0, 0, 0, 0]
  const test1Out = lib.getRelevantHashes(test1In)
  // getRelevantHelper(test1In, test1Out)
  expect(test1Out).toEqual(['3000000000000000'])

  // Horizontally displaced. Should return 2 tiles horizonally:
  const test2In = [0, 0, 0.1, 0]
  const test2Out = lib.getRelevantHashes(test2In)
  // getRelevantHelper(test2In, test2Out)
  expect(test2Out).toEqual(['300000000000', '300000000001'])

  // Vertically displaced. Should return 2 tiles vertically:
  const test3In = [0, 0, 0, -0.1]
  const test3Out = lib.getRelevantHashes(test3In)
  // getRelevantHelper(test3In, test3Out)
  expect(test3Out).toEqual(['300000000000', '300000000002'])

  // Quad spread. Should return 4 tile:
  const test4In = [10, 10, -10, -10]
  const test4Out = lib.getRelevantHashes(test4In)
  // getRelevantHelper(test4In, test4Out)
  expect(test4Out).toEqual(['12222', '03333', '30000', '21111'])

  // // 4 tiles at z 6: 6/9/21  6/10/21 6/9/22 6/10/22
  const tile4Input = [ -125.20019531249999, 46.56641407568593, -119.783935546875, 49.880477638742555 ]
  const tile4Output = lib.getRelevantHashes(tile4Input)
  // getRelevantHelper(tile4Input, tile4Output)
  expect(tile4Output).toEqual(['021221', '021230', '021203', '021212'])
})

test('MISC', () => {
  console.log(lib.getRelevantHashes([
    -115.53222656249999,
    31.203404950917395,
    -102.3486328125,
    42.00032514831621
  ]))
  // console.log(lib.degridify(''))
  expect(1).toBe(1)
})

const getRelevantHelper = (input, arr) => {
  console.log('input', input)
  arr.map(r => console.log(`[${r}] => `, lib.degridify(r)))
}
