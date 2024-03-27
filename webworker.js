class WebWorker {
	constructor(src) {
		this.worker = new Worker(src)
		this.callbacks = {}
		this.next_id = 0
		this.worker.onmessage = e => {
			let [id, ...data] = e.data
			let callback = this.callbacks[id]
			callback(data)
			delete this.callbacks[id]
		}
	}

	run(...args) {
		const callback = args.pop()
		const data = args.shift()
		let id = this.next_id++
		this.callbacks[id] = callback
		this.worker.postMessage([id, ...data], ...args)
	}
}