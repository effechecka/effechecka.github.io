var test = require('tape');
var datafilter = require('../util.js');

test('parse/ stringify data filter from/ to hash', function (t) {
    t.plan(2);
    var hash = 'geometry=POLYGON%28%28-55.1953125%2070.37785394109227%2C-55.1953125%2046.55886030311719%2C-137.109375%2046.55886030311719%2C-137.109375%2070.37785394109227%2C-55.1953125%2070.37785394109227%29%29&hasSpatialIssue=false&height=272&lat=60.58696734225869&limit=20&lng=-96.15234375&scientificName=Insecta&taxonSelector=Insecta&traitSelector=&width=466&wktString=ENVELOPE%28-137.109375%2C-55.1953125%2C70.37785394109227%2C46.55886030311719%29&zoom=3';
    var filter = datafilter.fromHash(hash);

    var expectedFilter = { geometry: 'POLYGON((-55.1953125 70.37785394109227,-55.1953125 46.55886030311719,-137.109375 46.55886030311719,-137.109375 70.37785394109227,-55.1953125 70.37785394109227))', hasSpatialIssue: 'false', height: '272', lat: '60.58696734225869', limit: '20', lng: '-96.15234375', scientificName: 'Insecta', taxonSelector: 'Insecta', traitSelector: '', width: '466', wktString: 'ENVELOPE(-137.109375,-55.1953125,70.37785394109227,46.55886030311719)', zoom: '3' };
    t.deepEqual(filter, expectedFilter);

    t.equal(datafilter.toHash(filter), hash);
});

test('dataAdded hash', function (t) {
    t.plan(2);
    var hash = 'dateAdded=2016-01-01';
    var filter = datafilter.fromHash(hash);

    var expectedFilter = { dateAdded: '2016-01-01' };
    t.deepEqual(filter, expectedFilter);

    t.equal(datafilter.toHash(filter), hash);
});

test('traitselector exists, but is empty', function (t) {
    t.plan(1);
    var filter = datafilter.fromHash('traitSelector=', { traitSelector: 'some default'});
    t.deepEqual(filter, { traitSelector: '' });
});

test('filter exists, and has a number', function (t) {
    t.plan(1);
    var filter = datafilter.fromHash('limit=10', {});
    t.deepEqual(filter, { limit: '10' });
});

test('traitselector does not exist, but is empty', function (t) {
    t.plan(1);
    var filter = datafilter.fromHash('taxonSelector=', { traitSelector: 'some default'});
    t.deepEqual(filter, { traitSelector: 'some default', taxonSelector: '' });
});


test('parse empty hash, no default', function (t) {
    t.plan(2);
    t.deepEqual(datafilter.fromHash(' '), {});
    t.deepEqual(datafilter.fromHash(null), {});
});

test('parse empty hash', function (t) {
    t.plan(1);
    var filter = datafilter.fromHash('', { some: 'default' });
    t.deepEqual(filter, { some: 'default' });

});

test('parse non-empty hash', function (t) {
    t.plan(1);

    var filter = datafilter.fromHash('some=value&and=another', { some: 'default' });

    t.deepEqual(filter, { some: 'value', and: 'another' });

});

test('default hash', function (t) {
    var hashDefault = 'geometry=POLYGON%28%28-69.949951171875%2043.11702412135048%2C-69.949951171875%2041.492120839687786%2C-72.147216796875%2041.492120839687786%2C-72.147216796875%2043.11702412135048%2C-69.949951171875%2043.11702412135048%29%29&hasSpatialIssue=false&height=200&lat=42.31&limit=20&lng=-71.05&scientificName=Aves%2CInsecta&taxonSelector=Aves%2CInsecta&traitSelector=bodyMass%20%3E%2010%20g%2CbodyMass%20%3C%201.0%20kg&width=200&wktString=ENVELOPE%28-72.147216796875%2C-69.949951171875%2C43.11702412135048%2C41.492120839687786%29&zoom=7';
    t.plan(1);
    var expectedDefault = { geometry: 'POLYGON((-69.949951171875 43.11702412135048,-69.949951171875 41.492120839687786,-72.147216796875 41.492120839687786,-72.147216796875 43.11702412135048,-69.949951171875 43.11702412135048))', hasSpatialIssue: 'false', height: '200', lat: '42.31', limit: '20', lng: '-71.05', scientificName: 'Aves,Insecta', taxonSelector: 'Aves,Insecta', traitSelector: 'bodyMass > 10 g,bodyMass < 1.0 kg', width: '200', wktString: 'ENVELOPE(-72.147216796875,-69.949951171875,43.11702412135048,41.492120839687786)', zoom: '7' };
    t.deepEqual(datafilter.fromHash(hashDefault), expectedDefault);
});

