import { Runtime } from './ducks/object/runtime'
import { getValueAndContext } from './ducks/object/objectUtils'
import fs from 'fs'
import { coreFiles } from './lynxParser'

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
    const { value, context } = getValueAndContext(runtime.hashTable, "canvasRep", windowObject, [[]])//this is the lynx string for canvasRep
    const { value: value1, context: context1 } = getValueAndContext(runtime.hashTable, "equalTo", value, context)
    const canvasString = getValueAndContext(runtime.hashTable, "jsRep", value1, context1).value.value
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
    fs.readFile(path, 'utf8', (err, fileData) => {
        if (err) {
            done.fail('could not read filename')
        } else {
            const run = (coreText) => {
                const lynxText = coreText + fileData
                try {
                    runTest(done, lynxText)
                } catch (e){
                    done.fail(`error running ${testName} \n ${e}`)
                }
            }
            loadCoreText(coreFiles, done, run)
        }
    })
}

const loadCoreText = (fileList, done, cb, index, text) => {
    index = index || 0
    text = text || ''
    const fileName = fileList[index]
    const path = __dirname+`/../courses/experimental/lynx/${fileName}.lynx`
    fs.readFile(path, 'utf8', (err, lynxText) => {
        if (err) {
            done.fail('could not read core')
        } else if (index == fileList.length-1) {
            cb(text+lynxText)
        } else {
            loadCoreText(fileList, done, cb, index+1, text+lynxText)
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
const integrationTests = [
    'factorial',
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
const dbTestString = generateTestSuite(integrationTests, 'integration')

eval(coreTestString + '\n' + dbTestString)
    //terrible hack because jest doesn't have programatic test generation

