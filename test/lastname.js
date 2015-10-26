var test = require('tape');
var namefilter = require('../namefilter.js');

test('extract most specific taxon name from ordered path', function(t) {
  t.plan(2);
  t.equal(namefilter.lastNameFromPath('one | two | three |'), 'three');
  t.equal(namefilter.lastNameFromPath('one | two | three'), 'three');
});


