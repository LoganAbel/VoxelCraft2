class FPSDisplay {
	constructor() {
		this.prevt
		this.frame = 0
	}

	update() {
		this.frame ++
		if (this.frame == 10) {
			const t = performance.now()
			const dt = (t - this.prevt) / this.frame

			document.getElementById('fps').innerHTML = Math.round(1000 / dt) + " fps"

			this.prevt = t
			this.frame = 0
		}
	}
}