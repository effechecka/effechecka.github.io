var fs = require('fs');
var util = require('./util.js');
var taxon = require('taxon');
var extend = require('extend');

var checklist = {};
module.exports = checklist;


function renderChecklistItems(checklist, resp) {
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
        var recordCount = document.createElement('td');
        recordCount.textContent = item.recordcount;
        row.appendChild(recordCount);
        checklist.appendChild(row);
    });
}

function xhr() {
    return util.xhr();
}

function clearChecklist() {
    util.removeChildren('#checklist');
    util.removeChildren('#download');
    setChecklistStatus('none requested');
}

var createChecklistURL = function (dataFilter) {
    return util.createRequestURL(dataFilter, 'checklist');
};

var addTSVDownloadLink = function (filename, label, tsvString) {
    var download = document.querySelector('#download');
    download.appendChild(document.createElement("span")).textContent = ' or as ';
    var tsvRef = download.appendChild(document.createElement("a"));
    tsvRef.setAttribute('href', encodeURI('data:text/tab-separated-values;charset=utf-8,' + tsvString));
    tsvRef.setAttribute('download', filename)
    tsvRef.textContent = label;
}

var quoteString = function (str) {
    return util.quoteString(str);
}

var addChecklistDownloadLink = function (items) {
    var tsvString = items.reduce(function (agg, item) {
        if (item.taxon && item.recordcount) {
            var taxonName = util.lastNameFromPath(item.taxon);
            agg = agg.concat([taxonName, item.taxon, item.recordcount].join('\t'));
        }
        return agg;
    }, ['taxonName\ttaxonPath\trecordCount']).join('\n');
    addTSVDownloadLink('checklist.tsv', 'tsv', tsvString);
}

var onNameAndPageIds = function (nameAndPageIds) {
    setChecklistStatus('ready');
    addDownloadAsEOLIdsLink(nameAndPageIds);
    util.addHyperlinksForNames(nameAndPageIds);
};

var addDownloadAsEOLIdsLink = function (nameAndPageIds) {
    var pageIds = nameAndPageIds.map(function (nameAndPageId) {
        return nameAndPageId.id
    });
    var maxCollectionItems = 10;
    addTSVDownloadLink('eolpageids.tsv', 'eol page ids', pageIds.join('\n'));
    var download = document.querySelector('#download');
    download.setAttribute('data-name-and-page-ids', JSON.stringify(nameAndPageIds));
    download.appendChild(document.createElement("span")).textContent = ' or ';
    var saveAsCollection = download.appendChild(document.createElement("button"));
    saveAsCollection.textContent = 'save as EOL Collection';

    download.appendChild(document.createElement("span")).textContent = ' with title ';
    var collectionTitle = download.appendChild(document.createElement("input"));
    collectionTitle.setAttribute('id', 'collectionTitle');
    collectionTitle.setAttribute('placeholder', 'enter title');

    download.appendChild(document.createElement("span")).textContent = ' and description ';
    var collectionDescription = download.appendChild(document.createElement("input"));
    collectionDescription.setAttribute('id', 'collectionDescription');
    collectionDescription.setAttribute('placeholder', 'enter description');

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
    download.appendChild(document.createElement("span")).textContent = ' collection items. ';
    var help = download.appendChild(document.createElement("a"));
    help.setAttribute('href', 'https://github.com/jhpoelen/effechecka/wiki/About#saving-as-eol-collection');
    help.setAttribute('target', '_blank');
    help.textContent = '?';

    saveAsCollection.addEventListener('click', function (event) {
        saveAsCollection.setAttribute('disabled', 'disabled');
        var saveStatus = document.querySelector('#saveStatus');
        if (!saveStatus) {
            saveStatus = download.appendChild(document.createElement("span"));
            saveStatus.setAttribute('id', 'saveStatus');
        }
        saveStatus.innerHTML = ' Collection saving...';
        var pageIds = JSON.parse(document.querySelector('#download').dataset.nameAndPageIds).map(function (item) {
            return parseInt(item.id);
        });
        var apiKey = document.querySelector('#apiKey').value;
        var title = document.querySelector('#collectionTitle').value;
        var description = document.querySelector('#collectionDescription').value;
        description = description.trim().replace(/\.+$/, '');
        description = description.concat('. Re-create this <a href="' + window.location.href + '">regional search</a> with currently available data.');

        var maxElements = parseInt(document.querySelector('#collectionLimit').value);
        if (!maxElements) {
            maxElements = 30;
        }
        var limitedPageIds = pageIds.slice(0, maxElements);
        taxon.saveAsCollection(function (collectionId) {
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

var updateDownloadURL = function (selector) {
    util.removeChildren("#download");

    var dataFilter = selector.getDataFilter();
    delete dataFilter.limit;

    var download = document.querySelector('#download');
    download.appendChild(document.createElement("span"))
        .textContent = 'save all as ';
    var url = util.createRequestURL(dataFilter, 'checklist.tsv'); 
    var jsonRef = download.appendChild(document.createElement("a"));
    jsonRef.setAttribute('href', url);
    jsonRef.textContent = 'tsv';

    dataFilter.limit = 1024 * 4;
    download.appendChild(document.createElement("span"))
        .textContent = ' or save up to [' + dataFilter.limit + '] checklist items as ';
    
    
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
                        //addChecklistDownloadLink(resp.items);

                        var names = resp.items.reduce(function (agg, item) {
                            if (item.taxon) {
                                agg = agg.concat(util.lastNameFromPath(item.taxon));
                            }
                            return agg;
                        }, []);
                        setChecklistStatus('linking to eol pages...');
                        taxon.eolPageIdsFor(names, onNameAndPageIds);
                    }
                }
            }
        };
        req.send(null);
    }
};


var renderChecklist = function(resp, selector) {
    if (resp.items) {
        var checklist = document.querySelector('#checklist');
        if (resp.items.length > 0) {
            renderChecklistItems(checklist, resp);
            updateDownloadURL(selector);
        } else {
            var statusMap = { requested: "working on your checklist..." };
            var statusMsg = statusMap[resp.status] || resp.status;
            setChecklistStatus(statusMsg);
            if (resp.status === 'ready') {
                var download = document.querySelector('#download');
                var msgElem = download.appendChild(document.createElement('span'));
                var msg = 'The checklist you\'ve requested contains no items. Bummer! You might want to try changing your search parameters';

                var quickfixButton = document.createElement('button');
                quickfixButton.textContent = 'removing your trait selectors';
                quickfixButton.title = 'remove your trait selectors';
                quickfixButton.addEventListener('click', function (event) {
                    selector.removeTraitSelectors();
                    clearChecklist();
                    requestSelectedChecklist(selector);
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
};

var requestSelectedChecklist = function(selector) {
    util.requestSelected(createChecklistURL(selector.getDataFilter()), selector, renderChecklist, setChecklistStatus);
};


var setChecklistStatus = function (status) {
    document.querySelector('#checklistStatus').textContent = status;
};

checklist.select = function (selector) {
    var addRequestHandler = function (buttonId) {
        var checklistButton = document.querySelector(buttonId);
        checklistButton.addEventListener('click', function (event) {
            clearChecklist();
            requestSelectedChecklist(selector);

        }, false);
    };

    clearChecklist();
    ['#requestChecklist', '#refreshChecklist'].forEach(function (id) {
        addRequestHandler(id)
    });

    var updateLists = function () {
        clearChecklist();
    };

    selector.on('update', function () {
        updateLists();
    });

    selector.on('ready', function () {
        updateLists();
        requestSelectedChecklist(selector);
    });
};

checklist.addTo = function (checklist) {
    if (checklist) {
        checklist.innerHTML = fs.readFileSync(__dirname + '/checklist.html');
    }
};
