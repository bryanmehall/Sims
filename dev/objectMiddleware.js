import { getObject } from './ducks/object/selectors'
export const objectMiddleware = store => next => action => {
	const state = store.getState()
	//#### for this to work it needs to update parents as well???
	if (action.type === 'SET_PROP'){
		const value = action.payload.value

		if (typeof value === 'string') {//this code for assigning ids needs to be cleaned up
			const def = getObject(state, action.payload.value)
			sha256(JSON.stringify(def))
				.then((hash) => {
					const newPayload = Object.assign(action.payload, { id:hash })
					const actionWithId = Object.assign(action, { payload: newPayload })
					next(actionWithId)
				})
		} else {
			let id
			if (!value.hasOwnProperty('id')){
				throw 'primitive needs id!!'
			}

			const newPayload = Object.assign(action.payload, { value })
			const actionWithId = Object.assign(action, { payload: newPayload })
			return next(actionWithId)
		}
	} else {
		return next(action)
	}



}


 // adapted from MDN subtle crypto example
function sha256(str) {
  var buffer = new TextEncoder("utf-8").encode(str);
  return crypto.subtle.digest("SHA-256", buffer).then(function (hash) {
    return hex(hash);
  });
}

function hex(buffer) {
  var hexCodes = [];
  var view = new DataView(buffer);
  for (var i = 0; i < view.byteLength; i += 4) {
    // using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
    var value = view.getUint32(i)
    // toString(16) will give the hex representation of the number without padding
    var stringValue = value.toString(16)
    // we use concatenation and slice for padding
    var padding = '00000000'
    var paddedValue = (padding + stringValue).slice(-padding.length)
    hexCodes.push(paddedValue);
  }

  // join all the hex strings into one
  return hexCodes.join("");
}
