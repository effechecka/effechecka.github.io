var queryString = require('query-string');

var datafilter = {};

module.exports = datafilter;

datafilter.fromHash = function(hash) {
  return queryString.parse(hash);
}

datafilter.toHash = function(filter) {
  return queryString.stringify(filter);
}
