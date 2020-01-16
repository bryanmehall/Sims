/*
state Shape:
	content:{
		activeCourse: "controlSystems"
		activePart: "simpleharmonicoscillator"
		activeBlock: "damping"
		courses:[
			{
				id : "controlSystems"
				title: "Control Systems",
				parts:[
					"intro",
					"simpleharmonicoscillator",
					"dampedharmonicoscillator",
				]
			}
		]
		parts[
			{
				id:"simpleharmonicoscillator "
				course:"controlSystems"
				title: Simple Harmonic oscillator
				blocks:[
						id:damping
				]
			}
		]

		contentBlocks: [
			{
				id: "damping"
				part:"simpleHarmonicOscillator"
				course:"controlSystems"
				complete: false
				Title:"damping"
				text:"adjust damping ratio
				anim:{//must be a quantity object
						"value": 0,
						"min": 0,
						"max": 28,
						"symbol": "dispT",
						"independent": true,
						"abstractions": 10,
						"animation": {
							"playing": false
						}
					},
				tests?
			}
		]

	},
	sim:{
		quantity     	//quantity reducers
		object			//objectreducers
	}
*/


export { default as sim } from "./sim"
export { default as content } from "./content"

