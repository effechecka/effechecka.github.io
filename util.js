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

// clip lng between [-180,180]
util.normLng = function(lng) {
  var sign = Math.trunc((lng / 180) % 2) == 0 ? 1 : -1;
  return Math.abs(lng / 180) == 1 ? lng : sign * lng % 180; 
}

util.wktPolygon = function(bounds) {
  var wktPoints = bounds._northEast.lng + ' ' + bounds._northEast.lat              
  + ',' + bounds._northEast.lng + ' ' + bounds._southWest.lat
  + ',' + bounds._southWest.lng + ' ' + bounds._southWest.lat
  + ',' + bounds._southWest.lng + ' ' + bounds._northEast.lat
  + ',' + bounds._northEast.lng + ' ' + bounds._northEast.lat;
  return 'POLYGON((' + wktPoints + '))';
};

util.wktEnvelope = function(bounds) {
  return 'ENVELOPE(' + [bounds._southWest.lng, 
    bounds._northEast.lng,
    bounds._northEast.lat, 
    bounds._southWest.lat].join(',') + ')';
}

