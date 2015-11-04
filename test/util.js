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

test('wkt envelope', function(t) {
  t.plan(2);
  t.equal(u.wktEnvelope({ _northEast: { lat: 12, lng: 1 }
    , _southWest: { lat: 10, lng: 0 }}), 'ENVELOPE(0,1,12,10)');
  t.equal(u.wktEnvelope({ _northEast: { lat: 12, lng: -90 }
    , _southWest: { lat: 10, lng: 90 }}), 'ENVELOPE(90,-90,12,10)');
});

test('wkt polygon', function(t) {
  t.plan(2);
  t.equal(u.wktPolygon({ _northEast: { lat: 12, lng: 1 }
    , _southWest: { lat: 10, lng: 0 }}), 'POLYGON((0 10,0 12,1 12,1 10,0 10))');
  t.equal(u.wktPolygon({ _northEast: { lat: 12, lng: -90 }
    , _southWest: { lat: 10, lng: 90 }}), 'POLYGON((90 10,90 12,-90 12,-90 10,90 10))');
});

test('normalize bounds', function(t) {
  t.plan(1);
  var arcticCanadaRussia = { _northEast: {lat: 87.04309838968054, lng: 87.1875}, _southWest: { lat: 55.7765730186677, lng: -243.28125}};
  var expectedBounds = { _northEast: {lat: 87.04309838968054, lng: 87.1875}, _southWest: { lat: 55.7765730186677, lng: 116.71875}};
  t.deepEqual(u.normBounds(arcticCanadaRussia), expectedBounds); 
});

test('capitalize', function(t) {
  t.plan(3);
  t.equal(u.capitalize('one two'), 'One two');
  t.equal(u.capitalize('one'), 'One');
  t.equal(u.capitalize('one Two'), 'One Two');
});
