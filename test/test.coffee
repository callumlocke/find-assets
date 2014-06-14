findAssets = require '..'
path = require 'path'
fs = require 'fs'
_ = require 'lodash'
CSON = require 'cson'
{expect} = require 'chai'

describe '.html()', ->
  expected = CSON.parseFileSync(path.resolve(__dirname, 'expected', 'html.cson'))
  html = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'example.html')).toString()

  it 'finds references and groups them', ->
    references = findAssets.html(html)
    expect(references).to.deep.equal(expected)

  it 'can disable grouping', ->
    references = findAssets.html(html, false)
    expectedUngrouped = _.flatten(expected).map (ref) -> [ref]
    expect(references).to.deep.equal(expectedUngrouped)


describe '.css()', ->
  it 'works'
