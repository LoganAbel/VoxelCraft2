class TexSheet {
	constructor(tex, tilesize) {
		this.width = tex.width / tilesize
		this.height = tex.height / tilesize
	}

	getUV(id) {
		const u0 = (id % this.width) / this.width
		const v0 = (0 | id / this.width) / this.height
		const u1 = u0 + 1 / this.width
		const v1 = v0 + 1 / this.height
		return [
			[u0, v0],
			[u1, v0],
			[u0, v1],
			[u1, v1]
		]
	}
}