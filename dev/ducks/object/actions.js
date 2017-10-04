const addObject = (name, type, props, children) => ({
	type: "ADD_OBJECT",
	payload: {
		name, type, props, children
	}
})

const setActive = (name, active) => ({
	type: "SET_PROP",
	payload: {
		name,
        prop: "active",
        value: active
	}
})
const setActiveObject = (name) => (
	setProp("app", "activeObject", name)
)
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
})

const setProp = (name, prop, value) => ({
	type: "SET_PROP",
	payload: {
		name, prop, value
	}
})



export default {
	addObject,
	addChild,
	removeChild,
	setProp,
	setActive,
	setActiveObject
}
