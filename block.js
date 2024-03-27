class Block {
	static Air = 0
	static Grass = 1
	static Dirt = 2
	static Stone = 3
	static Data = {
		[Block.Air]: { 
			is_visible: false, is_solid: false, is_block: false,
		},
		[Block.Grass]: { 
			is_visible: true, is_solid: true, is_block: true,
			tex_orientation: 'vertical',
			tex: {
				all: 1,
				[[0,1,0]]: 0,
				[[0,-1,0]]: 2,
			}
		},
		[Block.Dirt]: { 
			is_visible: true, is_solid: true, is_block: true,
			tex_orientation: 'rotate',
			tex: {all: 2}
		},
		[Block.Stone]: { 
			is_visible: true, is_solid: true, is_block: true,
			tex_orientation: 'vertical',
			tex: {all: 3}
		}
	}

	constructor(id) {
		this.id = id
		this.data = Block.Data[this.id]
	}

	meshSide({texsheet, light_dir}, poses, normal, neighboors) {
		const texid = this.data.tex[normal.data] ?? this.data.tex.all
		const diffuse_light = Math.max(0, normal.dot(light_dir) * .8 + .2)

		let occlusions = [0,0,0,0]
		if (neighboors[4].data?.is_solid) {
			occlusions[0] ++
			occlusions[2] ++
		}
		if (neighboors[7].data?.is_solid) {
			occlusions[1] ++
			occlusions[3] ++
		}
		if (neighboors[5].data?.is_solid) {
			occlusions[0] ++
			occlusions[1] ++
		}
		if (neighboors[6].data?.is_solid) {
			occlusions[2] ++
			occlusions[3] ++
		}
		if (occlusions[0] == 2 || neighboors[0].data?.is_solid)
			occlusions[0]++
		if (occlusions[1] == 2 || neighboors[1].data?.is_solid)
			occlusions[1]++
		if (occlusions[2] == 2 || neighboors[2].data?.is_solid)
			occlusions[2]++
		if (occlusions[3] == 2 || neighboors[3].data?.is_solid)
			occlusions[3]++

		occlusions = occlusions.map(ao =>
			(1 - ao * .25) * (diffuse_light * .5 + .5)
		)

		let uvs = texsheet.getUV(texid)
		if (this.data.tex_orientation == 'vertical') {
			if (normal.y == 0) {
				[uvs[0], uvs[3]] = [uvs[3], uvs[0]]
				if(normal.x == 0) 
					[uvs[1], uvs[2]] = [uvs[2], uvs[1]]
			}
		}

		let indices = occlusions[1] + occlusions[2] > occlusions[0] + occlusions[3]
			? [0,1,2,3] : [2,0,3,1]

		return [
			...poses[indices[0]], 	...uvs[indices[0]], occlusions[indices[0]],
			...poses[indices[1]], 	...uvs[indices[1]], occlusions[indices[1]],
			...poses[indices[2]], 	...uvs[indices[2]], occlusions[indices[2]],
			...poses[indices[3]], 	...uvs[indices[3]], occlusions[indices[3]],
		]
	}
}