'use strict';

var htmlparser = require('htmlparser2');

// helper functions
var isLocalURL = function (url) {
  return url && url.indexOf('//') === -1 && url.indexOf(':') === -1;
};

var isLocalScript = function (attrs) {
  return (
    (attrs.type == null) || attrs.type === 'application/javascript'
  ) && isLocalURL(attrs.src);
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
      case 0x0009: case 0x000A: case 0x000B: case 0x000C: case 0x000D:
      case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x180E:
      case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004:
      case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009:
      case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F:
      case 0x3000: continue;
    }
    return false;
  }
  return true;
};


module.exports = function findRefsInHTML(html, limit) {

  // process args
  if (typeof html !== 'string')
    throw new TypeError('First argument must be a string');
  if (limit == null) limit = Infinity;
  if (typeof limit !== 'number')
    throw new TypeError('2nd argument should be a number');

  // prepare to collect references in groups
  var groups = [];
  var currentReference, currentGroup, lastElementEndIndex,
      currentOpenTagName;

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
      currentOpenTagName = tagName;

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
         case 'link':
         	if (attrs.rel === 'import' && attrs.href) {
         		currentGroup = {
              references: []
              // no type necessary
            };

            currentReference = {
              type: 'import',
              url: attrs.href,
              start: parser.startIndex
            };
         	}
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

    oncomment: function (comment) {
      if (currentReference) completeReference();

      var result = /^\[[^\]]+\]>/.exec(comment);

      if (result) {
        // this is an IE conditional comment (the actually-a-comment kind).
        // this should always break up the current group (unlike simple comments)
        if (currentGroup) finaliseGroup();

        // find refs from inside the CC (which may themselves be grouped)
        var ccOpenerLength = result[0].length;
        var ccContents = comment.substring(ccOpenerLength, comment.length - 9);
        var ccRefGroups = findRefsInHTML(ccContents, limit);
        var ccContentsStart = parser.startIndex + 4 + ccOpenerLength; // 4 is for the "<!--"

        // find any refs inside the CC, and add them to our array
        ccRefGroups.forEach(function (group) {

          // increase the indexes of each ref to get its position in the main doc
          group.forEach(function (reference) {
            reference.start += ccContentsStart;
            reference.end += ccContentsStart;
          });

          groups.push({
            references: group // this key necessary because of the .map() right at the end that undoes it
          });
        });
      }
      else if (comment == '<![endif]') {
        if (currentGroup) finaliseGroup();
      }
    },

    onclosetag: function (tagName) {
      // handle previous element being a void (eg the stylesheet just
      // before </head> in test fixture)
      if (currentReference && tagName !== currentOpenTagName)
        completeReference();

      currentOpenTagName = null;
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
