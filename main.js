let main = async () => {
	Events.Init()

	const fps = new FPSDisplay()
	const crosshair = await Crosshair.new()

	const player = new PlayerController()
	Events.onresize.push((x,y) => player.camera.resize(x,y))

	const chunkmanager = await ChunkManager.new(player.camera)

	document.body.onresize()

	const update = () => {
		Events.Update()
		fps.update()

		player.Update(Events, chunkmanager)

		gl.clearColor(148/255, 196/255, 255/255, 1)
		//gl.clearColor(79/255, 95/255, 118/255, 1)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		chunkmanager.draw(player.camera)
		crosshair.draw()

		requestAnimationFrame(update)
	}

	update()
}

main()