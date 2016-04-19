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


