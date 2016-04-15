var queryString = require('query-string');
var extend = require('extend');

var util = {};

module.exports = util;

util.removeChildren = function (selector) {
    var checklist = document.querySelector(selector);
    while (checklist && checklist.firstChild) {
        checklist.removeChild(checklist.firstChild);
    }
    return checklist;
};

util.fromHash = function (hash, defaultFilter) {
    var filter = defaultFilter || {};
    return extend(defaultFilter, queryString.parse(hash));
};

util.toHash = function (filter) {
    return queryString.stringify(filter);
};

util.lastNameFromPath = function (path) {
    return path.split('|')
        .map(function (elem) {
            return elem.trim();
        })
        .filter(function (elem) {
            return elem.length > 0;
        })
        .reverse()[0];
};


// from leaflet Util.wrapNum 
util.wrapNum = function (x, range, includeMax) {
    var max = range[1],
        min = range[0],
        d = max - min;
    return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
};

// clip lng between [-180,180]
util.normLng = function (lng) {
    return util.wrapNum(lng, [-180, 180], true);
};

util.normBounds = function (bounds) {
    var ne = bounds._northEast;
    var sw = bounds._southWest;
    return { _northEast: { lat: ne.lat, lng: util.normLng(ne.lng) },
        _southWest: { lat: sw.lat, lng: util.normLng(sw.lng) } };
}

util.wktEnvelope = function (bounds) {
    return 'ENVELOPE(' + [bounds._southWest.lng,
        bounds._northEast.lng,
        bounds._northEast.lat,
        bounds._southWest.lat].join(',') + ')';
}

util.capitalize = function (taxonName) {
    var capitalizedName = taxonName;
    if (taxonName) {
        var parts = taxonName.split(' ');
        var firstName = parts[0];
        if (firstName.length > 0) {
            parts[0] = firstName[0].toUpperCase().concat(firstName.slice(1));
        }
        capitalizedName = parts.join(' ');
    }
    return capitalizedName;
};

util.createRequestURL = function (dataFilter, endpoint) {
    return 'http://apihack-c18.idigbio.org/' + endpoint + Object.keys(dataFilter).filter(function (key) {
        return ['taxonSelector', 'wktString', 'traitSelector', 'limit'].indexOf(key) != -1;
    }).reduce(function (accum, key) {
        if (dataFilter[key] !== null) {
            return accum + key + '=' + encodeURIComponent(dataFilter[key]) + '&';
        } else {
            return accum;
        }
    }, '?');
};

util.quoteString = function (str) {
    return ['"', str, '"'].join('');
};


util.xhr = function () {
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
};

util.classNameFor = function (str) {
    return str.replace(/\W/g, '_');
};

util.sepElem = function () {
    var sepElem = document.createElement('span');
    sepElem.textContent = ' | ';
    return sepElem;
};

util.addHyperlinksForNames = function (nameAndPageIds) {
    nameAndPageIds.forEach(function (nameAndPageId) {
        var elemId = util.classNameFor(nameAndPageId.name);
        var selector = '.' + elemId;
        var elems = document.querySelectorAll(selector);
        for (var index = 0; index < elems.length; index++) {
            var elem = elems[index];
            var linkElem = document.createElement('a');
            linkElem.setAttribute('class', elemId);
            linkElem.setAttribute('href', 'http://eol.org/pages/' + nameAndPageId.id);
            linkElem.textContent = nameAndPageId.name;
            linkElem.setAttribute('title', 'resolved EOL page for [' + nameAndPageId.name + '] using http://resolver.globalnames.org');
            var elemParent = elem.parentNode;
            elemParent.insertBefore(linkElem, elem);
            elemParent.removeChild(elem);
        }
    });
};


util.requestSelected = function (url, selector, render, updateStatus) {
    var req = util.xhr();
    if (req !== undefined) {
        req.open('GET', url, true);
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                updateStatus('received response');
                if (req.status === 200) {
                    var resp = JSON.parse(req.responseText);
                    render(resp, selector);
                } else {
                    updateStatus('not ok. Received a [' + req.status + '] status with text [' + req.statusText + '] in response to [' + url + ']');
                }
            }
        };
        updateStatus('requesting checklist...');
        req.send(null);
    }
};

util.wktStringsToGeometryCollection = function (wktStrings) {
    var wktString = "";
    if (wktStrings.length == 1) {
        wktString = wktStrings[0];
    } else if (wktStrings.length > 1) {
        wktString = "GEOMETRYCOLLECTION(" + wktStrings.join(",") + ")";
    }
    return wktString;
}

util.geometryCollectionToWktStrings = function (collectionWkt) {
    var wktStrings = [collectionWkt];
    if (collectionWkt.indexOf("GEOMETRYCOLLECTION") > -1) {
        var collStart = collectionWkt.indexOf("(");
        var collEnd = collectionWkt.lastIndexOf(")");
        var subWkts = collectionWkt.substring(collStart + 1, collEnd);
        var parts = subWkts.split(/([a-zA-Z]+)/);
        wktStrings = parts.reduce(function (agg, part) {
            if (part.match(/[a-zA-Z]+/)) {
                agg.push(part);
            } else {
                var name = agg.pop();
                if (name) {
                    var noTrailingCommaPart = part.split(/,\s*$/);
                    agg.push(name + noTrailingCommaPart[0]);
                }
            }
            return agg;
        }, []);
    }

    return wktStrings.map(function(str) { return util.wktEnvelopeToPolygon(str); });
};

util.wktEnvelopeToPolygon = function(wktString) {
    var envPrefix = "ENVELOPE(";
    var opening = wktString.indexOf(envPrefix);
    var result = wktString;
    if (opening > -1) {
        var closing = wktString.lastIndexOf(")");
        var latLngs = wktString.substring(opening+envPrefix.length, closing).split(",");
        if (latLngs.length === 4) {
            var lngMin = latLngs[0];
            var lngMax = latLngs[1];
            var latMax = latLngs[2];
            var latMin = latLngs[3];
            result = "POLYGON ((" + lngMin + " " + latMin + ", " + lngMin + " " + latMax + ", " + lngMax + " " + latMax + ", " + lngMax + " " + latMin + ", " + lngMin + " " + latMin + "))";
        }
    }
    return result;
};

util.urlForOccurrence = function(occurrence) {
  var sourceMap = { 'inaturalist': { prefix: '', suffix: '' },
    'gbif': { prefix: 'http://www.gbif.org/occurrence/search?OCCURRENCE_ID=', suffix: ''},
    'idigbio': { prefix: 'http://search.idigbio.org/v2/search/records?rq={%22occurrenceid%22:%22', suffix: '%22}'}};

  var sourceValue = sourceMap[occurrence.source];
  var idUrl;
  if (sourceValue === undefined) {
    var subject = 'no link for fresh data source [' + occurrence.source + ']';
    var body = 'please add a url mapper for source [' + occurrence.source + ']';
    idUrl = "http://github.com/gimmefreshdata/freshdata/issues/new?title=" + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  } else if (sourceValue.prefix.length == 0 && sourceValue.suffix.length == 0) {
    idUrl = occurrence.id;
  } else {
    idUrl = sourceValue.prefix + encodeURIComponent(occurrence.id) + sourceValue.suffix;
  }
  return idUrl; 
};

