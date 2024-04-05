class Block {
	static Air = 0
	static Grass = 1
	static Dirt = 2
	static Stone = 3
	static Water = 4
	static BirchLog = 5
	static BirchLeaves = 6
	static Data = {
		[Block.Air]: { 
			is_visible: false, is_solid: false, 
			is_transparent: true, is_semitransparent: true, casts_shadow: false,
		},
		[Block.Grass]: { 
			is_visible: true, is_solid: true, 
			is_transparent: false, is_semitransparent: false, casts_shadow: true,
			tex_orientation: 'vertical',
			tex: {
				all: 1,
				[[0,1,0]]: 0,
				[[0,-1,0]]: 2,
			}
		},
		[Block.Dirt]: { 
			is_visible: true, is_solid: true, 
			is_transparent: false, is_semitransparent: false, casts_shadow: true,
			tex_orientation: 'rotate',
			tex: {all: 2}
		},
		[Block.Stone]: { 
			is_visible: true, is_solid: true,
			is_transparent: false, is_semitransparent: false, casts_shadow: true,
			tex_orientation: 'vertical',
			tex: {all: 3}
		},
		[Block.Water]: {
			is_visible: true, is_solid: false, is_liquid: true,
			is_transparent: true, is_semitransparent: true, casts_shadow: false,
			tex_orientation: 'rotate',
			tex: {all: 4},
			bounds: {
				top: -1/8
			}
		},
		[Block.BirchLog]: {
			is_visible: true, is_solid: true, 
			is_transparent: false, is_semitransparent: false, casts_shadow: true,
			tex_orientation: 'vertical',
			tex: {
				all: 5,
				[[0,1,0]]: 6,
				[[0,-1,0]]: 6
			}
		},
		[Block.BirchLeaves]: {
			is_visible: true, is_solid: true, 
			is_transparent: true, is_semitransparent: false, casts_shadow: false,
			full_mesh: true,
			tex_orientation: 'vertical',
			tex: {
				all: 7
			}
		}
	}

	constructor(id) {
		this.id = id
		this.data = Block.Data[this.id]
	}

	meshSide({texsheet, light_dir}, poses, normal, neighboors) {
		const texid = this.data.tex[normal.data] ?? this.data.tex.all

		let light, light2;
		if (this.data.is_semitransparent) {
			light = [1,1,1,1]
		} else {
			light = [0,0,0,0]

			if (neighboors[4].data.casts_shadow) {
				light[0] ++
				light[2] ++
			}
			if (neighboors[7].data.casts_shadow) {
				light[1] ++
				light[3] ++
			}
			if (neighboors[5].data.casts_shadow) {
				light[0] ++
				light[1] ++
			}
			if (neighboors[6].data.casts_shadow) {
				light[2] ++
				light[3] ++
			}
			if (light[0] == 2 || neighboors[0].data.casts_shadow)
				light[0]++
			if (light[1] == 2 || neighboors[1].data.casts_shadow)
				light[1]++
			if (light[2] == 2 || neighboors[2].data.casts_shadow)
				light[2]++
			if (light[3] == 2 || neighboors[3].data.casts_shadow)
				light[3]++

			if (this.data.full_mesh) {
				const diffuse_light2 = Math.max(0, -normal.dot(light_dir) * .8 + .2)
				light2 = light.map(ao =>
					(1 - ao * .25) * (diffuse_light2 * .5 + .5)
				)
			}

			const diffuse_light = Math.max(0, normal.dot(light_dir) * .8 + .2)
			light = light.map(ao =>
				(1 - ao * .25) * (diffuse_light * .5 + .5)
			)
		}

		let uvs = texsheet.getUV(texid)
		if (this.data.tex_orientation == 'vertical') {
			if (normal.y == 0) {
				[uvs[0], uvs[3]] = [uvs[3], uvs[0]]
				if(normal.x == 0) 
					[uvs[1], uvs[2]] = [uvs[2], uvs[1]]
			}
		}

		let indices = light[1] + light[2] > light[0] + light[3]
			? [0,1,2,3] : [2,0,3,1]

		if (normal.dot(new Vec3(1)) < 0) {
			[indices[1], indices[2]] = [indices[2], indices[1]]
		}

		if(this.data.bounds?.top) {
			poses = poses.map(pos => {
				pos[1] += this.data.bounds.top
				return pos
			})
		}

		if (this.data.full_mesh) {
			return [
				...poses[indices[0]], 	...uvs[indices[0]], light[indices[0]],
				...poses[indices[1]], 	...uvs[indices[1]], light[indices[1]],
				...poses[indices[2]], 	...uvs[indices[2]], light[indices[2]],
				...poses[indices[3]], 	...uvs[indices[3]], light[indices[3]],

				...poses[indices[0]], 	...uvs[indices[0]], light2[indices[0]],
				...poses[indices[2]], 	...uvs[indices[2]], light2[indices[2]],
				...poses[indices[1]], 	...uvs[indices[1]], light2[indices[1]],
				...poses[indices[3]], 	...uvs[indices[3]], light2[indices[3]]
			]
		}

		return [
			...poses[indices[0]], 	...uvs[indices[0]], light[indices[0]],
			...poses[indices[1]], 	...uvs[indices[1]], light[indices[1]],
			...poses[indices[2]], 	...uvs[indices[2]], light[indices[2]],
			...poses[indices[3]], 	...uvs[indices[3]], light[indices[3]],
		]
	}
}