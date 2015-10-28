var queryString = require('query-string');
var extend = require('extend');

var util = {};

module.exports = util;

util.fromHash = function(hash, defaultFilter) {
  var filter = defaultFilter || {};
  return extend(defaultFilter, queryString.parse(hash));
};

util.toHash = function(filter) {
  return queryString.stringify(filter);
};

util.lastNameFromPath = function(path) {
  return path.split('|')
    .map(function(elem) { return elem.trim(); })
    .filter(function(elem) { return elem.length > 0; })
    .reverse()[0];
};


// from leaflet Util.wrapNum 
util.wrapNum = function(x, range, includeMax) {
    var max = range[1],
        min = range[0],
        d = max - min;
    return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
};

// clip lng between [-180,180]
util.normLng = function(lng) {
  return util.wrapNum(lng, [-180, 180], true);
};

util.normBounds = function(bounds) {
  var ne = bounds._northEast;
  var sw = bounds._southWest;
  return { _northEast: { lat: ne.lat, lng: util.normLng(ne.lng) }, 
    _southWest: { lat: sw.lat, lng: util.normLng(sw.lng) } };
}

util.wktPolygon = function(bounds) {
  var wktPoints = bounds._southWest.lng + ' ' + bounds._southWest.lat              
  + ',' + bounds._southWest.lng + ' ' + bounds._northEast.lat
  + ',' + bounds._northEast.lng + ' ' + bounds._northEast.lat
  + ',' + bounds._northEast.lng + ' ' + bounds._southWest.lat
  + ',' + bounds._southWest.lng + ' ' + bounds._southWest.lat;
  return 'POLYGON((' + wktPoints + '))';
};

util.wktEnvelope = function(bounds) {
  return 'ENVELOPE(' + [bounds._southWest.lng, 
    bounds._northEast.lng,
    bounds._northEast.lat, 
    bounds._southWest.lat].join(',') + ')';
}

