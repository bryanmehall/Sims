export const log = (...args) => {
    if (window.debug){
        console.log(...args)
    }
}
