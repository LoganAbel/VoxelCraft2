class Mat4 {
	constructor(...data) {
		this.data = data
	}

	get(x,y) { return this.data[x*4+y] }

	matmul(that) {
		let new_data = []
		for(let x = 0; x < 4; x ++)
			for(let y = 0; y < 4; y++) {
				let sum = 0
				for(let i = 0; i < 4; i ++)
					sum += this.get(i,y) * that.get(x,i)
				new_data.push(sum)
			}
		return new Mat4(...new_data)
	}

	vecmul(that, w=1) {
		let new_data = []
		for(let y = 0; y < 3; y ++) {
			let sum = 0
			for(let i = 0; i < 3; i ++)
				sum += this.get(i, y) * that.get(i)
			sum += this.get(3, y) * w
			new_data.push(sum)
		}
		return new Vec3(...new_data)
	}

	static perspective(fovy, aspect, znear, zfar) {
		const zspan = znear - zfar
		const f = 1.0 / Math.tan(fovy/2)
		return new Mat4(
			f/aspect, 0, 0, 0,
			0, f, 0, 0,
			0, 0, (zfar + znear) / zspan, -1,
			0, 0, 2 * zfar * znear / zspan, 0
		)		
	}

	static rotationX(rotx) {
		const c = Math.cos(rotx)
		const s = Math.sin(rotx)
		return new Mat4(
			1, 	0, 0,  0,
			0, 	c, -s, 0,
			0, 	s, c,  0,
			0, 	0, 0,  1
		)
	}

	static rotationY(rotx) {
		const c = Math.cos(rotx)
		const s = Math.sin(rotx)
		return new Mat4(
			c, 0, -s, 0,
			0, 1, 0,  0,
			s, 0, c,  0,
			0, 0, 0,  1
		)
	}

	static translation(pos) {
		return new Mat4(
			1, 	0, 	0, 	0,
			0, 	1, 	0, 	0,
			0, 	0, 	1, 	0,
			pos.x, pos.y, pos.z, 1
		)
	}
}

class Vec3 {
	constructor(x,y,z) {
		this.x = x
		this.y = y ?? x
		this.z = z ?? x
	}

	get(i) { return i == 0 ? this.x : i == 1 ? this.y : this.z }

	copy() {
		return new Vec3(this.x, this.y, this.z)
	}

	add(that) {
		return new Vec3(
			this.x + that.x,
			this.y + that.y,
			this.z + that.z
		)
	}

	sub(that) {
		return new Vec3(
			this.x - that.x,
			this.y - that.y,
			this.z - that.z
		)
	}

	mul(that) {
		return new Vec3(
			this.x * that.x,
			this.y * that.y,
			this.z * that.z
		)
	}

	div(that) {
		return new Vec3(
			this.x / that.x,
			this.y / that.y,
			this.z / that.z
		)
	}

	scale(t) {
		return new Vec3(
			this.x * t,
			this.y * t,
			this.z * t
		)
	}

	floor() {
		return new Vec3(
			Math.floor(this.x),
			Math.floor(this.y),
			Math.floor(this.z)
		)
	}

	sign() {
		return new Vec3(
			this.x == 0 ? 0 : this.x < 0 ? -1 : 1,
			this.y == 0 ? 0 : this.y < 0 ? -1 : 1,
			this.z == 0 ? 0 : this.z < 0 ? -1 : 1,
		)
	}

	abs() {
		return new Vec3(
			Math.abs(this.x),
			Math.abs(this.y),
			Math.abs(this.z)
		)
	}

	dot(that) { return this.x * that.x + this.y * that.y + this.z * that.z }
	eq(that) { return this.x == that.x && this.y == that.y && this.z == that.z }

	length() { return Math.sqrt(this.dot(this)) }
	normalized() { return this.scale(1/this.length()) }

	get zxy() { return new Vec3(this.z, this.x, this.y) }
	get data() { return [this.x, this.y, this.z] }

	static *interval(start, end, dist) {
		// compare start and end to determine dir
		dist = dist.mul(end.sub(start).sign())
		let pos = new Vec3(0);
		for(pos.x = start.x; (pos.x <= end.x) == (start.x < end.x); pos.x += dist.x) 
			for(pos.y = start.y; (pos.y <= end.y) == (start.y < end.y); pos.y += dist.y)
				for(pos.z = start.z; (pos.z <= end.z) == (start.z < end.z); pos.z += dist.z)
					yield pos
	}

	static mix(a, b, t) {
		return new Vec3(
			a.x + (b.x - a.x) * t.x,
			a.y + (b.y - a.y) * t.y,
			a.z + (b.z - a.z) * t.z
		)
	}
}

class Ray {
	constructor(pos, dir) {
		this.pos = pos
		this.dir = dir
	}

	*dda (dist) {
		const start = this.pos.floor()
		const end = this.pos.add(this.dir.scale(dist)).floor()
		const dir = this.dir.sign()

		const ts = start.add(dir.scale(.5).add(new Vec3(.5))).sub(this.pos).div(this.dir)
		if (this.dir.x == 0) ts.x = Infinity
		if (this.dir.y == 0) ts.y = Infinity
		if (this.dir.z == 0) ts.z = Infinity
		const dts = dir.div(this.dir)

		let curr = start;
		while (!curr.eq(end)) {
			if (ts.x < ts.y) {
				if (ts.x < ts.z) {
					ts.x += dts.x
					curr.x += dir.x
				} else {
					ts.z += dts.z
					curr.z += dir.z
				}
			} else {
				if (ts.y < ts.z) {
					ts.y += dts.y
					curr.y += dir.y
				} else {
					ts.z += dts.z
					curr.z += dir.z
				}
			}

			yield [curr, ts]
		}
	}
}

class Box {
	constructor(min, max) {
		this.min = min
		this.max = max
	}
	*interval_slice(dir, slice, interval) {
		const pos = Vec3.mix(this.min, this.max, new Vec3(slice)).mul(dir)
		const d1 = dir.zxy
		const d2 = d1.zxy

		for(let i of Box.#interval1D(this.min.dot(d1), this.max.dot(d1), interval))
			for(let j of Box.#interval1D(this.min.dot(d2), this.max.dot(d2), interval))
				yield pos.add(d1.scale(i)).add(d2.scale(j))
	}

	static * #interval1D (start, end, interval) {
		for(let i = start; i < end; i += interval)
			yield i
		yield end
	}

	* interval (interval) {
		for(let x of Box.#interval1D(this.min.x, this.max.x, interval))
			for(let y of Box.#interval1D(this.min.y, this.max.y, interval))
				for(let z of Box.#interval1D(this.min.z, this.max.z, interval))
					yield new Vec3(x,y,z)
	}

	intersects(that) {
		return this.min.x < that.max.x
			&& this.min.y < that.max.y
			&& this.min.z < that.max.z
			&& that.min.x < this.max.x
			&& that.min.y < this.max.y
			&& that.min.z < this.max.z
	}

	add(vec) {
		return new Box(this.min.add(vec), this.max.add(vec))
	}
}