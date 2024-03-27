class Crosshair {
	static async new() {
		return new Crosshair(
			new Program(await fetch_text('shader2d.vs'), await fetch_text('shaderxor.fs'))
		)
	}
	constructor(program) {
		this.program = program
		let aspect = program.uniform(gl.FLOAT, 'u_aspect')
		Events.onresize.push((x,y) => aspect.set(y/x))
		const vertex_format = [
			[gl.FLOAT, 2]
		]
		const w = .05
		const h = .007
		const vertices = [
			-w, -h,
			 w, -h,
			-w,  h,
			 w,  h,

			-h,  h,
			 h,  h,
			-h,  w,
			 h,  w,

			-h, -w,
			 h, -w,
			-h, -h,
			 h, -h,
		]
		this.vbo = new VertexBuffer(new Float32Array(vertices), vertex_format)
		this.vbo.attach_ebo(QuadIndices(this.vbo.length))
	}

	draw() {
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR)
		// mix(DST, 1-DST, SRC) = (1-SRC) * DST + (1-DST) * SRC
		this.program.use()
		this.vbo.draw()
		gl.disable(gl.BLEND)
	}
}