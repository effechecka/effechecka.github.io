var checklist = require('./checklist.js');
var occurrences = require('./occurrences.js');
var selectors = require('./selector.js');
var util = require('./util.js');


var effechecka = {};
module.exports = effechecka;

var init = function () {
    selectors.addTo(document.querySelector('#effechecka-selector'));
    checklist.addTo(document.querySelector('#effechecka-checklist'));
    occurrences.addTo(document.querySelector('#effechecka-occurrences'));

    var selector = selectors.createSelectors();

    if (document.querySelector('#effechecka-checklist')) {
        checklist.select(selector);
    }
    if (document.querySelector('#effechecka-occurrences')) {
        occurrences.select(selector);
    }

    function initOccurrenceFilter(filterName) {
        var filterElementId = 'effechecka-' + filterName;
        var filterElem = document.getElementById(filterElementId);
        if (filterElem) {
            var filter = selector.getDataFilter();
            var filterValue = filter[filterName];
            if (filterValue !== undefined) {
                filterElem.value = filterValue;
            }

            filterElem.addEventListener('change', function (event) {
                var filter = selector.getDataFilter();
                var filterValue = event.target.value;
                if (filterValue !== undefined) {
                    filter[filterName] = filterValue;
                    selector.setDataFilter(filter);
                    selector.emit('update');
                }
            });
        }
    }

    initOccurrenceFilter('addedBefore');
    initOccurrenceFilter('addedAfter');

    selector.init();

    function initFeed() {
        if (document.getElementById('occurrenceProgress')) {
            util.enableFeed(function (monitorStatus) {
                var dataFilter = selector.getDataFilter();
                var selectorWebContext = { taxonSelector: dataFilter['taxonSelector'].replace(/,/g, "|"), wktString: dataFilter['wktString'], traitSelector: dataFilter['traitSelector']};
                var selectorFeedContext = monitorStatus.selector;

                if (util.deepEqualIgnoreEmpty(selectorWebContext, selectorFeedContext)) {
                    var feedElem = document.getElementById('occurrenceProgress');
                    if (feedElem) {
                        feedElem.textContent = ' (' + monitorStatus.percentComplete + '%)';
                    }
                    var feedStatus = document.getElementById('occurrencesStatus')
                    if (feedStatus) {
                        if (status === 'ready') {
                            selector.emit('update');
                        }
                        feedStatus.textContent = monitorStatus.status;
                    }
                }
            });
        }
    }

    initFeed();
};

window.addEventListener('load', function () {
    init();
});

window.addEventListener('popstate', function (event) {
    ['#effechecka-selector', '#effechecka-checklist', '#effechecka-occurrences']
        .forEach(function (id) {
            util.removeChildren(id);
        });
    init();
});


