var fs = require('fs');
var util = require('./util.js');
var taxon = require('taxon');

var occurrences = {};
module.exports = occurrences;


function renderOccurrenceItems(occurrences, resp) {
    occurrences.setAttribute('data-results', resp.results);
    var headerRow = document.createElement('tr');
    var header = document.createElement('th');
    header.setAttribute('id', 'occurrencesHeader');
    header.textContent = 'occurrence items';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = 'lat';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = 'lng';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = 'eventStartDate';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = 'occurrence id';
    headerRow.appendChild(header);
    header = document.createElement('th');
    header.textContent = 'firstAddedDate';
    headerRow.appendChild(header);
    occurrences.appendChild(headerRow);
    resp.items.forEach(function (item) {
        var row = document.createElement('tr');
        var path = document.createElement('td');
        var pathElems = item.taxon.split('|').reduce(function (pathFull, pathPartValue) {
            if (pathPartValue.length == 0) {
                return pathFull.concat([util.sepElem()]);
            } else {
                var pathPartElem = document.createElement('span');
                pathPartElem.setAttribute('class', util.classNameFor(pathPartValue));
                pathPartElem.textContent = pathPartValue;
                return pathFull.concat([pathPartElem, util.sepElem()])
            }
        }, []);
        pathElems.forEach(function (elem) {
            path.appendChild(elem);
        });
        row.appendChild(path);
        var recordCount = row.appendChild(document.createElement('td'));
        recordCount.textContent = item.lat;
        recordCount = row.appendChild(document.createElement('td'));
        recordCount.textContent = item.lng;
        recordCount = row.appendChild(document.createElement('td'));
        recordCount.textContent = new Date(item.start).toISOString();
        recordCount = row.appendChild(document.createElement('td'));
        var occUrl = recordCount.appendChild(document.createElement('a'));
        occUrl.setAttribute('href', util.urlForOccurrence(item));
        occUrl.setAttribute('title', 'visit associated external url');
        occUrl.setAttribute('target', '_blank');
        occUrl.textContent = item.id;
        recordCount = row.appendChild(document.createElement('td'));
        recordCount.textContent = new Date(item.added).toISOString();
        
        occurrences.appendChild(row);
    });
}

function xhr() {
    return util.xhr();
}

function clearOccurrences() {
    util.removeChildren('#occurrences');
    util.removeChildren('#download');
    setOccurrencesStatus('none requested');
}

var createOccurrencesURL = function (dataFilter) {
    return util.createRequestURL(dataFilter, 'occurrences');

};

var addCSVDownloadLink = function (filename, label, csvString) {
    var download = document.querySelector('#download');
    download.appendChild(document.createElement("span")).textContent = ' or as ';
    var csvRef = download.appendChild(document.createElement("a"));
    csvRef.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + csvString));
    csvRef.setAttribute('download', filename);
    csvRef.textContent = label;
}

var quoteString = function (str) {
    return util.quoteString(str);
};

var addOccurrencesDownloadLink = function (items) {
    var csvString = items.reduce(function (agg, item) {
        if (item.taxon && item.start) {
            var taxonName = quoteString(util.lastNameFromPath(item.taxon));
            agg = agg.concat([taxonName, quoteString(item.taxon), item.lat, item.lng, new Date(item.start).toISOString(), quoteString(item.id), quoteString(item.source),quoteString(util.urlForOccurrence(item))].join(','));
        }
        return agg;
    }, ['taxon name,taxon path,lat,lng,eventStartDate,occurrenceId,source,url']).join('\n');
    addCSVDownloadLink('occurrences.csv', 'csv', csvString);
}

var updateDownloadURL = function (dataFilter) {
    util.removeChildren("#download");

    dataFilter.limit = 1024 * 4;

    var download = document.querySelector('#download');
    download.appendChild(document.createElement("span"))
        .textContent = 'save up to [' + dataFilter.limit + '] occurrences as ';

    var url = createOccurrencesURL(dataFilter);
    var jsonRef = download.appendChild(document.createElement("a"));
    jsonRef.setAttribute('href', url);
    jsonRef.textContent = 'json';

    var req = xhr();
    if (req !== undefined) {
        setOccurrencesStatus('downloading...');
        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    if (resp.items) {
                        addOccurrencesDownloadLink(resp.items);

                        var names = resp.items.reduce(function (agg, item) {
                            if (item.taxon) {
                                agg = agg.concat(util.lastNameFromPath(item.taxon));
                            }
                            return agg;
                        }, []);
                        setOccurrencesStatus('linking to eol pages...');
                        taxon.eolPageIdsFor(names, function(namesAndIds) {
                            util.addHyperlinksForNames(namesAndIds);
                            setOccurrencesStatus("ready");
                        });
                    }
                }
            }
        };
        req.send(null);
    }
};

var updateTableHeader = function(dataFilter) {
    var url = util.createRequestURL(dataFilter, 'monitors');
    var req = xhr();
    if (req !== undefined) {
        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    if (resp.recordCount) {
                        var header = document.querySelector('#occurrencesHeader');
                        if (header) {
                            var headerText = resp.recordCount + ' occurrences';
                            if (resp.recordCount > 20) {
                                headerText = headerText.concat(' (first 20 shown)');
                            }
                            header.textContent = headerText;
                        }
                    }
                }
            }
        }
    }
    req.send(null);
};

var renderOccurrences = function (resp, selector) {
    if (resp.items) {
        var occurrences = document.querySelector('#occurrences');
        if (resp.items.length > 0) {
            renderOccurrenceItems(occurrences, resp);
            updateTableHeader(selector.getDataFilter());
            updateDownloadURL(selector.getDataFilter());
        } else {
            var statusMap = { requested: "working on your occurrences..." };
            var statusMsg = statusMap[resp.status] || resp.status;
            setOccurrencesStatus(statusMsg);
            if (resp.status === 'ready') {
                var download = document.querySelector('#download');
                var msgElem = download.appendChild(document.createElement('span'));
                var msg = 'The occurrences you\'ve requested contains no items. Bummer! You might want to try changing your search parameters';

                var quickfixButton = document.createElement('button');
                quickfixButton.textContent = 'removing your trait selectors';
                quickfixButton.title = 'remove your trait selectors';
                quickfixButton.addEventListener('click', function (event) {
                    selector.removeTraitSelectors();
                    clearOccurrences();
                    updateOccurrences(selector);
                }, false);
                if (selector.hasTraitSelectors()) {
                    msgElem.textContent = msg + ' by ';
                    download.appendChild(quickfixButton);
                    download.appendChild(document.createElement('span')).textContent = '.';
                } else {
                    msgElem.textContent = msg + '.';
                }
            }
        }
    }
}


var requestSelectedOccurrences = function (selector) {
    util.requestSelected(createOccurrencesURL(selector.getDataFilter()), selector, renderOccurrences, setOccurrencesStatus);
};


var updateOccurrences = function (selector) {
    clearOccurrences();
    requestSelectedOccurrences(selector);
};

var setOccurrencesStatus = function (status) {
    document.querySelector('#occurrencesStatus').textContent = status;
};

occurrences.select = function (selector) {
    var addRequestHandler = function (buttonId) {
        var occurrencesButton = document.querySelector(buttonId);
        occurrencesButton.addEventListener('click', function (event) {
            updateOccurrences(selector);
        }, false);
    };

    clearOccurrences();
    ['#requestOccurrences', '#refreshOccurrences'].forEach(function (id) {
        addRequestHandler(id)
    });

    var subscribeButton = document.querySelector('#effechecka-subscribe');
    if (subscribeButton) {
        subscribeButton.addEventListener('click', function (event) {
            var emailInput = document.querySelector('#effechecka-email');
            if (emailInput && !emailInput.validity.typeMismatch) {
                var emailAddress = emailInput.value;
                var dataFilter = selector.getDataFilter();
                dataFilter['subscriber'] = 'mailto:' + emailAddress;
                var subscribeUrl = util.createRequestURL(dataFilter, 'subscribe');
                var req = xhr();
                if (req !== undefined) {
                    req.open('GET', subscribeUrl, true);
                    req.onreadystatechange = function () {
                        if (req.readyState === 4) {
                            if (req.status === 200) {
                                var subscribeStatus = document.querySelector('#effechecka-subscribe-status');
                                if (subscribeStatus) {
                                    subscribeStatus.textContent = "[" + emailAddress + "] is now subscribed: you should receive a confirmation email shortly.";
                                }
                            }
                        }
                    }
                }
                req.send(null);
            }
        }, false);
    }


    var updateLists = function () {
        clearOccurrences();
    };

    selector.on('update', function () {
        updateLists();
    });

    selector.on('ready', function () {
        updateOccurrences(selector);
    });
};

occurrences.addTo = function (occurrences) {
    if (occurrences) {
        occurrences.innerHTML = fs.readFileSync(__dirname + '/occurrences.html');
    }
};
