var fs = require('fs');
var util = require('./util.js');
var EventEmitter = require('events').EventEmitter;
var globiData = require('globi-data');
var L = require('leaflet');


var selectors = {};
module.exports = selectors;


var dataFilterId = '#checklist';

var getDataFilter = function () {
    var checklist = document.querySelector(dataFilterId);
    var dataFilter = { limit: 20 };
    if (checklist.hasAttribute('data-filter')) {
        dataFilter = JSON.parse(checklist.getAttribute('data-filter'));
    }
    return dataFilter;
};

var setDataFilter = function (dataFilter) {
    var dataFilterString = JSON.stringify(dataFilter);

    document.querySelector(dataFilterId).setAttribute('data-filter', dataFilterString);
    document.location.hash = util.toHash(dataFilter);
};

function collectSelectors(selector) {
    var filterElems = Array.prototype.slice.call(document.querySelectorAll(selector));

    return filterElems.reduce(function (filterAgg, filterElem) {
        var taxonName = filterElem.textContent.trim();
        if (taxonName.length > 0) {
            filterAgg = filterAgg.concat(filterElem.textContent.trim());
        }
        return filterAgg;
    }, []).join(',');
}

function updateTaxonSelector() {
    var filterJoin = collectSelectors('.taxonFilterElementName');
    var filter = getDataFilter();
    filter.taxonSelector = filterJoin;
    setDataFilter(filter);
}

function updateTraitSelector() {
    var filter = getDataFilter();
    filter.traitSelector = collectSelectors('.traitFilterElement');
    setDataFilter(filter);
}

function getBoundsArea(areaSelect) {
    var size = areaSelect.map.getSize();
    var topRight = new L.Point();
    var bottomLeft = new L.Point();
    // this only holds when the size of the map lies within the container

    bottomLeft.x = Math.round((size.x - areaSelect._width) / 2);
    topRight.y = Math.round((size.y - areaSelect._height) / 2);
    topRight.x = size.x - bottomLeft.x;
    bottomLeft.y = size.y - topRight.y;
    var northPoleY = areaSelect.map.latLngToContainerPoint(L.latLng(90, 0)).y;
    var southPoleY = areaSelect.map.latLngToContainerPoint(L.latLng(-90, 0)).y;
    var sw = areaSelect.map.containerPointToLatLng(bottomLeft);
    if (bottomLeft.y > southPoleY) {
        sw.lat = -90;
    }
    if (bottomLeft.y < northPoleY) {
        sw.lat = 90;
    }
    var ne = areaSelect.map.containerPointToLatLng(topRight);
    // for some reason, latLngToContainerPoint(...) doesn't make sharp cut at poles.
    if (topRight.y < northPoleY) {
        ne.lat = 90;
    }
    if (topRight.y > southPoleY) {
        sw.lat = -90;
    }
    return util.normBounds(new L.LatLngBounds(sw, ne));
}

var updateBBox = function (areaSelect) {
    var bounds = getBoundsArea(areaSelect);
    var dataFilter = getDataFilter();
    dataFilter.wktString = util.wktEnvelope(bounds);

    dataFilter.zoom = areaSelect.map.getZoom();
    dataFilter.lat = areaSelect.map.getCenter().lat;
    dataFilter.lng = areaSelect.map.getCenter().lng;
    dataFilter.width = areaSelect._width;
    dataFilter.height = areaSelect._height;

    setDataFilter(dataFilter);
};

selectors.createSelectors = function () {
    var ee = new EventEmitter();

    var addTaxonFilterElement = function (taxonName) {
        var taxonDiv = document.createElement('div');
        taxonDiv.setAttribute('class', 'taxonFilterElement');
        var removeButton = document.createElement('button');

        removeButton.addEventListener('click', function (event) {
            taxonDiv.parentNode.removeChild(taxonDiv);
            updateTaxonSelector();
            ee.emit('update');
        });
        removeButton.textContent = 'x';
        removeButton.title = 'remove taxon selector';

        var taxonNameSpan = document.createElement('span');
        taxonNameSpan.setAttribute('class', 'taxonFilterElementName');
        taxonNameSpan.textContent = taxonName;
        taxonDiv.appendChild(removeButton);
        taxonDiv.appendChild(taxonNameSpan);
        document.querySelector('#taxonFilter').appendChild(taxonDiv);
        updateTaxonSelector();
    };

    var addTraitFilterElement = function (traitFilter) {
        var traitFilterElement = document.createElement('div');

        var removeTraitButton = document.createElement('button');
        removeTraitButton.textContent = 'x';
        removeTraitButton.title = 'remove trait selector';
        removeTraitButton.addEventListener('click', function (event) {
            traitFilterElement.parentNode.removeChild(traitFilterElement);
            updateTraitSelector();
            ee.emit('update');
        });
        traitFilterElement.appendChild(removeTraitButton);

        var traitFilterText = document.createElement('span');
        traitFilterText.setAttribute('class', 'traitFilterElement');
        traitFilterText.textContent = traitFilter;
        traitFilterElement.appendChild(traitFilterText);

        document.getElementById('traitFilter').appendChild(traitFilterElement);
        updateTraitSelector();
    };

    var filterDefaults =
    { height: '200', lat: '42.31', limit: '20', lng: '-71.05', taxonSelector: 'Aves,Insecta', width: '200', traitSelector: '', wktString: 'ENVELOPE(-72.147216796875,-69.949951171875,43.11702412135048,41.492120839687786)', zoom: '7' };

    var dataFilter = util.fromHash(document.location.hash, filterDefaults);

    var zoom = parseInt(dataFilter.zoom);
    var lat = parseFloat(dataFilter.lat);
    var lng = parseFloat(dataFilter.lng);

    var map = L.map('map', {scrollWheelZoom: false}).setView([lat, lng], zoom);
    selectors.map = map;
    var tileUrlTemplate = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    L.tileLayer(tileUrlTemplate, {
        maxZoom: 18,
        attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    var width = parseInt((dataFilter.width));
    var height = parseInt((dataFilter.height));
    var areaSelect = L.areaSelect({width: width, height: height});
    areaSelect.addTo(map);
    areaSelect.on("change", function () {
        updateBBox(this);
        ee.emit('update');
    });

    var taxonFilterNames = dataFilter.taxonSelector.split(',').filter(function (name) {
        return name.length > 0;
    });

    taxonFilterNames.forEach(function (taxonName) {
        addTaxonFilterElement(taxonName);
    });

    var traitFilters = dataFilter.traitSelector.split(',').filter(function (name) {
        return name.length > 0;
    });
    traitFilters.forEach(function (traitFilter) {
        addTraitFilterElement(traitFilter);
    });

    var addTraitButton = document.getElementById('addTraitSelector');
    if (addTraitButton) {
        addTraitButton.addEventListener('click', function (event) {
            var traitValueElem = document.getElementById('traitValue');
            var traitName = document.getElementById('traitName').value;
            var traitOperator = document.getElementById('traitOperator').value;
            var traitValue = traitValueElem.value;
            var traitUnit = document.getElementById('traitUnit').value;
            var traitSelector = [traitName, traitOperator, traitValue, traitUnit].join(' ');
            ee.emit('update');
            addTraitFilterElement(traitSelector);
            traitValueElem.value = '';
        });

    }

    var addTaxonButton = document.getElementById('addTaxonSelector');

    function addAndUpdateTaxonSelector(taxonName, taxonSelectorInput) {
        ee.emit('update');
        addTaxonFilterElement(util.capitalize(taxonName));
        taxonSelectorInput.value = '';
        util.removeChildren('#suggestions');
    }

    if (addTaxonButton) {
        addTaxonButton.addEventListener('click', function (event) {
            var taxonSelectorInput = document.getElementById('taxonSelectorInput');
            addAndUpdateTaxonSelector(taxonSelectorInput.value, taxonSelectorInput);
        });

    }

    var taxonSelectorInput = document.getElementById('taxonSelectorInput');

    taxonSelectorInput.onkeyup = function (event) {
        var suggestions = util.removeChildren('#suggestions');

        if (taxonSelectorInput.value.length > 2) {
            var closeMatchCallback = function (closeMatches) {
                closeMatches.forEach(function (closeMatch) {
                    var label = closeMatch.scientificName;
                    if (label.split(" ").length > 1) {
                        label = '<em>' + label + '</em>'
                    }
                    if (closeMatch.commonNames.en) {
                        label = closeMatch.commonNames.en + " (" + label + ")";
                    }
                    var child = document.createElement('li');
                    child.innerHTML = label;
                    child.addEventListener('click', function (event) {
                        addAndUpdateTaxonSelector(closeMatch.scientificName.trim(), taxonSelectorInput);
                    });
                    suggestions.appendChild(child);
                });
            };
            globiData.findCloseTaxonMatches(taxonSelectorInput.value.trim(), closeMatchCallback);
        }
    };

    ee.init = function () {
        updateTaxonSelector();
        updateTraitSelector();
        updateBBox(areaSelect);
        ee.emit('ready');
    };

    ee.removeTraitSelectors = function () {
        util.removeChildren('#traitFilter');
        updateTraitSelector();
    };

    ee.hasTraitSelectors = function () {
        document.querySelector('.traitFilterElement');
    };

    ee.getDataFilter = getDataFilter;

    return ee;
};

selectors.initSelectorHtml = function () {
    var selector = document.getElementById('effechecka-selector');
    if (selector) {
        selector.innerHTML = fs.readFileSync(__dirname + '/selector.html');
    }
};