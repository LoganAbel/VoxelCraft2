class Events {
	static onresize = [];
	static #key_codes = {
		87: "w", 65: "a", 83: "s", 68: "d", 32: "space", 16: "shift",
		38: "up", 40: "down", 37: "left", 39: "right",
		188: ",", 190: ".", 77:"m", 90: "z", 27: "esc"
	}
	static #mouse_codes = {
		0: "leftButton", 1: "middleButton", 2: "rightButton"
	}
	static key_bindings = {
		"w": "MoveForward", "s": "MoveBackward", 
		"a": "MoveLeft", "d": "MoveRight",
		"space": "MoveUp", "shift": "MoveDown",
		"up": "RotUp", "down": "RotDown", "left": "RotLeft", "right": "RotRight",
		"z": "Sprint",
		"leftButton": "Destroy",
		"rightButton": "Build",
		"middleButton": "Select",
		"m": "Destroy",
		".": "Build",
		",": "Select",
	}
	static ondown = {}
	static isdown = {}
	static #oldisdown = {}
	static #dmouse = {x: 0, y: 0}
	static dmouse = {x: 0, y: 0}
	static get locked () { return !document.pointerLockElement }
	static Init() {
		document.body.onresize = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;

			canvas.style.width = w + "px"
			canvas.style.height = h + "px"
			canvas.width = Math.floor(w * window.devicePixelRatio * 2)
			canvas.height = Math.floor(h * window.devicePixelRatio * 2)

			gl.viewport(0, 0, canvas.width, canvas.height);
			Events.onresize.forEach(f => f(canvas.width, canvas.height))
		}

		document.onkeydown = e => { 
			if (Events.locked) return;
			Events.isdown[Events.key_bindings[Events.#key_codes[e.keyCode]]] = 1 
		}
		document.onkeyup = e => { 
			if (Events.locked) return;
			Events.isdown[Events.key_bindings[Events.#key_codes[e.keyCode]]] = 0
		}
		document.onmousedown = async e => { 
			if (Events.locked) {
				await canvas.requestPointerLock()
			} else {
				Events.isdown[Events.key_bindings[Events.#mouse_codes[e.button]]] = 1 
			}
		}
		document.onmouseup = e => { Events.isdown[Events.key_bindings[Events.#mouse_codes[e.button]]] = 0 }
		document.onmousemove = e => {
			if (Events.locked) return;
			Events.#dmouse.x += e.movementX
			Events.#dmouse.y += e.movementY
		}
	}

	static #old_t;
	static dt
	static Update() {
		Events.dmouse.x = Events.#dmouse.x
		Events.dmouse.y = Events.#dmouse.y
		Events.#dmouse.x = 0
		Events.#dmouse.y = 0

		Events.#old_t ??= performance.now()
		Events.dt = performance.now() - Events.#old_t
		Events.#old_t += Events.dt
		Events.firstkey = {}
		Events.ondown = {}
		if (Events.locked) {
			Object.values(Events.key_bindings).forEach(key => {
				Events.ondown[key] = 0
				Events.isdown[key] = 0
				Events.#oldisdown[key] = 0
			})
		} else {
			Object.values(Events.key_bindings).map(key => {
				Events.ondown[key] = 0
			})

			Object.values(Events.key_bindings).map(key => {
				Events.ondown[key] ||= !Events.#oldisdown[key] && Events.isdown[key]
			})

			Object.values(Events.key_bindings).map(key => {
				Events.#oldisdown[key] = Events.isdown[key]
			})
		}
	}
}