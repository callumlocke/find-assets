findAssets = require '..'
path = require 'path'
fs = require 'fs'
_ = require 'lodash'
{expect} = require 'chai'

rewriteReferences = (html, assetGroups) ->
  newHTML = ''
  lastIndex = 0
  for group in assetGroups
    first = group[0]
    last = group[group.length - 1]
    element = switch group[0].type
      when 'img' then ['<img src="', '">']
      when 'script' then ['<script src="', '"></script>']
      when 'stylesheet' then ['<link rel="stylesheet" href="', '">']
      else throw new TypeError "unexpected type: #{group[0].type}"
    url = group.map((asset) -> asset.url).join('_')
    newHTML += (
      html.substring(lastIndex, first.start) +
      element[0] + url + element[1]
    )
    lastIndex = last.end
  newHTML += html.substring(lastIndex)

describe '.html()', ->
  expectedResults = require(path.resolve(__dirname, 'expected', 'expected.json'));
  expectedHTML = fs.readFileSync(path.resolve(__dirname, 'expected', 'expected.html')).toString();
  html = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'example.html')).toString()


  it 'works', ->
    assetGroups = findAssets.html(html)

    fs.writeFileSync path.join(__dirname, 'output.json'), JSON.stringify(assetGroups, null, 2)
    newHTML = rewriteReferences(html, assetGroups)
    fs.writeFileSync path.join(__dirname, 'output.html'), newHTML

    expect(assetGroups).to.deep.equal(expectedResults)
    expect(newHTML).to.equal(expectedHTML)


  it 'can disable grouping', ->
    assetGroups = findAssets.html(html, false)

    expectedUngrouped = _.flatten(expectedResults).map (ref) -> [ref]
    expect(assetGroups).to.deep.equal(expectedUngrouped)


describe '.css()', ->
  it 'works'
