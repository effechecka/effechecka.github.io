var fs = require('fs');
var util = require('./util.js');
var taxon = require('taxon');

var occurrences = {};
module.exports = occurrences;


function renderOccurrenceItems(occurrences, resp) {
    occurrences.setAttribute('data-results', resp.results);
    var headerRow = document.createElement('tr');
    var header = document.createElement('th');
    header.textContent = 'taxa';
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
        row.setAttribute('class', 'occurrence');
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
    util.removeChildrenAll('.effechecka-results');
    util.removeChildrenAll('.effechecka-status');
    setOccurrencesStatus('none requested');
}

var createOccurrencesURL = function (dataFilter) {
    return util.createRequestURL(dataFilter, 'occurrences');
};

var updateDownloadURL = function (dataFilter) {
    util.removeChildren("#download");

    if (dataFilter.limit) {
        delete dataFilter.limit;
    }

    var download = document.querySelector('#download');

    var appendDownloadLink = function (dataFilter, text) {
        download.appendChild(document.createElement("span"))
            .textContent = text;

        var url = util.createRequestURL(dataFilter, 'occurrences.csv');
        var csvRef = download.appendChild(document.createElement("a"));
        csvRef.setAttribute('href', url);
        csvRef.textContent = 'csv';
    };

    var noAddedKeys = Object.keys(dataFilter).filter(function (key) {
        return ['addedAfter', 'addedBefore'].indexOf(key) === -1;
    });

    var dataFilterNoAddedDate = noAddedKeys.reduce(function (agg, key) {
        agg[key] = dataFilter[key];
        return agg;
    }, {});

    appendDownloadLink(dataFilterNoAddedDate, '... save all records as ');

    if (Object.keys(dataFilter).length !== noAddedKeys.length) {
        var downloadText = [];
        if (dataFilter.addedAfter !== undefined) {
            downloadText.push('after [' + dataFilter.addedAfter + ']');
        }
        if (dataFilter.addedBefore !== undefined) {
            downloadText.push('before [' + dataFilter.addedBefore + ']');
        }
        appendDownloadLink(dataFilter, ' or save all records added ' + downloadText.join(' and ') + ' as ');
    }

    download.appendChild(document.createElement("span"))
        .textContent = '.';

};

var updateTableHeader = function (dataFilter) {
    var url = util.createRequestURL(dataFilter, 'monitors');
    var req = xhr();
    if (req !== undefined) {
        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    if (resp.recordCount) {
                        var header = document.querySelector('#effechecka-occurrences-summary');
                        if (header) {
                            var headerText = '[' + resp.recordCount + '] matching occurrences';
                            if (resp.recordCount > 20) {
                                headerText = headerText.concat(' (first 20 shown below)');
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

            var names = resp.items.reduce(function (agg, item) {
                if (item.taxon) {
                    agg = agg.concat(util.lastNameFromPath(item.taxon));
                }
                return agg;
            }, []);

            setOccurrencesStatus('linking to eol pages...');
            taxon.eolPageIdsFor(names, function (namesAndIds) {
                util.addHyperlinksForNames(namesAndIds);
                setOccurrencesStatus("ready");
            });

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
    ['#requestOccurrences'].forEach(function (id) {
        addRequestHandler(id)
    });

    var subscribeButton = document.querySelector('#effechecka-subscribe');
    if (subscribeButton) {
        subscribeButton.addEventListener('click', function (event) {

            function subscribe(inputSelector, prefix) {
                var subscriptionInput = document.querySelector(inputSelector);
                if (subscriptionInput && !subscriptionInput.validity.typeMismatch && subscriptionInput.value.length > 0) {
                    var emailAddress = subscriptionInput.value;
                    var dataFilter = selector.getDataFilter();
                    dataFilter['subscriber'] = prefix + emailAddress;
                    var subscribeUrl = util.createRequestURL(dataFilter, 'subscribe');
                    var req = xhr();
                    if (req !== undefined) {
                        req.open('GET', subscribeUrl, true);
                        req.onreadystatechange = function () {
                            if (req.readyState === 4) {
                                if (req.status === 200) {
                                    var subscribeStatus = document.querySelector('#effechecka-subscribe-status');
                                    if (subscribeStatus) {
                                        util.removeChildren('#effechecka-subscribe-status');
                                        var status = subscribeStatus.appendChild(document.createElement('span'));
                                        status.textContent = "[" + emailAddress + "] is now subscribed: you should receive a confirmation email shortly.";
                                    }
                                }
                            }
                        }
                    }
                    req.send(null);
                }
            }
            subscribe('#effechecka-email','mailto:');
            subscribe('#effechecka-webhook','');
        }, false);
    }


    var addButtonListeners = function (buttonConfig) {
        var notificationButton = document.querySelector(buttonConfig.buttonQuery);
        if (notificationButton) {
            notificationButton.addEventListener('click', function (event) {
                var dataFilter = selector.getDataFilter();
                var subscribeUrl = util.createRequestURL(dataFilter, buttonConfig.endpoint);
                var req = xhr();
                if (req !== undefined) {
                    req.open('GET', subscribeUrl, true);
                    req.onreadystatechange = function () {
                        if (req.readyState === 4) {
                            if (req.status === 200) {
                                var statusElem = document.querySelector(buttonConfig.statusQuery);
                                if (statusElem) {
                                    util.removeChildren(buttonConfig.statusQuery);
                                    var status = statusElem.appendChild(document.createElement('span'));
                                    status.textContent = buttonConfig.statusText;
                                }
                            }
                        }
                    }
                }
                req.send(null);
            }, false);
        }
    }

    addButtonListeners({
        endpoint: 'notify',
        buttonQuery: '#effechecka-notification-test',
        statusQuery: '#effechecka-notification-test-status',
        statusText: 'Subscribers should be notified immediately if search was already initialized and occurrences exists that matches the search criteria.'
    });

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
