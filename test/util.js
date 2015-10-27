var test = require('tape');
var u = require('../util.js');

test('extract most specific taxon name from ordered path', function(t) {
  t.plan(2);
  t.equal(u.lastNameFromPath('one | two | three |'), 'three');
  t.equal(u.lastNameFromPath('one | two | three'), 'three');
});

test('clamp lng', function(t) {
  t.plan(7);
  t.equal(u.normLng(0), 0);
  t.equal(u.normLng(90), 90);
  t.equal(u.normLng(180), 180);
  t.equal(u.normLng(-90), -90);
  t.equal(u.normLng(-180), -180);
  t.equal(u.normLng(-270), 90);
  t.equal(u.normLng(360), 0);
});

