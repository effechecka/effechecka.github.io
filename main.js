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


