var globiData = require('globi-data');
var queryString = require('query-string');
var L = require('leaflet');
var taxon = require('taxon');
var util = require('./util.js');

var effechecka = {};
module.exports = effechecka;

function createEllipsis() {
    var ellipsis = document.createElement('td');
    ellipsis.textContent = '...';
    return ellipsis;
}

function sepElem() {
    var sepElem = document.createElement('span');
    sepElem.textContent = ' | ';
    return sepElem;
}
function renderChecklist(checklist, resp) {
    checklist.setAttribute('data-results', resp.results);
    var headerRow = document.createElement('tr');
    var header = document.createElement('th');
    header.setAttribute('id', 'checklistHeader');
    header.textContent = 'checklist items';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = 'occurrence count';
    headerRow.appendChild(header);
    checklist.appendChild(headerRow);
    resp.items.forEach(function (item) {
        var row = document.createElement('tr');
        var path = document.createElement('td');
        var pathElems = item.taxon.split('|').reduce(function (pathFull, pathPartValue) {
            if (pathPartValue.length == 0) {
                return pathFull.concat([sepElem()]);
            } else {
                var pathPartElem = document.createElement('a');
                pathPartElem.setAttribute('href', 'http://eol.org/' + pathPartValue);
                pathPartElem.textContent = pathPartValue;
                pathPartElem.setAttribute('title', 'search EOL for [' + pathPartValue + '] by name');
                return pathFull.concat([pathPartElem, sepElem()])
            }
        }, []);
        pathElems.forEach(function (elem) {
            path.appendChild(elem);
        });
        row.appendChild(path);
        var recordCount = document.createElement('td');
        recordCount.textContent = item.recordcount;
        row.appendChild(recordCount);
        checklist.appendChild(row);
    });
    var ellipsisRow = document.createElement('tr');
    ellipsisRow.appendChild(createEllipsis());
    ellipsisRow.appendChild(createEllipsis());
    checklist.appendChild(ellipsisRow);
}

function xhr() {
    var req = null;
    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
        req = new XMLHttpRequest();
    } else if ((typeof window !== 'undefined') && window.ActiveXObject) { //     IE
        try {
            req = new ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
            try {
                req = new ActiveXObject('Microsoft.XMLHTTP');
            } catch (e) {
            }
        }
    }
    return req;
}

var removeChildren = function (selector) {
    var checklist = document.querySelector(selector);
    while (checklist && checklist.firstChild) {
        checklist.removeChild(checklist.firstChild);
    }
    return checklist;
};


function clearChecklist() {
    removeChildren('#checklist');
    removeChildren('#download');
    setChecklistStatus('none requested');
}

var createChecklistURL = function (dataFilter) {
    return 'http://apihack-c18.idigbio.org/checklist' + Object.keys(dataFilter).filter(function (key) {
        return ['taxonSelector', 'wktString', 'traitSelector', 'limit'].indexOf(key) != -1;
    }).reduce(function (accum, key) {
        if (dataFilter[key] !== null) {
            return accum + key + '=' + encodeURIComponent(dataFilter[key]) + '&';
        } else {
            return accum;
        }
    }, '?');
};

var addCSVDownloadLink = function (filename, label, csvString) { 
  var download = document.querySelector('#download');
  download.appendChild(document.createElement("span")).textContent = ' or as ';
  var csvRef = download.appendChild(document.createElement("a"));
  csvRef.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + csvString));
  csvRef.setAttribute('download', filename)
  csvRef.textContent = label;
}

var addChecklistDownloadLink = function (items) {
  var csvString = items.reduce(function (agg, item) {
    if (item.taxon && item.recordcount) {
      var taxonName = util.lastNameFromPath(item.taxon);
      agg = agg.concat([taxonName, item.taxon, item.recordcount].join(','));
    }
    return agg;
  }, ['taxon name,taxon path,record count']).join('\n');
  addCSVDownloadLink('checklist.csv', 'csv', csvString);
}

var addDownloadAsEOLIdsLink = function (pageIds) {
  setChecklistStatus('ready'); 
  var maxCollectionItems = 10;
  addCSVDownloadLink('eolpageids.csv', 'eol page ids', pageIds.join('\n'));
  var download = document.querySelector('#download');
  download.setAttribute('data-eol-page-ids', JSON.stringify(pageIds));
  download.appendChild(document.createElement("span")).textContent = ' or ';
  var saveAsCollection = download.appendChild(document.createElement("button"));
  saveAsCollection.textContent = 'save as EOL Collection';
  
  download.appendChild(document.createElement("span")).textContent = ' with title ';
  var collectionTitle = download.appendChild(document.createElement("input"));
  collectionTitle.setAttribute('id','collectionTitle');
  collectionTitle.setAttribute('placeholder','enter title');
  
  download.appendChild(document.createElement("span")).textContent = ' and description ';
  var collectionDescription = download.appendChild(document.createElement("input"));
  collectionDescription.setAttribute('id','collectionDescription');
  collectionDescription.setAttribute('placeholder','enter description');
  
  download.appendChild(document.createElement("span")).innerHTML = ' using <a href="https://github.com/jhpoelen/effechecka/wiki/Save-Checklist-To-EOL-Collection" target="_blank">api key</a> ';
  var apiKeyInput = download.appendChild(document.createElement("input"));
  apiKeyInput.setAttribute('id', 'apiKey');
  apiKeyInput.setAttribute('placeholder', 'EOL api key');
  
  download.appendChild(document.createElement("span")).textContent = ' limit to ';
  var limit = download.appendChild(document.createElement("input"));
  limit.setAttribute('id', 'collectionLimit');
  limit.setAttribute('type', 'number');
  limit.setAttribute('min', '1');
  limit.value = pageIds;
  if (pageIds.length > maxCollectionItems) {
    limit.value = maxCollectionItems;
  }
  download.appendChild(document.createElement("span")).textContent = ' collection items.';

  saveAsCollection.addEventListener('click', function (event) {
    saveAsCollection.setAttribute('disabled', 'disabled');
    var saveStatus = document.querySelector('#saveStatus');
    if (!saveStatus) {
      saveStatus = download.appendChild(document.createElement("span"));
      saveStatus.setAttribute('id', 'saveStatus');
    }
    saveStatus.innerHTML = ' Collection saving...';
    var pageIds = JSON.parse(document.querySelector('#download').dataset.eolPageIds).map(function(item) { return parseInt(item); });
    var apiKey = document.querySelector('#apiKey').value;
    var title = document.querySelector('#collectionTitle').value;
    var description = document.querySelector('#collectionDescription').value;
    description = description.trim().replace(/\.+$/,'');
    description = description.concat('. Re-create this <a href="' + window.location.href + '">regional search</a> with currently available data.');

    var maxElements = parseInt(document.querySelector('#collectionLimit').value);
    if (!maxElements) {
      maxElements = 30;
    }
    var limitedPageIds = pageIds.slice(0, maxElements);
    taxon.saveAsCollection(function(collectionId) {
      var collectionURL = 'http://eol.org/collections/' + collectionId;
      var saveStatusHTML = ' Collection saved at <a href="' + collectionURL + '">' + collectionURL + '</a>.';
      if (!collectionId) {
        saveStatusHTML = ' Failed to save collection. Bummer! This is probably a <a href="https://github.com/EOL/tramea/issues/35">known issue</a> that prevents saving > ' + maxCollectionItems + ' items to a EOL checklist. However, if your list contains only a few items and you are seeing this message, please check <a href="https://github.com/jhpoelen/effechecka/issues/">our open issues</a> first, before reporting a new one.';
      }
      document.querySelector('#saveStatus').innerHTML = saveStatusHTML; 
      saveAsCollection.removeAttribute('disabled');
    }, 
    apiKey, limitedPageIds, title, description);
  }, false);

}

var updateDownloadURL = function () {
    removeChildren("#download");

    var dataFilter = getDataFilter();
    dataFilter.limit = 1024 * 4;

    var download = document.querySelector('#download');
    download.appendChild(document.createElement("span"))
        .textContent = 'save up to [' + dataFilter.limit + '] checklist items as ';

    var url = createChecklistURL(dataFilter);
    var jsonRef = download.appendChild(document.createElement("a"));
    jsonRef.setAttribute('href', url);
    jsonRef.textContent = 'json';

    var req = xhr();
    if (req !== undefined) {
        setChecklistStatus('downloading...');
        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    if (resp.items) {
                        var header = document.querySelector('#checklistHeader');
                        if (header) {
                          var headerText = resp.items.length + ' checklist items';
                          if (resp.items.length > 20) {
                            headerText = headerText.concat(' (first 20 shown)');
                          }
                          header.textContent = headerText;
                        }
                        addChecklistDownloadLink(resp.items);

                        var names = resp.items.reduce(function(agg, item) { 
                          if (item.taxon) {
                            agg = agg.concat(util.lastNameFromPath(item.taxon));  
                          }
                          return agg;
                        }, []);
                        setChecklistStatus('linking to eol pages...');
                        taxon.eolPageIdsFor(names, addDownloadAsEOLIdsLink);
                    }
                }
            }
        };
        req.send(null);
    }
};


var updateChecklist = function () {
    var req = xhr();
    if (req !== undefined) {
        req.open('GET', createChecklistURL(getDataFilter()), true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                setChecklistStatus('received response');
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    if (resp.items) {
                        renderChecklist(checklist, resp);
                        if (resp.items.length > 0) {
                            updateDownloadURL();
                        } else {
                            setChecklistStatus(resp.status);
                        }
                    }
                } else {
                    setChecklistStatus('not ok. Received a [' + req.status + '] status with text [' + req.statusText + '] in response to [' + createChecklistURL(getDataFilter()) + ']');
                }
            }
        };
        clearChecklist();
        setChecklistStatus('requesting checklist...');
        req.send(null);
    }
};

var setChecklistStatus = function (status) {
    document.querySelector('#checklistStatus').textContent = status;
};

var getDataFilter = function () {
    var checklist = document.querySelector('#checklist');
    var dataFilter = { limit: 20 };
    if (checklist.hasAttribute('data-filter')) {
        dataFilter = JSON.parse(checklist.getAttribute('data-filter'));
    }
    return dataFilter;
};

var setDataFilter = function (dataFilter) {
    var dataFilterString = JSON.stringify(dataFilter);

    document.querySelector('#checklist').setAttribute('data-filter', dataFilterString);
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
    filter.scientificName = filterJoin;
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

var init = function () {
    var addRequestHandler = function (buttonId) {
        var checklistButton = document.querySelector(buttonId);
        checklistButton.addEventListener('click', function (event) {
            updateChecklist();
        }, false);
    };

    clearChecklist();
    ['#requestChecklist', '#refreshChecklist'].forEach(function (id) {
        addRequestHandler(id)
    });

    var updateLists = function () {
        clearChecklist();
    };

    var addTaxonFilterElement = function (taxonName) {
        var taxonDiv = document.createElement('div');
        taxonDiv.setAttribute('class', 'taxonFilterElement');
        var removeButton = document.createElement('button');

        removeButton.addEventListener('click', function (event) {
            taxonDiv.parentNode.removeChild(taxonDiv);
            updateTaxonSelector();
            updateLists();
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
            updateLists();
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
    { height: '200', lat: '42.31', limit: '20', lng: '-71.05', scientificName: 'Aves,Insecta', taxonSelector: 'Aves,Insecta', traitSelector: 'bodyMass > 10 g,bodyMass < 1.0 kg', width: '200', wktString: 'ENVELOPE(-72.147216796875,-69.949951171875,43.11702412135048,41.492120839687786)', zoom: '7' };
    
    var dataFilter = util.fromHash(document.location.hash, filterDefaults);

    var zoom = parseInt(dataFilter.zoom);
    var lat = parseFloat(dataFilter.lat);
    var lng = parseFloat(dataFilter.lng);

    var map = L.map('map', {scrollWheelZoom: false}).setView([lat, lng], zoom);
    effechecka.map = map;
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
        updateLists();
    });

    var taxonFilterNames = dataFilter.scientificName.split(',').filter(function(name) { return name.length > 0;});

    taxonFilterNames.forEach(function (taxonName) {
        addTaxonFilterElement(taxonName);
    });

    var traitFilters = dataFilter.traitSelector.split(',').filter(function(name) { return name.length > 0;});
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
            updateLists();
            addTraitFilterElement(traitSelector);
            traitValueElem.value = '';
        });

    }

    var addTaxonButton = document.getElementById('addTaxonSelector');

    function addAndUpdateTaxonSelector(taxonName, taxonSelectorInput) {
        updateLists();
        addTaxonFilterElement(util.capitalize(taxonName));
        taxonSelectorInput.value = '';
        removeChildren('#suggestions');
    }

    if (addTaxonButton) {
        addTaxonButton.addEventListener('click', function (event) {
            var taxonSelectorInput = document.getElementById('taxonSelectorInput');
            addAndUpdateTaxonSelector(taxonSelectorInput.value, taxonSelectorInput);
        });

    }

    var taxonSelectorInput = document.getElementById('taxonSelectorInput');

    taxonSelectorInput.onkeyup = function (event) {
        var suggestions = removeChildren('#suggestions');

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

    updateTaxonSelector();
    updateTraitSelector();
    updateBBox(areaSelect);
    updateLists();
    updateChecklist();
}

window.addEventListener('load', function () {
    init();
});
