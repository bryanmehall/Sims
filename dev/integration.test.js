import { lynxParser } from './lynxParser'
import { compile } from './ducks/object/selectors'

var fs = require('fs');

const runTest = (testName, objects, done) => {
    const state = {sim:{object:objects}}
    const {renderMonad, functionTable} = compile(state)
    let contains20 = false
    let containsTest = false
    let isNotUndef = true
    Object.entries(functionTable).forEach((func) => {
        const st = func.toString()
        if (st.includes('20')){
            contains20 = true
        }
        if (st.includes('test')){
            containsTest = true
        }
        if (st.includes('undefined')){
            isNotUndef = false
        }
    })
    const pass = contains20 && containsTest && isNotUndef
    if (pass){
        done()
    } else {
        done.fail('conditions not met.')
    }
}
const loadAndRunTest = (testName, done) => {
    const corePath = __dirname + '/../courses/experimental/lynx/core.lynx'
    const path = `${__dirname}/../courses/experimental/lynx/${testName}.lynx`
    let filesRead = 0
    let sources = {}
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
                    runTest(testName, objects, done)
                }
            })
        }
    })

}

const testNames = [
    'simple-get',
    'multiple-get',
    'get-end-chain',
    'get-middle-chain',
    'non-local-root',
    'inverse-no-prim',
    'get-new-object'
]

const testString = testNames.map((name, index) => (
    `describe('${name}', () => {`+
        `it('${name}', (done) => {`+
            `loadAndRunTest('${name}', done)`+
        `})`+
    `})`
    )).join('\n')




eval(testString)
    //terrible hack because jest doesn't have programatic test generation

