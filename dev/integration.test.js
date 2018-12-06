import { lynxParser } from './lynxParser'
import { compile } from './ducks/object/selectors'

var fs = require('fs');

const runTest = (objects, done) => {
    const state = { sim: { object: objects } }
    const { renderMonad, functionTable } = compile(state)
    const render = renderMonad(functionTable)
    let xTest, yTest, innerTextTest
    const prim = {
        text: (x, y, innerText) => {
           xTest = x
           yTest = y
           innerTextTest = innerText
        }
    }
    render(prim, {})
    /*console.log(xTest, yTest, innerTextTest)
    let contains20 = false
    let contains30 = false
    let containsTest = false
    let isNotUndef = true

    Object.entries(functionTable).forEach((func) => {
        const st = func.toString()
        if (st.includes(' 20')){
            contains20 = true
        }
        if (st.includes(' 30')){
            contains30 = true
        }
        if (st.includes('test')){
            containsTest = true
        }
        if (st.includes('undefined')){
            isNotUndef = false
        }
    })
    const pass = contains20 && contains30 && containsTest && isNotUndef*/
    if (xTest === 20 && yTest === 30 && innerTextTest === 'test'){
        done()
    } else {
        done.fail('conditions not met'+[xTest, yTest, innerTextTest].join(', '))
    }
}
const loadAndRunTest = (testName, folder, done) => {
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
                    const core = lynxParser(coreData)
                    const file = lynxParser(fileData)
                    const objects = Object.assign({}, core, file)
                    runTest(objects, done)
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
    'parent-of-get'
]
const dbTests = [
    'simple-get',
    'direct-child',
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
