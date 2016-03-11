var checklist = require('./checklist.js');
var selectors = require('./selector.js');


var effechecka = {};
module.exports = effechecka;

window.addEventListener('load', function () {
    selectors.addSelectorTo(document.getElementById('effechecka-selector'));
    checklist.addChecklistTo(document.getElementById('effechecka-checklist'));
    var selector = selectors.createSelectors();
    checklist.createChecklist(selector);
    selector.init();
});
