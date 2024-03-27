importScripts('block.js')
importScripts('math.js')
importScripts('generation.js')
importScripts('texsheet.js')

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
		chunk ??= GenerateChunk(pos).buffer
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
		res.mesh = new Float32Array(mesh).buffer
		transferables.push(res.mesh)
	})

	//console.log(Object.keys(chunks).length + " new chunks in " + (performance.now()-start_t) + ' ms')

	postMessage([id, reses], transferables)
}