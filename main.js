var globiData = require('globi-data');
var queryString = require('query-string');
var L = require('leaflet');
var taxon = require('taxon');
var myxhr = require('xhr');

function createEllipsis() {
    var ellipsis = document.createElement('td');
    ellipsis.textContent = '...';
    return ellipsis;
}
function renderGBIF(occurrences, resp) {
    occurrences.setAttribute('data-results', resp.results);
    var headerRow = document.createElement('tr');
    var header = document.createElement('th');
    header.textContent = 'taxon occurrences';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = '(lat,lng)';
    headerRow.appendChild(header);
    occurrences.appendChild(headerRow);
    resp.results.forEach(function (occurrence) {
        var row = document.createElement('tr');
        var path = document.createElement('td');
        var pathElems = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'].reduce(function (pathFull, pathPart) {
            var pathPartValue = occurrence[pathPart];
            if (pathPartValue !== undefined) {
                var pathPartElem = document.createElement('a');
                pathPartElem.setAttribute('href', 'http://eol.org/' + pathPartValue);
                pathPartElem.textContent = pathPartValue;
                pathPartElem.setAttribute('title', 'search EOL for [' + pathPartValue + '] by name');
                var sepElem = document.createElement('span');
                sepElem.textContent = ' | ';
                return pathFull.concat([pathPartElem, sepElem])
            } else {
                return pathFull;
            }
        }, []);
        pathElems.forEach(function (elem) {
            path.appendChild(elem);
        });
        row.appendChild(path);
        var latLng = document.createElement('td');
        latLng.textContent = '(' + occurrence.decimalLatitude + ',' + occurrence.decimalLongitude + ')';
        row.appendChild(latLng);
        occurrences.appendChild(row);
    });
    var ellipsisRow = document.createElement('tr');
    ellipsisRow.appendChild(createEllipsis());
    ellipsisRow.appendChild(createEllipsis());
    occurrences.appendChild(ellipsisRow);
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
var updateOccurrences = function () {
    var req = xhr();
    if (req !== undefined) {
        var baseUrl = 'http://api.gbif.org/v1/occurrence/search';
        var dataFilter = getDataFilter();
        var query = Object.keys(dataFilter).reduce(function (accum, key) {
            if (dataFilter[key] !== null) {
                return accum + key + '=' + encodeURIComponent(dataFilter[key]) + '&';
            } else {
                return accum;
            }
        }, '?');

        var url = baseUrl + query;
        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                setOccurrenceStatus('received response');
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    setOccurrenceStatus('got [' + resp.count + '] matches from gbif');
                    if (resp.results) {
                        renderGBIF(occurrences, resp);
                    }
                } else {
                    setOccurrenceStatus('not ok. Received a [' + req.status + '] status with text [' + req.statusText + '] in response to [' + url + ']');
                }
            }
        };
        removeChildren('#occurrences');
        setOccurrenceStatus('building new list...');
        req.send(null);
    }
};

var removeChildren = function (selector) {
    var checklist = document.querySelector(selector);
    while (checklist.firstChild) {
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
    return 'http://apihack-c18.idigbio.org:8888/checklist' + Object.keys(dataFilter).filter(function (key) {
        return ['taxonSelector', 'wktString', 'traitSelector', 'limit'].indexOf(key) != -1;
    }).reduce(function (accum, key) {
        if (dataFilter[key] !== null) {
            return accum + key + '=' + encodeURIComponent(dataFilter[key]) + '&';
        } else {
            return accum;
        }
    }, '?');
};

var lastNameFromPath = function (taxonPath) {
  return taxonPath.split('|').reverse()[0];
}

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
      var taxonName = lastNameFromPath(item.taxon);
      agg = agg.concat([taxonName, item.taxon, item.recordcount].join(','));
    }
    return agg;
  }, ['taxon name,taxon path,record count']).join('\n');
  addCSVDownloadLink('checklist.csv', 'csv', csvString);
}

var addDownloadAsEOLIdsLink = function (pageIds) {
  console.log(pageIds);
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
  limit.value = pageIds;
  if (pageIds.length > maxCollectionItems) {
    limit.value = maxCollectionItems;
  }
  download.appendChild(document.createElement("span")).textContent = ' collection items.';

  saveAsCollection.addEventListener('click', function (event) {
    saveAsCollection.setAttribute('disabled', 'disabled');
    var saveStatus = download.appendChild(document.createElement("span"));
    saveStatus.setAttribute('id', 'saveStatus');
    saveStatus.textContent = ' collection saving...';
    var pageIds = JSON.parse(document.querySelector('#download').dataset.eolPageIds).map(function(item) { return parseInt(item); });
    var apiKey = document.querySelector('#apiKey').value;
    var title = document.querySelector('#collectionTitle').value;
    var description = document.querySelector('#collectionDescription').value;
    var maxElements = parseInt(document.querySelector('#collectionLimit').value);
    if (!maxElements) {
      maxElements = 30;
    }
    var limitedPageIds = pageIds.slice(0, maxElements);
    taxon.saveAsCollection(function(collectionId) {
      var collectionURL = 'http://eol.org/collections/' + collectionId;
      var saveStatus = ' collection saved at <a href="' + collectionURL + '">' + collectionURL + '</a>.';
      if (!collectionId) {
        saveStatus = ' Failed to save collection. Bummer! This is probably a <a href="https://github.com/EOL/tramea/issues/35">known issue</a> that prevents saving > ' + maxCollectionItems + ' items to a EOL checklist. However, if your list contains only a few items and you are seeing this message, please check <a href="https://github.com/jhpoelen/effechecka/issues/">our open issues</a> first, before reporting a new one.';
      }
      document.querySelector('#saveStatus').innerHTML = saveStatus; }, 
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
                            agg = agg.concat(lastNameFromPath(item.taxon));  
                          }
                          return agg;
                        }, []);
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
                    setChecklistStatus(resp.status);
                    if (resp.items) {
                        renderChecklist(checklist, resp);
                        if (resp.items.length > 0) {
                            updateDownloadURL();
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

var setOccurrenceStatus = function (status) {
    document.querySelector('#occurrenceStatus').textContent = status;
};

var setChecklistStatus = function (status) {
    document.querySelector('#checklistStatus').textContent = status;
};

var getDataFilter = function () {
    var occurrences = document.querySelector('#checklist');
    var dataFilter = { hasSpatialIssue: 'false', limit: 20 };
    if (occurrences.hasAttribute('data-filter')) {
        dataFilter = JSON.parse(occurrences.getAttribute('data-filter'));
    }
    return dataFilter;
};

var setDataFilter = function (dataFilter) {
    var dataFilterString = JSON.stringify(dataFilter);
    document.querySelector('#checklist').setAttribute('data-filter', dataFilterString);
    document.location.hash = queryString.stringify(dataFilter);
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

var updateBBox = function (areaSelect) {
    var bounds = areaSelect.getBounds();
    var wktPoints = bounds._northEast.lng + ' ' + bounds._northEast.lat
        + ',' + bounds._northEast.lng + ' ' + bounds._southWest.lat
        + ',' + bounds._southWest.lng + ' ' + bounds._southWest.lat
        + ',' + bounds._southWest.lng + ' ' + bounds._northEast.lat
        + ',' + bounds._northEast.lng + ' ' + bounds._northEast.lat;

    var dataFilter = getDataFilter();
    dataFilter.geometry = 'POLYGON((' + wktPoints + '))';

    var lngMin = Math.min(bounds._northEast.lng, bounds._southWest.lng);
    var lngMax = Math.max(bounds._northEast.lng, bounds._southWest.lng);
    var latMin = Math.min(bounds._northEast.lat, bounds._southWest.lat);
    var latMax = Math.max(bounds._northEast.lat, bounds._southWest.lat);
    dataFilter.wktString = 'ENVELOPE(' + [lngMin, lngMax, latMax, latMin].join(',') + ')';

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
        updateOccurrences();
    };

    var addTaxonFilterElement = function (taxonName) {
        var taxonDiv = document.createElement('span');
        taxonDiv.setAttribute('class', 'taxonFilterElement');
        var removeButton = document.createElement('button');

        removeButton.addEventListener('click', function (event) {
            taxonDiv.parentNode.removeChild(taxonDiv);
            updateTaxonSelector();
            updateLists();
        });
        removeButton.textContent = 'x';

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
        removeTraitButton.addEventListener('click', function (event) {
            traitFilterElement.parentNode.removeChild(traitFilterElement);
            updateTraitSelector();
        });
        traitFilterElement.appendChild(removeTraitButton);

        var traitFilterText = document.createElement('span');
        traitFilterText.setAttribute('class', 'traitFilterElement');
        traitFilterText.textContent = traitFilter;
        traitFilterElement.appendChild(traitFilterText);

        document.getElementById('traitFilter').appendChild(traitFilterElement);
        updateTraitSelector();
    };

    var dataFilter = queryString.parse(document.location.hash);

    var zoom = parseInt(dataFilter.zoom || 7);
    var lat = parseFloat(dataFilter.lat || 42.31);
    var lng = parseFloat(dataFilter.lng || -71.05);

    var map = L.map('map', {scrollWheelZoom: false}).setView([lat, lng], zoom);

    var tileUrlTemplate = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    L.tileLayer(tileUrlTemplate, {
        maxZoom: 18,
        attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    var width = parseInt((dataFilter.width || 200));
    var height = parseInt((dataFilter.height || 200));
    var areaSelect = L.areaSelect({width: width, height: height});
    areaSelect.addTo(map);
    areaSelect.on("change", function () {
        updateBBox(this);
        updateLists();
    });

    var taxonFilterNames = (dataFilter.scientificName && dataFilter.scientificName.split(',')) || ['Aves', 'Insecta'];

    taxonFilterNames.forEach(function (taxonName) {
        addTaxonFilterElement(taxonName);
    });

    var traitFilters = (dataFilter.traitSelector && dataFilter.traitSelector.split(',')) || ['bodyMass > 10 g', 'bodyMass < 1.0 kg'];
    traitFilters.forEach(function (traitFilter) {
        addTraitFilterElement(traitFilter);
    });

    var addTraitButton = document.getElementById('addTraitSelector');
    if (addTraitButton) {
        addTraitButton.addEventListener('click', function (event) {
            var traitSelectorInput = document.getElementById('traitSelector');
            addTraitFilterElement(traitSelectorInput.value);
            traitSelectorInput.value = '';
        });

    }

    var addTaxonButton = document.getElementById('addTaxonSelector');

    function addAndUpdateTaxonSelector(taxonName, taxonSelectorInput) {
        addTaxonFilterElement(taxonName);
        updateLists();
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
