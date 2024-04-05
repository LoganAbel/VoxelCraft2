let window = {}

importScripts('block.js', 'math.js', 'simplex-lib.js', 'generation.js', 'texsheet.js')

onmessage = e => {
	// todo: make more efficient?

	const start_t = performance.now()

	let [id, texsheet, chunks] = e.data
	texsheet = new TexSheet(texsheet, 1)
	const settings = {texsheet, light_dir: new Vec3(1,3,2).normalized()}

	let reses = {}
	let transferables = []

	Object.entries(chunks).forEach(([hashed_pos, chunk]) => {
		const res = reses[hashed_pos] = {}

		const pos = new Vec3(...hashed_pos.split(',').map(v=>+v)) // probably should use another method of finding pos
		if (chunk == undefined) {
			chunk = new Uint16Array(16*16*16).fill(Block.Air)
			GenerateChunk(chunk, pos)
			chunk = chunk.buffer
		}
		res.data = chunk
		chunks[hashed_pos] = chunk
		transferables.push(chunk)
	})

	Object.entries(chunks).forEach(([hashed_pos, chunk]) => {
		const res = reses[hashed_pos]

		const pos = new Vec3(...hashed_pos.split(',').map(v=>+v))

		let siblings = SiblingPoses.map(dir => {
			const new_pos = pos.add(dir.scale(16))
			return chunks[new_pos.data]
		})

		if(siblings.some(v => v == undefined)) return;

		siblings = siblings.map(buffer => new Uint16Array(buffer))
		chunk = new Uint16Array(chunk)

		const mesh = MeshChunk(settings, pos, chunk, siblings)
		mesh.transp = new Float32Array(mesh.transp).buffer
		mesh.opaque = new Float32Array(mesh.opaque).buffer
		res.mesh = mesh
		transferables.push(res.mesh.transp, res.mesh.opaque)
	})

	//console.log(Object.keys(chunks).length + " new chunks in " + (performance.now()-start_t) + ' ms')

	postMessage([id, reses], transferables)
}