var queryString = require('query-string');
var extend = require('extend');

var datafilter = {};

module.exports = datafilter;

datafilter.fromHash = function(hash, defaultFilter) {
  var filter = defaultFilter || {};
  return extend(defaultFilter, queryString.parse(hash));
}

datafilter.toHash = function(filter) {
  return queryString.stringify(filter);
}
