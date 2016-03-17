var test = require('tape');
var u = require('../util.js');
var wkt = require('terraformer-wkt-parser');

test('extract most specific taxon name from ordered path', function (t) {
    t.plan(2);
    t.equal(u.lastNameFromPath('one | two | three |'), 'three');
    t.equal(u.lastNameFromPath('one | two | three'), 'three');
});

test('clamp lng', function (t) {
    t.plan(7);
    t.equal(u.normLng(0), 0);
    t.equal(u.normLng(90), 90);
    t.equal(u.normLng(180), 180);
    t.equal(u.normLng(-90), -90);
    t.equal(u.normLng(-180), -180);
    t.equal(u.normLng(-270), 90);
    t.equal(u.normLng(360), 0);
});

test('wkt envelope', function (t) {
    t.plan(2);
    t.equal(u.wktEnvelope({ _northEast: { lat: 12, lng: 1 }, _southWest: { lat: 10, lng: 0 }}), 'ENVELOPE(0,1,12,10)');
    t.equal(u.wktEnvelope({ _northEast: { lat: 12, lng: -90 }, _southWest: { lat: 10, lng: 90 }}), 'ENVELOPE(90,-90,12,10)');
});

test('normalize bounds', function (t) {
    t.plan(1);
    var arcticCanadaRussia = { _northEast: {lat: 87.04309838968054, lng: 87.1875}, _southWest: { lat: 55.7765730186677, lng: -243.28125}};
    var expectedBounds = { _northEast: {lat: 87.04309838968054, lng: 87.1875}, _southWest: { lat: 55.7765730186677, lng: 116.71875}};
    t.deepEqual(u.normBounds(arcticCanadaRussia), expectedBounds);
});

test('capitalize', function (t) {
    t.plan(3);
    t.equal(u.capitalize('one two'), 'One two');
    t.equal(u.capitalize('one'), 'One');
    t.equal(u.capitalize('one Two'), 'One Two');
});

test('collection wkt to list', function (t) {
    t.plan(1);
    var collectionWkt = "GEOMETRYCOLLECTION(POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8)),POLYGON ((-72.6 43.1, -72.6 43.5, -71.6 43.5, -71.6 43.1, -72.6 43.1)))";
    var expectedList = [ "POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8))", "POLYGON ((-72.6 43.1, -72.6 43.5, -71.6 43.5, -71.6 43.1, -72.6 43.1))"];

    t.deepEqual(u.geometryCollectionToWktStrings(collectionWkt), expectedList);
});

test('no-collection wkt to list', function (t) {
    t.plan(1);
    var collectionWkt = "POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8))";
    var expectedList = [ "POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8))"];

    t.deepEqual(u.geometryCollectionToWktStrings(collectionWkt), expectedList);
});

test('wkt list to collection', function (t) {
    t.plan(1);
    var wktStrings = ["POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8))", "POLYGON ((-72.6 43.1, -72.6 43.5, -71.6 43.5, -71.6 43.1, -72.6 43.1))"];
    var expectedCollectionWkt = "GEOMETRYCOLLECTION(POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8)),POLYGON ((-72.6 43.1, -72.6 43.5, -71.6 43.5, -71.6 43.1, -72.6 43.1)))";

    t.equal(u.wktStringsToGeometryCollection(wktStrings), expectedCollectionWkt);
});

test('single item wkt list to collection', function (t) {
    t.plan(1);
    var wktStrings = ["POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8))"];
    var expectedCollectionWkt = "POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3125 41.8, -71.8 41.8))";

    t.equal(u.wktStringsToGeometryCollection(wktStrings), expectedCollectionWkt);
});



test('wkt envelope to polygon', function (t) {
    t.plan(1);
    var exectedPolygon = "POLYGON ((-71.8 41.8, -71.8 42.8, -70.3 42.8, -70.3 41.8, -71.8 41.8))";
    var envelope = "ENVELOPE(-71.8,-70.3,42.8,41.8)";

    t.equal(u.wktEnvelopeToPolygon(envelope), exectedPolygon);
});
