class PlayerController {
	constructor() {
		this.camera = new Camera(.1, 200, new Vec3(8,16,8), {x: 0, y: 0})
		this.start_mine_time = null
		this.place_type = Block.Stone
		this.hitbox = new Box(new Vec3(-.3, -1.6, -.3), new Vec3(.3, .2, .3))
		this.vel_y = 0
		this.in_flymode = false
	}
	Update(Events, chunkmanager) {
		const t = performance.now()

		let move_speed = Events.dt / 1000 * 4.3 * (1 + .5 * Events.isdown.Sprint) //* (1 - .5 * Events.isdown.MoveDown)

		if (Events.ondown.MoveUp) {
			if (t - this.spacetime < 250) {
				this.vel_y = 0
				this.in_flymode = !this.in_flymode
			}
			this.spacetime = performance.now()
		}

		let dy = 0
		if (this.in_flymode) {
			move_speed *= 1.5 * (1 + 2.5 * Events.isdown.Sprint)
			dy = (Events.isdown.MoveUp - Events.isdown.MoveDown) * move_speed
		} else {
			this.vel_y -= 30 * Events.dt / 1000
			this.vel_y = Math.max(-64, this.vel_y)
			this.vel_y *= .9 ** (Events.dt / 1000)
			dy = this.vel_y * Events.dt / 1000
			dy = Math.max(-1, this.vel_y * Events.dt / 1000)
		}

		const trans = Mat4.rotationY(-this.camera.rot.y).vecmul(new Vec3(
			(Events.isdown.MoveRight - Events.isdown.MoveLeft) * move_speed,
			dy,
			(Events.isdown.MoveBackward - Events.isdown.MoveForward) * move_speed
		))

		this.MoveInDir(chunkmanager, new Vec3(trans.x, 0, 0))
		let hity = this.MoveInDir(chunkmanager, new Vec3(0, trans.y, 0))
		this.MoveInDir(chunkmanager, new Vec3(0, 0, trans.z))

		if (hity && trans.y < 0) {
			this.vel_y = 0
			if (Events.isdown.MoveUp) this.vel_y = 9
			this.in_flymode = false
		}

		const rot_speed = Events.dt * .003
		const mouse_sensitivity = .01
		this.camera.rot.x += rot_speed * (Events.isdown.RotUp - Events.isdown.RotDown) - Events.dmouse.y * mouse_sensitivity
		this.camera.rot.y += rot_speed * (Events.isdown.RotRight - Events.isdown.RotLeft) + Events.dmouse.x * mouse_sensitivity

		this.camera.rot.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rot.x))

		// placing

		if (!Events.isdown.Destroy) {
			this.start_mine_time = null
		}
		if (Events.ondown.Destroy || (this.start_mine_time && t - this.start_mine_time > 500)) {
			if (this.start_mine_time == null) {
				this.start_mine_time = t
			}
			const ray = this.camera.center_ray()
			const hit = chunkmanager.intersect(ray, 6)
			if(hit?.p) {
				chunkmanager.setp_update(hit.p, Block.Air)
				chunkmanager.flag_modified(hit.p)
			}
		}
		if (Events.ondown.Build) {
			const ray = this.camera.center_ray()
			const hit = chunkmanager.intersect(ray, 6)
			if(hit?.lastp) {
				const place_hitbox = new Box(hit.lastp, hit.lastp.add(new Vec3(1))).add(this.camera.pos.scale(-1))
				if (!place_hitbox.intersects(this.hitbox)) {
					chunkmanager.setp_update(hit.lastp, this.place_type)
					chunkmanager.flag_modified(hit.lastp)
				}
			}
		}
		if (Events.ondown.Select) {
			const ray = this.camera.center_ray()
			const hit = chunkmanager.intersect(ray, 6)
			if(hit?.block)
				this.place_type = hit.block.id
		}
	}
	MoveInDir(chunkmanager, dir) {
		if (dir.eq(new Vec3(0))) return false;

		this.camera.pos = this.camera.pos.add(dir)

		const dist = new Vec3(1).dot(dir)
		dir = dir.scale(1/dist)

		let hit = false
		for (let p of this.hitbox.interval_slice(dir, +(dist>0),.9))
			if (chunkmanager.getp(this.camera.pos.add(p).floor()).data.is_solid) {
				hit = true
				break
			}

		if (!hit) return false;

		const t = dist > 0 
			? -1e-10 - ((this.camera.pos.dot(dir) + this.hitbox.max.dot(dir)) % 1 + 1) % 1
			: 1e-10 + 1 - ((this.camera.pos.dot(dir) + this.hitbox.min.dot(dir)) % 1 + 1) % 1

		this.camera.pos = this.camera.pos.add(dir.scale(t))

		return true;
	}
}