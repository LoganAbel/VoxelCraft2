const canvas = document.querySelector("canvas")
const gl = canvas.getContext("webgl2")
if (gl === null) throw "[ERR: can't load opengl]"

const fetch_text = async src => fetch(src).then(res=>res.text())
const fetch_image = async src => new Promise(ret => {
    let img = new Image(src)
    img.onload = () => ret(img)
    img.src = src
})

class Program {
	constructor(vs, fs) {
		this.id = gl.createProgram()
		gl.attachShader(this.id, Program.#createShader(vs, gl.VERTEX_SHADER))
		gl.attachShader(this.id, Program.#createShader(fs, gl.FRAGMENT_SHADER))
		gl.linkProgram(this.id)
	}
	uniform (type, name) {
        const location = gl.getUniformLocation(this.id, name)
        if (type === gl.FLOAT_MAT4)
            return {set: v => {
        		this.use()
        		gl.uniformMatrix4fv(location, false, v)
        	}}
        if (type === gl.SAMPLER_2D)
            return {set: v => {
                this.use()
                gl.uniform1i(location, v)
            }}
        if (type === gl.FLOAT)
            return {set: v => {
                this.use()
                gl.uniform1f(location, v)
            }}
	}
	use () {
		gl.useProgram(this.id)
	}
	static #createShader (source, type) {
		const shader = gl.createShader(type)
		gl.shaderSource(shader, source)
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
			throw new Error(gl.getShaderInfoLog(shader));
		return shader
	}
}

class VertexBuffer {
	static #sizes = {
		[gl.FLOAT]: 4
	}

	constructor(data, attrs) {
		this.uses_ebo = false
		this.size = data.byteLength
		this.vao = gl.createVertexArray();
		this.vbo = gl.createBuffer()
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

        this.vertex_size = attrs.reduce((a, [type, num]) => a + VertexBuffer.#sizes[type] * num, 0)

		let offset = 0
		attrs.forEach(([type, num], i) => {
			let attr_size = VertexBuffer.#sizes[type]
			gl.vertexAttribPointer(i, num, type, false, this.vertex_size, offset)
			gl.enableVertexAttribArray(i)
			offset += attr_size * num
		})

		this.length = this.size / this.vertex_size
	}

	attach_ebo(data) {
		this.uses_ebo = true
		this.ebo = gl.createBuffer()
		this.ebo_length = data.length

		gl.bindVertexArray(this.vao)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW)
	}

    draw() {
    	gl.bindVertexArray(this.vao)

    	if (this.uses_ebo)
    		gl.drawElements(gl.TRIANGLES, this.ebo_length, gl.UNSIGNED_INT, 0);
    	else
	        gl.drawArrays(gl.TRIANGLES, 0, this.length);    
	}
}

const QuadIndices = length => {
	let indices = new Uint32Array(length/4*6)
	for(let i = 0; i < length/4; i ++) {
		indices[i*6+0] = i * 4
		indices[i*6+1] = i * 4 + 1
		indices[i*6+2] = i * 4 + 2
		indices[i*6+3] = i * 4 + 1
		indices[i*6+4] = i * 4 + 2
		indices[i*6+5] = i * 4 + 3
	}
	return indices
}

class Texture {
	constructor(image, type) {
		this.id = gl.createTexture();
		this.width = image.naturalWidth
		this.height = image.naturalHeight

		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.texImage2D(gl.TEXTURE_2D, 0, type, type, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	bind (i) {
		gl.activeTexture(gl.TEXTURE0 + i);
		gl.bindTexture(gl.TEXTURE_2D, this.id);
	}
}