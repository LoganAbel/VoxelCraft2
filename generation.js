const GenerateChunk = pos => {
	let data = new Uint16Array(16*16*16)

	let set = (p, v) => { return data[p.x + p.y * 16 + p.z * 16 * 16] = v }

	let p = new Vec3(0,0,0)
	for(p.z = 0; p.z < 16; p.z ++)
		for(p.x = 0; p.x < 16; p.x ++) {
			const global_height = 8 + 2 * (Math.sin((p.x+pos.x)/8) + Math.sin((p.z+pos.z)/8))
			const height = Math.floor(
				global_height +
				Math.sin(p.x+pos.x) + Math.sin(p.z+pos.z) 
			)
			// const height = Math.floor(global_height + (p.x == 8 && p.z == 8))
			for(p.y = 0; p.y < 16; p.y ++) {
				if ((p.x == 0 || p.z == 0) && p.y+pos.y <= Math.floor(global_height)+2)
					set(p, Block.Stone)
				else if (p.y+pos.y == height)
					set(p, Block.Grass)
				else if (p.y+pos.y < height)
					set(p, Block.Dirt)
				else
					set(p, Block.Air)
			}
		}

	return data
}

const donut = function*() {
	yield [-1,-1]
	yield [1,-1]
	yield [-1,1]
	yield [1,1]
	yield [-1,0]
	yield [0,-1]
	yield [0,1]
	yield [1,0]
}

const SiblingPoses = [
	new Vec3(-1,-1,-1),
	new Vec3(-1,-1,0),
	new Vec3(-1,-1,1),
	new Vec3(-1,0,-1),
	new Vec3(-1,0,0),
	new Vec3(-1,0,1),
	new Vec3(-1,1,-1),
	new Vec3(-1,1,0),
	new Vec3(-1,1,1),
	new Vec3(0,-1,-1),
	new Vec3(0,-1,0),
	new Vec3(0,-1,1),
	new Vec3(0,0,-1),
	new Vec3(0,0,1),
	new Vec3(0,1,-1),
	new Vec3(0,1,0),
	new Vec3(0,1,1),
	new Vec3(1,-1,-1),
	new Vec3(1,-1,0),
	new Vec3(1,-1,1),
	new Vec3(1,0,-1),
	new Vec3(1,0,0),
	new Vec3(1,0,1),
	new Vec3(1,1,-1),
	new Vec3(1,1,0),
	new Vec3(1,1,1),
]

const SiblingLookup = Object.fromEntries(SiblingPoses.map((v,i)=>[v.data, i]))

const MeshChunk = (settings, pos, data, siblings) => {
	// todo: use chunk class
	// todo: use greedy meshing

	let mesh = []

	let safe_get = p => { 
		if (p.x < 16 && p.y < 16 && p.z < 16 && p.x >= 0 && p.y >= 0 && p.z >= 0)
			return get(data, p)
		return get(
			siblings[SiblingLookup[[
				p.x >= 16 ? 1 : p.x < 0 ? -1 : 0,
				p.y >= 16 ? 1 : p.y < 0 ? -1 : 0,
				p.z >= 16 ? 1 : p.z < 0 ? -1 : 0]]], 
			{x:(p.x+16)%16,y:(p.y+16)%16,z:(p.z+16)%16}
		)
	}
	let get = (data, p) => { return new Block(data[p.x + p.y * 16 + p.z * 16 * 16]) }

	let p = new Vec3(0,0,0)
	for(p.z = 0; p.z < 16; p.z ++)
		for(p.y = 0; p.y < 16; p.y ++)
			for(p.x = 0; p.x < 16; p.x ++) {
				const block = get(data, p)

				;[new Vec3(1,0,0), new Vec3(0,1,0), new Vec3(0,0,1)]
				.forEach(normal => {
					let block2_p = p.add(normal)
					let block2 = safe_get(block2_p)
					if (block.data.is_visible == block2.data.is_visible) return;
					let d1 = normal.zxy
					let d2 = d1.zxy
					const vp = p.add(pos).add(new Vec3(1))
					const poses = [
						vp.sub(d1).sub(d2).data,
						vp.sub(d2).data,
						vp.sub(d1).data,
						vp.data,
					]

					let occluding_blocks = []
					const adj_p = block2.data.is_visible ? p : block2_p
					for(let [s1,s2] of donut()) {
						let dp = d1.scale(s1).add(d2.scale(s2))
						occluding_blocks.push(safe_get(adj_p.add(dp)))
					}

					if (block2.data.is_visible)
						normal = normal.scale(-1)

					const target_block = block2.data.is_visible ? block2 : block					
					mesh.push(...target_block.meshSide(settings, poses, normal, occluding_blocks))
				})
			}

	return mesh
}