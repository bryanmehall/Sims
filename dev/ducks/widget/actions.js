import types from "./types";
const setActive = (id, active) => ({
	type: "SET_ACTIVE",
	payload: {
		active: active
	}
})
const addWidget = (name, type, props, children) => ({
	type: "ADD_WIDGET",
	payload: {
		name, type, props, children
	}
});



const addChild = (childName, name) => ({
	type: "ADD_CHILD",
	payload: {
		childName, name
	}
})
const removeChild = (childName, name) => ({
	type: "REMOVE_CHILD",
	payload: {
		name, childName
	}
});

const setProp = (name, propName, value) => ({
	type: "SET_PROP",
	payload: {
		name, propName, value
	}
})



export default {
	addWidget,
	addChild,
	removeChild,
	setProp,
	setActive
};
