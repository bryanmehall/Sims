import { Runtime } from './ducks/object/runtime'
import fs from 'fs'

//create mock functions and canvas
console.group = function(){}
console.groupEnd = function(){}
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
    if (canvasResult.text === "test" && canvasResult.x === 20 && canvasResult.y === 30){
        done()
    } else {
        done.fail(`conditions not met ${JSON.stringify(canvasResult)}`)
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

