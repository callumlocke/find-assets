findAssets = require '..'
path = require 'path'
fs = require 'fs'
_ = require 'lodash'
{expect} = require 'chai'

describe '.html()', ->
  expected = require(path.resolve(__dirname, 'expected', 'html.json'));
  html = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'example.html')).toString()


  it 'finds references and groups them', ->
    references = findAssets.html(html)
    fs.writeFileSync(path.resolve(__dirname, 'OUTPUT.json'), JSON.stringify(references, null, 2))
    expect(references).to.deep.equal(expected)

  it 'can disable grouping', ->
    references = findAssets.html(html, false)
    expectedUngrouped = _.flatten(expected).map (ref) -> [ref]
    expect(references).to.deep.equal(expectedUngrouped)


describe '.css()', ->
  it 'works'
