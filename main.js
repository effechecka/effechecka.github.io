var checklist = require('./checklist.js');
var occurrences = require('./occurrences.js');
var selectors = require('./selector.js');


var effechecka = {};
module.exports = effechecka;

window.addEventListener('load', function () {
    selectors.addSelectorTo(document.getElementById('effechecka-selector'));
    checklist.addChecklistTo(document.getElementById('effechecka-checklist'));
    occurrences.addOccurrencesTo(document.getElementById('effechecka-occurrences'));

    var selector = selectors.createSelectors();

    if (document.getElementById('effechecka-checklist'))  {
        checklist.createChecklist(selector);
    }
    if (document.getElementById('effechecka-occurrences'))  {
        occurrences.createOccurrences(selector);
    }

    selector.init();
});
