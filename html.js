'use strict';

var htmlparser = require('htmlparser2');

// helper functions
var isLocalURL = function (url) {
  return url && url.indexOf('//') === -1 && url.indexOf(':') === -1;
};

var isLocalScript = function (attrs) {
  return ((attrs.type == null) || attrs.type === 'application/javascript') && isLocalURL(attrs.src);
};

var isLocalStylesheet = function (attrs) {
  return attrs.rel === 'stylesheet' && isLocalURL(attrs.href);
};

var isGroupableTag = function (tagName, attrs) {
  return (
    (tagName === 'script' && isLocalScript(attrs)) ||
    (tagName === 'link' && isLocalStylesheet(attrs))
  );
};

var urlAttribute = {
  script: 'src',
  link: 'href',
  img: 'src',
  source: 'src',
  object: 'data',
  track: 'src'
};

module.exports = function (html, limit) {

  // process args
  if (typeof html !== 'string') throw new TypeError('First argument must be a string');
  if (limit == null || limit === true) limit = Infinity;
  else if (!limit) limit = 1;
  else if (typeof limit !== 'number') throw new TypeError('Unexpected type for 2nd argument');

  // prepare to collect references in groups
  var groups = [];
  var currentReference, currentGroup, lastElementEndIndex;

  var completeCurrentReference = function () {
    currentReference.end = lastElementEndIndex;
    currentReference.string = html.substring(currentReference.start, currentReference.end);
    currentGroup.references.push(currentReference);

    currentReference = null;
  };

  var completeCurrentGroup = function () {
    groups.push(currentGroup);
    currentGroup = null;
  };

  var parser = new htmlparser.Parser({
    onopentag: function (tagName, attrs) {
      if (currentReference) completeCurrentReference();

      if (isGroupableTag(tagName, attrs)) {
        var type = tagName === 'script' ? 'script' : 'stylesheet';

        if (currentGroup && (
          currentGroup.type !== type ||
          currentGroup.limitToOne ||
          currentGroup.references.length >= limit
        )) {
          completeCurrentGroup();
        }

        // see if this one has a hash or query string (which means it can't be grouped)
        var limitToOne = false;
        var url = attrs[tagName === 'script' ? 'src' : 'href'];
        if (url.indexOf('#') !== -1 || url.indexOf('?') !== -1)
          limitToOne = true;

        // if this next group is limitToOne, we must complete the last one too
        if (currentGroup && limitToOne)
          completeCurrentGroup();

        // start the next group
        if (!currentGroup) {
          currentGroup = {
            type: type,
            references: [],
            limitToOne: limitToOne
          };
        }

        // start off the reference object (will be finished off after)
        currentReference = {
          type: tagName === 'script' ? 'script' : 'stylesheet',
          url: url,
          start: parser.startIndex
        };
      }
      else {
        // this tag isn't a concatenatable type.

        if (currentGroup) completeCurrentGroup();

        switch (tagName) {
        case 'img':
        case 'source':
        case 'track':
          if (isLocalURL(attrs.src)) {
            currentGroup = {
              references: []
              // no type necessary
            };

            currentReference = {
              type: tagName,
              url: attrs.src,
              start: parser.startIndex
            };
          }
          break;
        }
      }
    },

    onclosetag: function (tagName) {
      lastElementEndIndex = parser.endIndex + 1;
    },

    onend: function () {
      if (currentReference) completeCurrentReference();
      if (currentGroup) completeCurrentGroup();
    }
  });


  // run the parser
  parser.write(html);
  parser.end(); // groups array is now complete


  // return just the references array for each group
  return groups.map(function (group) {
    return group.references;
  });
};
