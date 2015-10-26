var namefilter = {};

module.exports = namefilter;

namefilter.lastNameFromPath = function(path) {
  return path.split('|')
    .map(function(elem) { return elem.trim(); })
    .filter(function(elem) { return elem.length > 0; })
    .reverse()[0];
}
