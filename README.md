# find-assets

Synchronous functions for finding asset references in HTML and CSS strings.

Returned references may be grouped to indicate that those references might be concatenatable (i.e. when adjacent scripts or stylesheets are found in an HTML string).

```sh
$ npm install find-assets
```

```js
var findAssets = require('find-assets');
```


## Usage

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
var references = findAssets.html(str);

// result:
references === [
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
      url: 'scripts/x.js',
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

The two scripts in the above example are grouped together in an array to indicate their sources could reasonably be concatenated and the elements replaced by a single element. Grouping will only occur for adjacent elements that are all scripts or all stylesheets, all with local, static URLs (no `?` or `#`). 'Adjacent' means the elements can only be separated by whitespace or comments. (A future version will also prevent the grouping of elements that have a conditional comment boundary between them.)

You can also pass `false` as a second argument to `findAssets.html()` – this will prevent adjacent tags getting grouped together. References will still be returned in the same format (as an array of arrays), but the inner arrays will only be one item long. You can also optionally pass a number if you want to limit the group length to that number.


### `findAssets.css()` – NOT YET IMPLEMENTED

Given a string of CSS, `findAssets.css()` returns a list of objects representing all `url(...)` tokens found.

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
var references = findAssets.html(str);

// result:
references === [
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
