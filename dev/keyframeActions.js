import ObjectActions from './ducks/object/actions'
import QuantityActions from './ducks/quantity/actions'



//start and inverse.end must be opposites ie enter then exit is noop
const fadeObjectIn = {
	inverse: "fadeObjectOut",
	start: function (store, t, tweenData) {
		var params = tweenData.params
		store.dispatch(ObjectActions.addObject(params.name, params.type, params.props, params.children))
		store.dispatch(ObjectActions.addChild(params.name, params.parent))
	},
	tween: function (store, t, tweenData) {
		var alpha = (t - tweenData.start) / (tweenData.dur)
		store.dispatch(ObjectActions.setProp(tweenData.params.name, 'opacity', alpha))
	},
	end: function () {
		//console.log('end of fade in')
	}
}

const fadeObjectOut = {
	inverse: "fadeObjectIn",
	start: function (store, t, tweenData) {},
	tween: function (store, t, tweenData) {
		const alpha = 1+(tweenData.start - t) / (tweenData.end - tweenData.start)
		store.dispatch(ObjectActions.setProp(tweenData.params.name, 'opacity', alpha))
	},
	end: function (store, t, tweenData) {
		var params = tweenData.params
		store.dispatch(ObjectActions.removeChild(params.name, params.parent))
			//store.dispatch(ObjectActions.removeObject(params.name))
	}
}
const tweenProperty = {
	inverse: "tweenProperty",
	start: (store, t, tweenData) => {},
	tween: (store, t, tweenData) => {
		const { initValue, finalValue, objectName, propName } = tweenData.params
		const timeFraction = (t-tweenData.start)/(tweenData.end-tweenData.start)
		const value = timeFraction*(finalValue-initValue)+initValue
		store.dispatch(ObjectActions.setProp(objectName, propName, value))
	},
	end: (store, t, tweenData) => {
		const { finalValue, objectName, propName } = tweenData.params
		store.dispatch(ObjectActions.setProp(objectName, propName, finalValue))
	}
}
const tweenQuantity = {//this should be combined with tween property
	inverse: "tweenQuantity",
	start: (store, t, tweenData) => {},
	tween: (store, t, tweenData) => {
		const { initValue, finalValue, quantityName } = tweenData.params
		const timeFraction = (t-tweenData.start)/(tweenData.end-tweenData.start)
		const value = timeFraction*(finalValue-initValue)+initValue
		store.dispatch(QuantityActions.setValue(quantityName, value))
	},
	end: (store, t, tweenData) => {
		const { finalValue, quantityName } = tweenData.params
		store.dispatch(QuantityActions.setValue(quantityName, finalValue))
	}
}

//interpolation functions
const interp = {
	linear: (t, startTime, endTime, startVal, endVal) => {

	},
	cubic: (t, startTime, endTime, startVal, endVal) => {

	}
}


export default {
	fadeObjectIn,
	fadeObjectOut,
	tweenProperty,
	tweenQuantity
}
