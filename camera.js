class Camera {
	constructor(znear, zfar, pos, rot) {
		this.z_near = znear
		this.z_far = zfar
		this.pos = pos
		this.rot = rot
	}

	resize(dimx, dimy) {
		this.aspect = dimx / dimy
	}

	render_mat() {
		return Mat4.perspective(Math.PI/2, this.aspect, this.z_near, this.z_far)
		.matmul(Mat4.rotationX(this.rot.x))
		.matmul(Mat4.rotationY(this.rot.y))
		.matmul(Mat4.translation(this.pos.mul(new Vec3(-1))))
	}

	mat() {
		return Mat4.translation(this.pos)
			.matmul(Mat4.rotationY(-this.rot.y))
			.matmul(Mat4.rotationX(-this.rot.x))
	}

	center_ray() {
		const mat = this.mat()
		return new Ray(mat.vecmul(new Vec3(0,0,0), 1), mat.vecmul(new Vec3(0,0,-1), 0))
	}
}