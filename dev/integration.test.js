import { Runtime } from './ducks/object/runtime'
import { createParentContext } from './ducks/object/contextUtils'
import { getValueAndContext, getHash, objectFromName } from './ducks/object/objectUtils'

import fs from 'fs'
import { object } from 'prop-types'

//create mock functions and canvas
console.group = function(){}
console.groupEnd = function(){}
Object.fromEntries = (iterable) => {
    return [...iterable].reduce((obj, [key, val]) => {
      obj[key] = val
      return obj
    }, {})
  }
let canvasResult = {}
const canvas = {
    getBoundingClientRect: () => (
        { width: 500, height: 500 }
    ),
    getContext: (config) => ({
        fillText: (text, x, y) => { canvasResult = { text, x, y } },
        clearRect: () => {canvasResult = {}}
    }),
    addEventListener: (type) => {

    }
}

const runTest = (done, lynxText) => {
    canvasResult = {}
    const runtime = new Runtime(lynxText, canvas, ()=>{})
    const windowObject = runtime.parse(lynxText, 'window') //remove state side effect here
    const canvasRepHash = getHash(objectFromName(runtime.hashTable, 'canvasRep'))
    const windowContext = createParentContext(runtime.hashTable, [[]], windowObject, canvasRepHash)
    const {value, context} = getValueAndContext(runtime.hashTable, "canvasRep", windowObject, windowContext)//this is the lynx string for canvasRep
    const canvasString = getValueAndContext(runtime.hashTable, "jsRep", value, context).value.value
    if (canvasString.includes("ctx.fillText('test', 20, 30)")){
        done()
    } else {
        done.fail(`conditions not met ${canvasString}`)
    }
}

const loadAndRunTest = (testName, folder, done) => {
    //const corePath = path.join(__dirname, '..', 'courses', 'experimental', 'lynx', 'core.lynx')
    //const path = path.join(__dirname, '..', 'courses', 'experimental', 'folder', `${testName}.lynx`)
    const corePath = __dirname + '/../courses/experimental/lynx/core.lynx'
    const path = `${__dirname}/../courses/experimental/${folder}/${testName}.lynx`
    fs.readFile(corePath, 'utf8', (err, coreData) => {
        if (err) {
            done.fail('could not read core')
        } else {
            fs.readFile(path, 'utf8', (err, fileData) => {
                if (err) {
                    done.fail('could not read filename')
                } else {
                    const lynxText = coreData + fileData
                    try {
                        runTest(done, lynxText)
                    } catch (e){
                        done.fail(`error running ${testName} \n ${e}`)
                    }
                }
            })
        }
    })
}

const coreTests = [
    'simple-get',
    'multiple-get',
    'get-end-chain',
    'get-middle-chain',
    'non-local-root',
    'inverse-no-prim',
    'get-new-object',
    'parent-path',
    'vardef-in-get-chain',
    'vardef-in-get-append',
    'parent-of-get',
    'primitive-context',
    'local-new-object-get',
    'local-get-end-get-stack',
    'parent-of-new-get'
]
const dbTests = [
    //'simple-get',
    //'direct-child',
    //'parent'
]
const generateTestSuite = (testNames, folder) => (
    testNames.map((name) => (
    `describe('${folder}', () => {`+
        `it('${name}', (done) => {`+
            `loadAndRunTest('${name}','${folder}', done)`+
        `})`+
    `})`
    )).join('\n')
)

const coreTestString = generateTestSuite(coreTests, 'lynx')
const dbTestString = generateTestSuite(dbTests, 'dbsearch')

eval(coreTestString + '\n' + dbTestString)
    //terrible hack because jest doesn't have programatic test generation

