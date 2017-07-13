export const initialState = JSON.stringify({
	widgets: {
		app: {
			type: 'SmdApp',
			props: {},
			children: ['massPlot', 'forcingEq']
		},
		forcingEq: {
			type: 'Expression',
			props: {
				pos: { x: 150, y: 500 }
			},
			children: ['fExt','eq1', 'springCoef', 'yVal','lp1','tVal','rp1' ,'plus1', 'dampCoef', 'dydtVal','lp2','tVal1','rp2']
		},
		fExt: {
			type: 'Value',
			props: {
				quantity: 'fext',
				active: false
			}
		},
		eq1:{
			type: 'EqText',
			props:{
				text:"="
			}
		},
		springCoef: {
			type: 'Value',
			props: {
				quantity: 'k',
				active: false
			}
		},
		yVal: {
			type: 'Value',
			props: {
				quantity: 'y',
				active: false
			}
		},
		lp1:{
			type: 'EqText',
			props: {
				text: "("
			}
		},
		tVal: {
			type: 'Value',
			props: {
				quantity: 't',
				active: false
			}
		},
		rp1: {
			type: 'EqText',
			props: {
				text: ")"
			}
		},
		plus1: {
			type: 'EqText',
			props: {
				text: "+"
			}
		},
		dampCoef: {
			type: 'Value',
			props: {
				quantity: 'c',
				active: false
			}
		},
		dydtVal: {
			type: 'Value',
			props: {
				quantity: 'dydt',
				active: false
			}
		},
		lp2: {
			type: 'EqText',
			props: {
				text: "("
			}
		},
		tVal1: {
			type: 'Value',
			props: {
				quantity: 't',
				active: false
			}
		},
		rp2: {
			type: 'EqText',
			props: {
				text: ")"
			}
		},
		animVal: {
			type: 'Value',
			props: {
				quantity: 'animTime',
				active: false
			}
		},
		massPlot: {
			type: 'Plot',
			props: {
				xVar: 's',
				yVar: 'y',
				xVars: ['s','t'],
				yVars: ['y','x'],
				width: 200,
				height: 350,
				pos: {x: 100,y: 400},
				visibility: 1
			},
			children: ['anchor', 'mass', 'spring', 'damper']
		},
		anchor: {
			type: 'Anchor',
			props: {
				xVar: 's',
				yVar: 'x'
			},
			children: []
		},
		mass: {
			type: 'Mass',
			props: {
				xVar: 's',
				yVar: 'y'
			},
			children: []
		},
		spring: {
			type: 'Spring',
			props: {
				xVar1: 's',
				yVar1: 'x',
				xVar2: 's',
				yVar2: 'y'
			},
			children: []
		},
		damper: {
			type: 'Damper',
			props: {
				xVar1: 's',
				yVar1: 'x',
				xVar2: 's',
				yVar2: 'y'
			},
			children: []
		},
		abstraction1: {
			type: "Abstraction",
			props: {
				indVar: "t",
				xVar: "t",
				yVar: "y"
			},
			children: []
		}
	},
	quantities: {
		animTime: {
			value: 0, min: 0, max: 28, symbol: 'dispT', independent: true, abstractions: 10, animation: { playing: false }
		},
		t: { //time
			value: 0,
			min: 0,
			max: 20,
			abstractions: 300,
			independent: true,
			symbol: 't',
			highlighted: false,
			animation: { playing: false },
			color: '#ffa020'
		},
		imx: { value: 0, min: -10, max: 10, abstractions: 0, independent: false, symbol: 'im(x)', highlighted: false },//imaginary component of x
		x: { value: 0, min: -10, max: 40, abstractions: 0, symbol: 'x', prevPoints: [], highlighted: false }, //real component of x
		y: { value: 0, min: -25, max: 20, symbol: 'y', highlighted: false, color:'#ffc'},//position of mass
		dydt: { value: 0, min: -25, max: 20, symbol: "y'", highlighted: false },
		k: { value: 5, min: 0, max: 100, symbol: 'k', abstractions: 10, independent: true, highlighted: false, color:'#88f'},//spring constant
		fs: { value: 100, min: -100, max: 100, symbol: 'F_s', independent: false, highlighted: false },
		dl: { value: 10, min: -10, max: 10, symbol: "displacement", independent: false, highlighted: false },
		m: { value: 1, min: 0, max: 30, symbol: 'm', independent: true, highlighted: false, color:'#e0e0ff' },//mass
		c: { value: 0, min: 0, max: 5, symbol: 'c', independent: true, highlighted: false, color:"#58de58" },
		fext: { value: 10, min: -100, max: 100, symbol: 'F_ext', independent: false, highlighted: false },
		y0: { value: 0, min: -20, max: 20, symbol: 'y_0', independent: true, highlighted: false },//initial mass position
		dy0: { value: 0, min: -20, max: 20, symbol: 'dy0', independent: true, highlighted: false },
		s: { value: 0, min: -6, max: 6, abstractions: 0, symbol: 's', highlighted: false }// lateral position
	}
})
