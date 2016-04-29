var fs = require('fs');
var util = require('./util.js');
var EventEmitter = require('events').EventEmitter;
var globiData = require('globi-data');
var L = require('leaflet');
var draw = require('leaflet-draw');
var wkt = require('terraformer-wkt-parser');

var selectors = {};
module.exports = selectors;

var getDataFilterId = function () {
    return '#selectorContainer';
};

var getDataFilter = function () {
    var checklist = document.querySelector(getDataFilterId());
    var dataFilter = { limit: 20 };
    if (checklist.hasAttribute('data-filter')) {
        dataFilter = JSON.parse(checklist.getAttribute('data-filter'));
    }
    return dataFilter;
};

var setDataFilter = function (dataFilter) {
    var dataFilterString = JSON.stringify(dataFilter);
    document.querySelector(getDataFilterId()).setAttribute('data-filter', dataFilterString);
    window.history.pushState({}, "", "?" + util.toHash(dataFilter));
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

function updateMap(map) {
    var dataFilter = getDataFilter();
    dataFilter.zoom = map.getZoom();
    dataFilter.lat = map.getCenter().lat;
    dataFilter.lng = map.getCenter().lng;
    setDataFilter(dataFilter);
}

function updateTraitSelector() {
    var filter = getDataFilter();
    filter.traitSelector = collectSelectors('.traitFilterElement');
    setDataFilter(filter);
}

var updateGeospatialSelector = function (selectedAreas) {
    var toSelectorWktString = function (selectedAreas) {
        var wktStrings = [];
        selectedAreas.eachLayer(function (layer) {
            wktStrings.push(wkt.convert(layer.toGeoJSON().geometry));
        });
        return util.wktStringsToGeometryCollection(wktStrings);
    };

    var newWktString = toSelectorWktString(selectedAreas);
    var dataFilter = getDataFilter();
    var needsUpdate = false;
    if (newWktString !== dataFilter.wktString) {
        dataFilter.wktString = newWktString;
        setDataFilter(dataFilter);
        needsUpdate = true;
    }
    return needsUpdate;
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

    var filterDefaults = { lat: '42.31', lng: '-71.05', zoom: '7',
        limit: 20,
        taxonSelector: 'Aves,Insecta',
        traitSelector: '',
        wktString: 'ENVELOPE(-72.147216796875,-69.949951171875,43.11702412135048,41.492120839687786)'
    };

    var dataFilter = util.fromHash(document.location.search || document.location.hash, filterDefaults);
    setDataFilter(dataFilter);

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


    var selectedAreaWktStrings = util.geometryCollectionToWktStrings(dataFilter.wktString);
    var selectedGeoJsonList = selectedAreaWktStrings.map(function (wktString) {
        return wkt.parse(wktString);
    });
    var selectedAreas = L.geoJson(selectedGeoJsonList).addTo(map);

    var drawControl = new L.Control.Draw({
                draw: {
                    marker: false,
                    polyline: false,
                    circle: false
                },
                edit: {
                    featureGroup: selectedAreas
                }
            }
        )
        ;
    map.addControl(drawControl);

    map.on('draw:created', function (e) {
        selectedAreas.addLayer(e.layer);
        if (updateGeospatialSelector(selectedAreas)) {
            ee.emit('update');
        }
    });

    map.on('draw:edited draw:deleted', function (e) {
        if (updateGeospatialSelector(selectedAreas)) {
            ee.emit('update');
        }
    });

    map.on('moveend dragend zoomend', function (e) {
        updateMap(map);
        ee.emit('update');
    });

    var taxonFilterNames = dataFilter.taxonSelector.split(/[|,]/).filter(function (name) {
        return name.length > 0;
    });

    taxonFilterNames.forEach(function (taxonName) {
        addTaxonFilterElement(taxonName);
    });

    var traitFilters = dataFilter.traitSelector.split(/[|,]/).filter(function (name) {
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

    var updateSelectors = function () {
        updateTaxonSelector();
        updateTraitSelector();
        updateMap(map);
        updateGeospatialSelector(selectedAreas);
    };

    ee.init = function () {
        updateSelectors();
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
    ee.setDataFilter = setDataFilter;
    return ee;
};

selectors.addTo = function (selector) {
    if (selector) {
        selector.innerHTML = fs.readFileSync(__dirname + '/selector.html');
    }
};