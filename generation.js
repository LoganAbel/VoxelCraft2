const {SimplexNoise, alea: Random} = window

const height_simplex1 = new SimplexNoise(Math.random())
const height_simplex2 = new SimplexNoise(Math.random())
const tree_seed = Math.random();
const is_forest_simplex = new SimplexNoise(Math.random())

let trees = {}
const water_height = 7

const GenerateChunk = (chunk, pos) => {
	let set = (p, v) => {
		p = p.sub(pos)
		chunk[p.x + p.y * 16 + p.z * 16 * 16] = v
	}
	let safe_set = (p, v) => {
		p = p.sub(pos)
		if (p.x < 0 || p.y < 0 || p.z < 0 || p.x > 15 || p.y > 15 || p.z > 15) return;
		chunk[p.x + p.y * 16 + p.z * 16 * 16] = v
	}
	let get = (p, v) => {
		p = p.sub(pos)
		return chunk[p.x + p.y * 16 + p.z * 16 * 16]
	}

	let p = new Vec3(0)
	for(p.z = pos.z; p.z < pos.z+16; p.z ++)
		for(p.x = pos.x; p.x < pos.x+16; p.x ++) {
			let height = 0
			for(let i = 0; i < 4; i ++)
				height += height_simplex1.noise2D(p.x/64*2**i, p.z/64*2**i) / 2**i
			height = Math.floor(8 + height * 4)

			for(p.y = pos.y; p.y < height-3; p.y ++)
				set(p, Block.Stone)
			for(; p.y < height; p.y ++)
				set(p, Block.Dirt)
			if (p.y == height) {
				set(p, Block.Grass)
				p.y ++
			}
			for(; p.y <= water_height; p.y ++)
				set(p, Block.Water)

			// if (p.x==pos.x || p.z == pos.z)
			// 	set(p, Block.Stone)
		}

	for(p.z = pos.z-3; p.z < pos.z+19; p.z ++)
		for(p.x = pos.x-3; p.x < pos.x+19; p.x ++) {
			let height = 0
			for(let i = 0; i < 4; i ++)
				height += height_simplex1.noise2D(p.x/64*2**i, p.z/64*2**i) / 2**i
			height = Math.floor(8 + height * 4)
			p.y = height
			generate_tree(p, get, set, safe_set)
		}
}

const generate_tree = (p, get, set, safe_set) => {
	const is_forest = is_forest_simplex.noise2D(p.x/64,p.z/64)
	if (is_forest < -.5) return;

	if (p.y <= water_height) return;
	const r = Random( (p.x << 16) + p.z + tree_seed )()
	const tree_odds = .98
	if (r < tree_odds) return;

	for(let [dx,dz] of donut()) {
		if (trees[[p.x+dx,p.z+dz]])
			return;
	}

	trees[[p.x,p.z]] = true
	const tree_height = (r - tree_odds) / .05 + 3
	for(let i = 0; i < tree_height; i ++) {
		safe_set(p, Block.BirchLog)
		p.y ++
	}

	let dp = new Vec3(-2,-2,-2)
	for(dp.x = -2; dp.x <= 2; dp.x++)
		for(dp.y = -1; dp.y <= 1; dp.y++)
			for(dp.z = -2; dp.z <= 2; dp.z++) {
				if (dp.y == 1 && (Math.abs(dp.x) == 2 || Math.abs(dp.z) == 2)) continue;
				if (get(p.add(dp)) != Block.Air) continue;
				safe_set(p.add(dp), Block.BirchLeaves)
			}
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

	let mesh_opaque = []
	let mesh_transp = []

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
				let block = get(data, p)

				;[new Vec3(1,0,0), new Vec3(0,1,0), new Vec3(0,0,1)]
				.forEach(normal => {
					let block2_p = p.add(normal)
					let block2 = safe_get(block2_p)

					if (!(
						block.data.is_transparent != block2.data.is_transparent
						|| block.data.is_visible != block2.data.is_visible
						|| block.data.full_mesh || block2.data.full_mesh
					)) return;

					let d1 = normal.zxy
					let d2 = d1.zxy
					const vp = p.add(pos).add(new Vec3(1))
					const poses = [
						vp.sub(d1).sub(d2).data,
						vp.sub(d2).data,
						vp.sub(d1).data,
						vp.data,
					]

					let block1_selected = block.data.is_visible && !(block2.data.is_visible && block.data.is_transparent)

					const mesh1side = () => {
						let selected_block = block1_selected ? block : block2

						let occluding_blocks = []
						if (!selected_block.data.is_semitransparent) {
							const adj_p = block1_selected ? block2_p : p
							for(let [s1,s2] of donut()) {
								let dp = d1.scale(s1).add(d2.scale(s2))
								occluding_blocks.push(safe_get(adj_p.add(dp)))
							}
						}

						const new_norm = block1_selected ? normal : normal.scale(-1)

						const target_block = block1_selected ? block : block2
						const face_data = target_block.meshSide(settings, poses, new_norm, occluding_blocks)
						if (!selected_block.data.is_semitransparent)
							mesh_opaque.push(...face_data)
						else 
							mesh_transp.push(...face_data)
					}

					mesh1side()

					let selected_block = block1_selected ? block : block2
					let unselected_block = block1_selected ? block2 : block
					if (normal.y == 1 
						&& unselected_block.data.bounds?.top 
						&& block2.id != block.id) {
						block1_selected = !block1_selected
						mesh1side()
					}
				})
			}

	return {opaque: mesh_opaque, transp: mesh_transp}
}