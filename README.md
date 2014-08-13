# find-assets

Synchronous functions for finding asset references (scripts, stylesheets, images, etc.) in HTML ~~and CSS~~ strings. The returned data is designed to assist with concatenation and revving.

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][depstat-image]][depstat-url]

The module exports two functions: one for finding assets in HTML, and one for finding them in CSS (background images etc.).

In the `.html()` method, asset details are grouped to indicate that those assets are concatenatable (i.e. when adjacent scripts or stylesheets are found in an HTML string). It is up to you to concatenate them. Substring indexes are included so you can update your HTML to point to new concatenated files.


## usage

```sh
$ npm install find-assets
```

```js
var findAssets = require('find-assets');
```


### `findAssets.html()`

Given a string of HTML, `findAssets.html()` returns a list of objects representing each image, stylesheet, JavaScript or video source found.

```html
<body>
  <img src="../foo.jpg">
  <p>hi</p>

  <script src="scripts/x.js"></script>
  <script src="scripts/y.js"></script>

  <link rel=stylesheet href="/styles/thing.css">
</body>
```

```js
findAssets.html(str);

// returns:
[
  [
    {
      type: 'image',
      url: '../foo.jpg',
      start: 9,
      end: 31,
      string: '<img src="../foo.jpg">'
    }
  ],
  [
    {
      type: 'script',
      url: 'scripts/x.js',
      start: 47,
      end: 83,
      string: '<script src="scripts/x.js"></script>'
    },
    {
      type: 'script',
      url: 'scripts/y.js',
      start: 86,
      end: 122,
      string: '<script src="scripts/y.js"></script>'
    }
  ],
  [
    {
      type: 'stylesheet',
      url: '/styles/thing.css',
      start: 126,
      end: 172,
      string: '<link rel=stylesheet href="/styles/thing.css">'
    }
  ]
];
```


#### the results

The results are always an **array** of **arrays** of **objects**.

One object details one asset reference, such as a `script`, `img`, or `link`. The `string` is the whole element substring, and the `start` and `end` are indexes of that substring within the full HTML string.

If an inner array contains more than one object, that means those assets could reasonably be concatenated, and the entire HTML substring (from the `start` of the first tag in the group to the `end` of the last one) could safely be replaced with a single `script` or `link` element pointing at a concatenated version of the assets. (It is up to you to concatenate the assets and update the HTML.)

In the above example, you could concatenate the scripts `scripts/x.js` and `scripts/y.js` together, and replace the whole substring from `47` to `122` of the HTML with a single script tag pointing at the new concatenated version.


##### determining adjacency

Elements are 'adjacent' if they are all the same type (either all scripts or all stylesheets) and they have nothing of consequence between them. That means only whitespace and *basic* comments (not conditional comments) are allowed between adjacent elements. Anything else, and the elements aren't considered adjacent. The idea is: if you could safely concatenate the scripts/stylesheets within a group, and replace the whole set of adjacent elements with a single `script` or `link` tag pointing at the concatenated result, without affecting how the page works (excepting contrived edge cases), then they are grouped together.

From v0.1, `findAssets.html()` looks inside **conditional comments** for references too. If same-type elements are adjacent inside a conditional comment, then those will be grouped just as if they were in the main document. But elements are never grouped together across a conditional comment boundary – i.e. elements immediately before or after a conditional comment will not be grouped together, nor will they be grouped with any elements found inside the conditional comment.

You can also pass `false` as a second argument to `findAssets.html()` – this  disables grouping of adjacent assets. Results are still be returned in the same format (as an array of arrays), but the inner arrays will all have length 1. (You can alternatively pass a number as a second argument, instead of `false`, if you want to limit group sizes to that number.)


### `findAssets.css()` – NOT YET IMPLEMENTED

Given a string of CSS, `findAssets.css()` returns a list of objects representing all `url(...)` tokens found.

CSS is simpler because nothing can be concatenated. (Spriting is outside the scope of this module.)

```css
@font-face {
  font-family: "Bitstream Vera Serif Bold";
  src: url("VeraSeBd.ttf");
}

body {
  background-image: url(images/foo.png);
}
```

```js
findAssets.css(str);

// returns:
[
  [
    {
      url: 'VeraSeBd.ttf',
      start: 64,
      end: 83,
      string: 'url("VeraSeBd.ttf")'
    }
  ],
  [
    url: 'images/foo.png',
    start: 115,
    end: 134,
    string: 'url(images/foo.png)'
  ]
];
```

For consistency with `findAssets.html()`, the results are returned 'grouped' in arrays, but these arrays always have length 1.


## license

[The MIT License](http://opensource.org/licenses/MIT)


[npm-url]: https://npmjs.org/package/find-assets
[npm-image]: https://badge.fury.io/js/find-assets.png

[travis-url]: http://travis-ci.org/callumlocke/find-assets
[travis-image]: https://secure.travis-ci.org/callumlocke/find-assets.png?branch=master

[depstat-url]: https://david-dm.org/callumlocke/find-assets
[depstat-image]: https://david-dm.org/callumlocke/find-assets.png
