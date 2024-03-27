class ChunkManager {
	static init_chunks = new WebWorker('initializechunks.js')

	static async new(camera) {
		const chunkmanager = new ChunkManager({
			vs: await fetch_text('shader.vs'),
			fs: await fetch_text('shader.fs'),
			tex: await fetch_image('texsheet2.png')
		})

		await new Promise((response, reject) => {
			chunkmanager._update(camera, response)
		})

		return chunkmanager
	}

	constructor({vs, fs, tex}) {
		this.render_dist = 7
		this.program = new Program(vs, fs)
		this.tex = new Texture(tex, gl.RGB)
		this.texsheet = new TexSheet(this.tex, 8)
		this.camera_uniform = this.program.uniform(gl.FLOAT_MAT4, 'u_mat')
		this.program.uniform(gl.SAMPLER_2D, 'u_texsheet').set(0)

		this.chunks = {}
		this.modified_chunks = {}
		this.stored_chunk_data = {}
		this.oldcenterpos = undefined
		this.updating = false
		this.update_waiting = false
	}

	update(camera) {
		// todo: allow updates to interupt pending updates

		if (this.update_waiting) return;
		const center_pos = camera.pos.scale(1/16).floor().scale(16)
		if(this.oldcenterpos && center_pos.eq(this.oldcenterpos)) return;

		const update = () => {
			if (this.updating) {
				this.update_waiting = true
				return;
			}

			this.updating = true

			this._update(camera, () => {
				this.updating = false
				if (this.update_waiting) {
					this.update_waiting = false
					update()
				}
			})
		}

		update()
	}

	_update(camera, callback) {
		const center_pos = camera.pos.scale(1/16).floor().scale(16)
		if(this.oldcenterpos && center_pos.eq(this.oldcenterpos)) return;

		this.oldcenterpos = center_pos
		let start = center_pos.sub(new Vec3(this.render_dist*16))
		let end = center_pos.add(new Vec3(this.render_dist*16))

		let oldchunks = this.chunks
		let discarded = {...oldchunks}
		this.chunks = {}
		let to_mesh = {}
		let transferables = []

		for(let pos of Vec3.interval(end, start, new Vec3(16))) {
			if (pos.sub(camera.pos).add(new Vec3(8)).length() > this.render_dist * 16) continue

			if (oldchunks[pos.data]?.mesh) {
				this.chunks[pos.data] = oldchunks[pos.data]
				delete discarded[pos.data]
				continue;
			}

			[new Vec3(0,0,0), ...SiblingPoses].forEach(dir => {
				const new_pos = pos.add(dir.scale(16))
				if (to_mesh[new_pos.data] !== undefined) return;

				if (this.chunks[new_pos.data]?.data) {
					to_mesh[new_pos.data] = this.chunks[new_pos.data].data.buffer
				}
				else if (this.stored_chunk_data[new_pos.data]) {
					to_mesh[new_pos.data] = this.stored_chunk_data[new_pos.data].buffer
					delete this.stored_chunk_data[new_pos.data]
				}
				else if (oldchunks[new_pos.data]?.data) {
					to_mesh[new_pos.data] = oldchunks[new_pos.data].data.buffer 
					delete discarded[new_pos.data]
				} else to_mesh[new_pos.data] = null

				if (to_mesh[new_pos.data] !== null)
					transferables.push(to_mesh[new_pos.data])
			})
		}

		Object.entries(discarded).forEach(([hashed_pos, chunk]) => {
			if (this.modified_chunks[hashed_pos])
				this.stored_chunk_data[hashed_pos] = chunk.data
		})

		ChunkManager.init_chunks.run([this.texsheet, to_mesh], transferables, ([data]) => {
			Object.entries(data).forEach(([hashed_pos, chunk]) => {
				chunk.data = new Uint16Array(chunk.data)
				if (this.chunks[hashed_pos]?.mesh) {
					this.chunks[hashed_pos].data = chunk.data
					return;
				}
				let chunk_obj = new Chunk({data: chunk.data})
				if (chunk.mesh)
					chunk_obj.mesh_from_data(new Float32Array(chunk.mesh))
				this.chunks[hashed_pos] = chunk_obj
			})
			callback()
		})
	}

	draw(camera) {
		this.update(camera)
		this.camera_uniform.set(camera.render_mat().data)
		this.program.use()
		this.tex.bind(0)
		gl.enable(gl.DEPTH_TEST);
		Object.values(this.chunks).forEach(chunk => 
			chunk.mesh != undefined && chunk.mesh !== true && chunk.mesh.draw()
		)
		gl.disable(gl.DEPTH_TEST);
	}

	intersect(ray, dist) {
		let lastp = null;
		for(let [p, ts] of ray.dda(dist)) {
			const block = this.getp(p)
			if (block.data.is_block)
				return {p, block, lastp, t: Math.min(ts.x, ts.y, ts.z)}
			lastp = p.copy()
		}
	}

	getp(p) {
		const loc = p.scale(1/16).floor().scale(16)
		const chunk = this.chunks[loc.data]
		if (chunk?.mesh == undefined) return new Block(Block.Air)
		// returning undefined somtimes?
		return chunk.get(p.sub(loc))
	}

	setp_update(p, v) {
		const loc = p.scale(1/16).floor().scale(16)
		const chunk = this.chunks[loc.data]
		if (chunk?.mesh == undefined) return null
		let chunkp = p.sub(loc)
		chunk.set(chunkp, v)
		let locs = [loc]
		if(chunkp.x == 0)
			locs.push(loc.add(new Vec3(-16,0,0)))
		if(chunkp.y == 0)
			locs.push(loc.add(new Vec3(0,-16,0)))
		if(chunkp.z == 0)
			locs.push(loc.add(new Vec3(0,0,-16)))
		if(chunkp.x == 15)
			locs.push(loc.add(new Vec3(16,0,0)))
		if(chunkp.y == 15)
			locs.push(loc.add(new Vec3(0,16,0)))
		if(chunkp.z == 15)
			locs.push(loc.add(new Vec3(0,0,16)))
		this.regen_chunks(locs)
	}

	flag_modified(p) {
		const loc = p.scale(1/16).floor().scale(16)
		this.modified_chunks[loc.data] = true
	}

	regen_chunks(locs) {
		const settings = {texsheet: this.texsheet, light_dir: new Vec3(1,3,2).normalized()}
		locs.forEach(loc => {
			let siblings = SiblingPoses.map(dir => {
				const new_pos = loc.add(dir.scale(16))
				return this.chunks[new_pos.data].data
			})

			this.chunks[loc.data].mesh_from_data(new Float32Array(MeshChunk(settings, loc, this.chunks[loc.data].data, siblings)))
		})
	}
}