class PlayerController {
	static epsilon = 1e-10
	constructor() {
		this.pos = new Vec3(8,16,8)
		this.camera = new Camera(.1, 200, this.pos, {x: 0, y: 0})
		this.start_mine_time = null
		this.place_type = Block.BirchLog
		this.hitbox = new Box(new Vec3(-.3, -1.6, -.3), new Vec3(.3, .2, .3))
		this.vel_y = 0
		this.mode = 'Walk'
	}
	Update(Events, chunkmanager) {
		const t = performance.now()

		if (Events.ondown.MoveUp) {
			if (t - this.spacetime < 250) {
				this.vel_y = 0
				if (this.mode == 'Fly')
					this.mode = 'Walk'
				else
					this.mode = 'Fly'
			}
			this.spacetime = performance.now()
		}

		let move_speed = Events.dt / 1000 * 4.3

		const in_blocks = [...this.hitbox.interval(.999)].map(p => chunkmanager.getp(this.pos.add(p).floor()))
		if (in_blocks.some(block => block.data.is_liquid)) {
			if (this.mode != 'Fly')
				this.mode = 'Swim'
		}
		else if (this.mode == 'Swim') {
			this.mode = 'Walk'
		}

		let dy = 0
		if (this.mode == 'Fly') {
			move_speed *= 1.5 * (1 + 2.5 * Events.isdown.Sprint)
			dy = (Events.isdown.MoveUp - Events.isdown.MoveDown) * move_speed
		} else if (this.mode == 'Swim') {
			move_speed *= .5 * (1 + .5 * Events.isdown.Sprint)

			this.vel_y -= 5 * Events.dt / 1000
			if (Events.isdown.MoveUp)
				this.vel_y += 15 * Events.dt / 1000
			if (Events.isdown.MoveDown)
				this.vel_y = - 256 * Events.dt / 1000

			this.vel_y *= .1 ** (Events.dt / 1000)
			dy = Math.max(-1, this.vel_y * Events.dt / 1000)
		}
		else {
			move_speed *= (1 + .5 * Events.isdown.Sprint) * (1 - .5 * Events.isdown.MoveDown)
			this.vel_y -= 30 * Events.dt / 1000
			this.vel_y *= .9 ** (Events.dt / 1000)
			dy = Math.max(-1, this.vel_y * Events.dt / 1000)
		}

		const trans = Mat4.rotationY(-this.camera.rot.y).vecmul(new Vec3(
			(Events.isdown.MoveRight - Events.isdown.MoveLeft) * move_speed,
			dy,
			(Events.isdown.MoveBackward - Events.isdown.MoveForward) * move_speed
		))

		let hity = this.MoveInDir(chunkmanager, new Vec3(0, trans.y, 0))

		let oldpos = this.pos.copy()
		this.MoveInDir(chunkmanager, new Vec3(trans.x, 0, 0))
		if (Events.isdown.MoveDown && hity && this.mode == 'Walk') {
			let hity2 = this.MoveInDir(chunkmanager, new Vec3(0, trans.y, 0))
			if (!hity2) this.pos = oldpos
		}

		oldpos = this.pos.copy()
		this.MoveInDir(chunkmanager, new Vec3(0, 0, trans.z))
		if (Events.isdown.MoveDown && hity && this.flymode == 'Walk') {
			let hity2 = this.MoveInDir(chunkmanager, new Vec3(0, trans.y, 0))
			if (!hity2) this.pos = oldpos
		}

		if (hity && trans.y < 0 && this.mode != 'Swim') {
			this.vel_y = 0
			if (Events.isdown.MoveUp) this.vel_y = 9
			if (this.mode == 'Fly')
				this.mode = 'Walk'
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
				const place_hitbox = new Box(hit.lastp, hit.lastp.add(new Vec3(1))).add(this.pos.scale(-1))
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

		this.camera.pos = this.pos.copy()
		if (Events.isdown.MoveDown)
			this.camera.pos.y -= 1/8
	}
	MoveInDir(chunkmanager, dir) {
		if (dir.eq(new Vec3(0))) return false;

		this.pos = this.pos.add(dir)

		if (!this.isHitinDir(chunkmanager, dir)) return false;

		const dist = new Vec3(1).dot(dir)
		dir = dir.scale(1/dist)

		const t = dist > 0 
			? -PlayerController.epsilon - ((this.pos.dot(dir) + this.hitbox.max.dot(dir)) % 1 + 1) % 1
			: PlayerController.epsilon + 1 - ((this.pos.dot(dir) + this.hitbox.min.dot(dir)) % 1 + 1) % 1

		this.pos = this.pos.add(dir.scale(t))

		return true;
	}
	isHitinDir(chunkmanager, dir) {
		const dist = new Vec3(1).dot(dir)
		dir = dir.scale(1/dist)

		for (let p of this.hitbox.interval_slice(dir, +(dist>0),.999))
			if (chunkmanager.getp(this.pos.add(p).floor()).data.is_solid)
				return true;
		return false;
	}
}