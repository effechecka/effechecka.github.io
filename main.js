var checklist = require('./checklist.js');
var selectors = require('./selector.js');


var effechecka = {};
module.exports = effechecka;

window.addEventListener('load', function () {
    selectors.initSelectorHtml();
    checklist.initChecklistHtml();
    var selector = selectors.createSelectors();
    checklist.createChecklist(selector);
    selector.init();
});
