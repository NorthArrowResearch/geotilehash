
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
function gridify (lng, lat) {
  // console.log('gridify', lng, lat)
  let hArr = []

  // Push the raw tile numbers into an array
  for (let z = 0; z < MAXZOOM; z++) {
    hArr.push([
      long2tile(lng, z),
      lat2tile(lat, z)
    ])
  }
  return hArr.map((a, idz) => {
    if (idz === 0) return (4 * a[1] + a[0]).toString(16)
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
    hArr[hArr.length - 1][0],
    hArr[hArr.length - 1][1]
  ]
  return {
    bounds,
    zoom: hashVal.length,
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

function getRelevantHashes (inBounds) {
  const corner1 = gridify(inBounds[0], inBounds[1])
  const corner2 = gridify(inBounds[2], inBounds[3])

  let idx = 0
  let result = ''
  while (idx < corner1.length && corner1[idx] === corner2[idx]) {
    result += corner1[idx]
    idx++
  }

  let zdx = idx
  while (zdx < MAXZOOM && long2tile(inBounds[2], zdx) - long2tile(inBounds[0], zdx) < 1) zdx++

  let zdy = idx
  while (zdy < MAXZOOM && long2tile(inBounds[3], zdy) - long2tile(inBounds[1], zdy) < 1) zdy++

  // Get the smallest hashes in common so we don't have to do big math
  const minZoom = Math.min(zdy, zdx)
  // we always return at least one hash
  const retVal1 = corner1.slice(0, minZoom)
  const { bounds, zoom, tiles } = degridify(retVal1)

  console.log({ bounds, zoom, tiles, corner1, corner2, retVal1, zdy, zdx, result })

  // If we share every tile in common then there is only one tile we need
  // if (result.length === retVal1.length) {
  //   return [encodeSingleHash([relLngTile, relLatTile])]
  // }
  // else {
  //   if (zdx > zdy) {
  //     return [
  //       encodeSingleHash([relLngTile, relLatTile]),
  //       encodeSingleHash([relLngTile + 1, relLatTile])
  //     ]
  //   }
  //   else if (zdy > zdx) {
  //     return [
  //       encodeSingleHash([relLngTile, relLatTile]),
  //       encodeSingleHash([relLngTile, relLatTile + 1])
  //     ]
  //   }
  //   else {
  //     return [
  //       encodeSingleHash([relLngTile, relLatTile]),
  //       encodeSingleHash([relLngTile, relLatTile + 1]),
  //       encodeSingleHash([relLngTile + 1, relLatTile]),
  //       encodeSingleHash([relLngTile + 1, relLatTile + 1])
  //     ]
  //   }
  // }
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
