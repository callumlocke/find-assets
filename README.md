# find-assets [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][depstat-image]][depstat-url]

Synchronous functions for finding asset references (scripts, stylesheets, images, etc.) in HTML ~~and CSS~~ strings. The returned data structure is designed to help you do things like concatenation and revving.

The module exports two functions: one for finding assets in HTML, and one for finding assets in CSS (background images etc.).

In the `.html()` method, asset details are grouped to indicate that those assets are candidates for concatenation, i.e. whenever sets of adjacent `<script>` or `<link rel="stylesheet">` elements are found. (It is up to you to actually do the concatenating – substring indexes are included so you can update your HTML to point to new concatenated files.)


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

The results are always returned as an **array** of **arrays** of **objects**.

One object details one asset reference, such as a `script`, `img`, or `link`. The `string` is the whole element substring, and the `start` and `end` are indexes of that substring within the full HTML string.

If an inner array contains more than one object, it means these assets could reasonably be concatenated, and the entire HTML substring (from the `start` of the first tag in the group to the `end` of the last one) could safely be replaced with a single `script` or `link` element pointing at a concatenated version of the assets. (It is up to you to concatenate the assets and update the HTML accordingly, using the information provided.)

In the above example, you could concatenate the scripts `scripts/x.js` and `scripts/y.js` together, and replace the whole substring from `47` to `122` of the HTML with a single script tag pointing at the new concatenated version.


##### determining adjacency

Elements are 'adjacent' if they are all the same type (either all scripts or all stylesheets) and they have nothing of consequence between them. That means only whitespace and *basic* comments (not conditional comments) are allowed between adjacent elements. Anything else, and the elements aren't considered adjacent. The idea is: if you could safely concatenate the scripts/stylesheets within a group, and replace the whole set of adjacent elements with a single `script` or `link` tag pointing at the concatenated result, without affecting how the page works (excepting contrived edge cases), then they are grouped together.

From v0.1, `findAssets.html()` looks inside **conditional comments** for references too. If same-type elements are adjacent inside a conditional comment, then those will be grouped just as if they were in the main document. But elements are never grouped together across a conditional comment boundary.

#### disabling/limiting grouping

You can limit groups to a particular size by passing a number as a second argument. For example, limiting to `1` effectively disables grouping.

```js
findAssets.html(str, 1);
```

(The default 2nd argument is `Infinity`.)


### `findAssets.css()` – NOT YET IMPLEMENTED

Given a string of CSS, `findAssets.css()` returns an object for each `url(...)` token:

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

For consistency with `findAssets.html()`, the results are returned as an array of arrays. But the inner arrays always have length 1, because CSS assets can't be concateanted. (Image spriting is outside the scope of this module.)


## licence

[The MIT License](http://opensource.org/licenses/MIT)


<!-- badge URLs -->
[npm-url]: https://npmjs.org/package/find-assets
[npm-image]: https://img.shields.io/npm/v/find-assets.svg?style=flat-square

[travis-url]: http://travis-ci.org/callumlocke/find-assets
[travis-image]: https://img.shields.io/travis/callumlocke/find-assets.svg?style=flat-square

[depstat-url]: https://david-dm.org/callumlocke/find-assets
[depstat-image]: https://img.shields.io/david/callumlocke/find-assets.svg?style=flat-square
