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

var isTagGroupable = function (tagName, attrs) {
  return (
    (tagName === 'script' && isLocalScript(attrs)) ||
    (tagName === 'link' && isLocalStylesheet(attrs))
  );
};

var isWhitespace = function (str) {
  var c, i = str.length;
  while (i--) {
    c = str.charCodeAt(i);
    switch (c) {
      case 0x0009: case 0x000A: case 0x000B: case 0x000C: case 0x000D: case 0x0020:
      case 0x0085: case 0x00A0: case 0x1680: case 0x180E: case 0x2000: case 0x2001:
      case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007:
      case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F:
      case 0x205F: case 0x3000: continue;
    }
    return false;
  }
  return true;
}

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

  var completeReference = function () {
    currentReference.end = lastElementEndIndex;
    currentReference.string = html.substring(currentReference.start, currentReference.end);
    currentGroup.references.push(currentReference);

    currentReference = null;
  };

  var finaliseGroup = function () {
    groups.push(currentGroup);
    currentGroup = null;
  };

  var parser = new htmlparser.Parser({
    onopentag: function (tagName, attrs) {
      if (currentReference) completeReference();

      if (isTagGroupable(tagName, attrs)) {
        var type = tagName === 'script' ? 'script' : 'stylesheet';

        // finalise the current group if necessary
        if (currentGroup && (
          currentGroup.type !== type ||
          currentGroup.limitToOne ||
          currentGroup.references.length >= limit
        )) {
          finaliseGroup();
        }

        // see if this one has a hash or query string (which means it can't be grouped)
        var limitToOne = false;
        var url = attrs[tagName === 'script' ? 'src' : 'href'];
        if (url.indexOf('#') !== -1 || url.indexOf('?') !== -1)
          limitToOne = true;

        // if we need to limit this next group to one, we must finalise the last one too
        if (limitToOne && currentGroup) finaliseGroup();

        // start the next group if necessary
        if (!currentGroup) {
          currentGroup = {
            type: type,
            references: [],
            limitToOne: limitToOne
          };
        }

        // start off the reference object (will be finished off when we reach the close tag)
        currentReference = {
          type: tagName === 'script' ? 'script' : 'stylesheet',
          url: url,
          start: parser.startIndex
        };
      }
      else {
        // this tag isn't a concatenatable type.

        // complete the current group if there is one
        if (currentGroup) finaliseGroup();

        // add a [non-groupable] reference for this one
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

    ontext: function (text) {
      // if there's any non-whitespace in this text node, finalise any current groups/refs
      if (!isWhitespace(text)) {
        if (currentReference) completeReference();
        if (currentGroup) finaliseGroup();
      }
    },

    onclosetag: function (tagName) {
      lastElementEndIndex = parser.endIndex + 1;
    },

    onend: function () {
      if (currentReference) completeReference();
      if (currentGroup) finaliseGroup();
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
