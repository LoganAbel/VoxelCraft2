class Chunk {
	static vertex_format = [
		[gl.FLOAT, 3],
		[gl.FLOAT, 2],
		[gl.FLOAT, 1]
	]

	constructor({data, mesh}) {
		this.data = data
		this.mesh = mesh
	}

	mesh_from_data(mesh) {
		if (mesh.length == 0) {
			this.mesh = true;
			return;
		}
		this.mesh = new VertexBuffer(mesh, Chunk.vertex_format)
		this.mesh.attach_ebo(QuadIndices(this.mesh.length))
	}

	safe_get(siblings, p) { 
		if (p.x < 0 || p.y < 0 || p.z < 0) 
			return new Block(Block.Air)
		if (p.x > 15)
			return siblings[[1,0,0]].get(new Vec3(0, p.y, p.z))
		if (p.y > 15)
			return siblings[[0,1,0]].get(new Vec3(p.x, 0, p.z))
		if (p.z > 15)
			return siblings[[0,0,1]].get(new Vec3(p.x, p.y, 0))
		return this.get(p)
	}
	get(p) { return new Block(this.data[p.x + p.y * 16 + p.z * 16 * 16])}
	set(p, v) {	return this.data[p.x + p.y * 16 + p.z * 16 * 16] = v }

	* forEachBlock() {
		let p = new Vec3(0,0,0)
		for(p.z = 0; p.z < 16; p.z ++)
			for(p.y = 0; p.y < 16; p.y ++)
				for(p.x = 0; p.x < 16; p.x ++)
					yield p
	}
}