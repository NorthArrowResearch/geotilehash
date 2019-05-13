# GeoTileHash

This function encodes the [slippy tilenames](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) z/x/y tree into a single string hash that is easy to search. 

This is convenient for doing bounding rectangle searches on a DB system like dynamoDB.

### Examples:

```js
// 
gridify(-180, minLat - 0.0000001)
// '0000000000000000'

const tile4Input = [ -125.20019531249999, 46.56641407568593, -119.783935546875, 49.880477638742555 ]
getRelevantHashes(tile4Input)
// ['021221', '021230', '021203', '021212']

```

-----------

## Methods:

### `gridify(lng, lat, zoomLevel)`

Return a hash up to `maxZoom` characters long corresponding to the lat/lng coordinates.

### `degridify(hashVal)`

inputs the `hashVal` you got from `gridify` and returns 

Returns the bounding box of this hashval slippy tiles it corresponds to:

```js
{
    bounds: [minLng, minLat, maxLng, maxLat],
    tiles: [z,x,y]
}
```

### `smallestHash([minLng, minLat, maxLng, maxLat])`

This returns the smallest single hash in common with all 4 corners of this bounding rectangle. 

***Be careful when using this function. Adjacent tiles that are separated by zoom boundaries will not have a hash in common***

### `getRelevantHashes([minLng, minLat, maxLng, maxLat])`

Input a bounding rectangle and output an array of between 1 and 4 hashes corresponding to the  number of adjacent tiles that contain the bounding rectangle.


### `long2tile(lng, z)`

From: <https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames>

### `lat2tile(lat, z)`

From: <https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames>

### `tile2long(xTile, z)`

From: <https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames>

### `tile2lat(yTile, z)`

From: <https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames>
