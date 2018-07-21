import { lynxParser } from './lynxParser'
import { compile } from './ducks/object/selectors'

var fs = require('fs');

const getAST = (testName, callback) =>{

}
const runTest = (testName, objects, done) => {
    const state = {sim:{object:objects}}
    const {renderMonad, functionTable} = compile(state)
    let pass = false
    Object.entries(functionTable).forEach((func) => {
        const st = func.toString()
        console.log("#####", st)
        if (st.includes('20')&&st.includes('test') && !st.includes('undefined')){
            pass = true
        }
    })
    if (pass){
        done()
    } else {
        done.fail('conditions not met')
    }
}

const loadAndRunTest = (testName, done) => {
    const corePath = __dirname + '/../courses/experimental/lynx/core.lynx'
    const path = `${__dirname}/../courses/experimental/lynx/${testName}.lynx`
    let filesRead = 0
    let firstData
    fs.readFile(corePath, 'utf8', (err, data) => {
        if (err) {
            done.fail('could not read core')
        } else {
            filesRead+=1
            checkComplete(data)
            firstData = data
        }
    })
    fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
            done.fail('could not read filename')
        } else {
            filesRead+=1
            checkComplete(data)
            firstData = data
        }
    })
    const checkComplete = (data) =>{
        if (filesRead === 2){
            const dataSources = [firstData, data]
            const objectSources = dataSources.map((data) => (lynxParser(data)))
            const objects = Object.assign({}, objectSources[0], objectSources[1])
            runTest(testName, objects, done)
        }
    }
}

const testNames = [
    'simple-get',
    'multiple-get',
    'get-end-chain',
    'non-local-root',
    'parent-path'
]
const testString = testNames.map((name, index) => (
        `it('${name}', (done) => {`+
            `setTimeout(() => {loadAndRunTest('${name}', done)}, ${index}*2000)`+
        `})`
    )).join('\n')



describe('simple-get', () => {
    eval(testString)
    //terrible hack because jest doesn't have programatic test generation
})
