
const MAXZOOM = 16

function long2tile (lon, zoom) {
  const output = (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)))
  return output >= 0 && output <= Math.pow(2, zoom) ? output : null
}
function lat2tile (lat, zoom) {
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)))
  // return output >= 0 && output <= Math.pow(2, zoom) ? output : null
}

function tile2long (x, z) {
  return (x / Math.pow(2, z) * 360 - 180)
}
function tile2lat (y, z) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
}

function encodeSingleHash ([relLngTile, relLatTile]) {
  return (2 * relLatTile + relLngTile).toString(4)
}

function decodeSingleHash (hashChar) {
  const code = parseInt(hashChar, 4)
  const relLngTile = code % 2
  const relLatTile = (code - relLngTile) / 2
  return [ relLngTile, relLatTile ]
}

/**
 * Turn a lat/lng into a hex code
 * We're covering 16 character hashes (from zoom 0-16)
 * @param {*} lng
 * @param {*} lat
 */
function gridify (lng, lat, maxZoom = MAXZOOM) {
  // console.log('gridify', lng, lat)
  let hArr = []

  // Push the raw tile numbers into an array
  for (let z = 0; z <= MAXZOOM; z++) {
    hArr.push([
      long2tile(lng, z),
      lat2tile(lat, z)
    ])
  }
  // console.log(hArr[1])
  return hArr.map((a, idz) => {
    if (idz === 0) {
      // We skip the first one because there's only one tile and save ourselves
      // a character in the DB
      return '' // (4 * a[0] + a[1]).toString(4)
    }
    else {
      const [lastLngTile, lastLatTile] = hArr[idz - 1]
      const relLngTile = a[0] - ((lastLngTile / Math.pow(2, idz)) * Math.pow(2, idz + 1))
      const relLatTile = a[1] - ((lastLatTile / Math.pow(2, idz)) * Math.pow(2, idz + 1))
      return encodeSingleHash([relLngTile, relLatTile])
    }
  }).join('')
}

/**
 * Turn a hashval into a bounding box window
 * @param {*} hashVal
 */
function degridify (hashVal) {
  const hArr = []
  hashVal.toLowerCase().split('').forEach((hash, z) => {
    const [relLngTile, relLatTile] = decodeSingleHash(hash)
    if (z === 0) hArr.push([relLngTile, relLatTile])
    else {
      const [lastLngTile, lastLatTile] = hArr[z - 1]
      hArr.push([
        relLngTile + ((lastLngTile / Math.pow(2, z - 1)) * Math.pow(2, z)),
        relLatTile + ((lastLatTile / Math.pow(2, z - 1)) * Math.pow(2, z))
      ])
    }
  })
  // console.log(hArr)
  const finalZoom = hArr.length
  const bounds = [
    tile2long(hArr[hArr.length - 1][0], finalZoom),
    tile2lat(hArr[hArr.length - 1][1], finalZoom),
    tile2long(hArr[hArr.length - 1][0] + 1, finalZoom),
    tile2lat(hArr[hArr.length - 1][1] + 1, finalZoom)
  ]
  const tiles = [
    hashVal.length,
    hArr[hArr.length - 1][0],
    hArr[hArr.length - 1][1]
  ]
  return {
    bounds,
    tiles
  }
}

/**
 * This returns the smallest hash from a bounds
 * We can't really use this because tiles of lower magnitude share corners
 * with ones of higher magnitude
 * @param {*} bounds
 */
function smallestHash (bounds) {
  const corner1 = gridify(bounds[0], bounds[1])
  const corner2 = gridify(bounds[2], bounds[3])
  // console.log(corner1, corner2)

  let idx = 0
  let result = ''
  while (idx < corner1.length && corner1[idx] === corner2[idx]) {
    result += corner1[idx]
    idx++
  }
  return result
}

/**
 * Find the smallest number of adjavent tiles that contain the bounding rectangle
 * @param {*} inBounds
 */
function getRelevantHashes (inBounds) {
  const corners = [
    gridify(inBounds[0], inBounds[1]),
    gridify(inBounds[2], inBounds[1]),
    gridify(inBounds[0], inBounds[3]),
    gridify(inBounds[2], inBounds[3])
  ]

  let zidbase = 0
  // Do a quick count to see how many characters we have in common to begin with
  while (
    zidbase < corners[0].length &&
    corners[0][zidbase] === corners[1][zidbase] &&
    corners[0][zidbase] === corners[2][zidbase] &&
    corners[0][zidbase] === corners[3][zidbase]
  ) zidbase++

  // Now find the minimum zoom where lat and lng for the corners are less than 1 tile apart
  let zdLng = zidbase
  // Remember we start at Zoom level 1 so there's an off-by-one problem here
  while (zdLng < MAXZOOM &&
    Math.abs(long2tile(inBounds[2], zdLng + 1) - long2tile(inBounds[0], zdLng + 1)) < 2
  ) {
    // console.log('zdLng', long2tile(inBounds[2], zdLng), long2tile(inBounds[0], zdLng), zdLng + 1)
    zdLng++
  }

  let zdLat = zidbase
  // Remember we start at Zoom level 1 so there's an off-by-one problem here
  while (zdLat < MAXZOOM &&
    Math.abs(lat2tile(inBounds[3], zdLat + 1) - lat2tile(inBounds[1], zdLat + 1)) < 2
  ) {
    // console.log('zdLat', lat2tile(inBounds[3], zdLat), lat2tile(inBounds[1], zdLat), zdLat + 1)
    zdLat++
  }

  // Get the smallest hashes in common so we don't have to do big math
  const minZoom = Math.min(zdLat, zdLng)

  const retVal = corners.map(c => c.slice(0, minZoom))

  // return with no duplicates
  // https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
  return [...new Set(retVal)]
}

module.exports = {
  gridify,
  degridify,
  smallestHash,
  getRelevantHashes,
  long2tile,
  lat2tile,
  tile2long,
  tile2lat,
  encodeSingleHash,
  decodeSingleHash
}
