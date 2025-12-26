class ImageSlicer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private selectionBox: HTMLElement;
	private fileInput: HTMLInputElement;
	private sizeSelector: HTMLSelectElement;
	private saveBtn: HTMLButtonElement;
	private openBtn: HTMLButtonElement;
	private canvasContainer: HTMLElement;
	private dropZone: HTMLElement;

	private currentImage: HTMLImageElement | null = null;
	private selectionSize = 512;
	private selectionX = 0;
	private selectionY = 0;
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private scale = 1;

	constructor() {
		this.canvas = document.getElementById('image-canvas') as HTMLCanvasElement;
		this.ctx = this.canvas.getContext('2d')!;
		this.selectionBox = document.getElementById('selection-box') as HTMLElement;
		this.fileInput = document.getElementById('file-input') as HTMLInputElement;
		this.sizeSelector = document.getElementById('size-selector') as HTMLSelectElement;
		this.saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
		this.openBtn = document.getElementById('open-btn') as HTMLButtonElement;
		this.canvasContainer = document.getElementById('canvas-container') as HTMLElement;
		this.dropZone = document.getElementById('drop-zone') as HTMLElement;

		this.initEventListeners();
	}

	private initEventListeners() {
		this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
		this.sizeSelector.addEventListener('change', () => this.handleSizeChange());
		this.saveBtn.addEventListener('click', () => this.saveSelection());
		this.openBtn.addEventListener('click', () => this.fileInput.click());

		this.canvasContainer.addEventListener('click', () => {
			if(!this.currentImage) {
				this.fileInput.click();
			}
		});

		this.canvasContainer.addEventListener('dragover', (e) => {
			e.preventDefault();
			this.canvasContainer.classList.add('drag-over');
		});

		this.canvasContainer.addEventListener('dragleave', () => {
			this.canvasContainer.classList.remove('drag-over');
		});

		this.canvasContainer.addEventListener('drop', (e) => {
			e.preventDefault();
			this.canvasContainer.classList.remove('drag-over');

			const file = e.dataTransfer?.files[0];
			if(file && file.type.startsWith('image/')) {
				this.loadImageFile(file);
			}
		});

		this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
		this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
		this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
		this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

		this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
		this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
		this.canvas.addEventListener('touchend', () => this.handleMouseUp());

		this.selectionBox.addEventListener('mousedown', (e) => this.handleSelectionMouseDown(e));
		this.selectionBox.addEventListener('touchstart', (e) => this.handleSelectionTouchStart(e), { passive: false });
	}

	private handleFileSelect(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if(!file) return;
		this.loadImageFile(file);
	}

	private loadImageFile(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				this.currentImage = img;
				this.dropZone.classList.add('hidden');
				this.canvasContainer.classList.add('has-image');
				this.displayImage();
				this.initializeSelection();
			};
			img.src = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	private displayImage() {
		if(!this.currentImage) return;

		this.canvas.width = this.currentImage.width;
		this.canvas.height = this.currentImage.height;
		this.ctx.drawImage(this.currentImage, 0, 0);

		this.scale = this.canvas.getBoundingClientRect().width / this.canvas.width;
	}

	private initializeSelection() {
		if(!this.currentImage) return;

		this.selectionX = Math.max(0, Math.floor((this.currentImage.width - this.selectionSize) / 2));
		this.selectionY = Math.max(0, Math.floor((this.currentImage.height - this.selectionSize) / 2));

		this.updateSelectionBox();
		this.selectionBox.style.display = 'block';
		this.saveBtn.disabled = false;
	}

	private handleSizeChange() {
		this.selectionSize = parseInt(this.sizeSelector.value);
		if(this.currentImage) {
			this.selectionX = Math.min(this.selectionX, this.currentImage.width - this.selectionSize);
			this.selectionY = Math.min(this.selectionY, this.currentImage.height - this.selectionSize);
			this.selectionX = Math.max(0, this.selectionX);
			this.selectionY = Math.max(0, this.selectionY);
			this.updateSelectionBox();
		}
	}

	private updateSelectionBox() {
		this.selectionBox.style.left = `${this.selectionX * this.scale}px`;
		this.selectionBox.style.top = `${this.selectionY * this.scale}px`;
		this.selectionBox.style.width = `${this.selectionSize * this.scale}px`;
		this.selectionBox.style.height = `${this.selectionSize * this.scale}px`;
	}

	private handleMouseDown(event: MouseEvent) {
		if(this.selectionBox.style.display === 'none') return;

		const rect = this.canvas.getBoundingClientRect();
		const x = (event.clientX - rect.left) / this.scale;
		const y = (event.clientY - rect.top) / this.scale;

		if(
			x >= this.selectionX &&
			x <= this.selectionX + this.selectionSize &&
			y >= this.selectionY &&
			y <= this.selectionY + this.selectionSize
		) {
			this.isDragging = true;
			this.dragStartX = x - this.selectionX;
			this.dragStartY = y - this.selectionY;
		}
	}

	private handleSelectionMouseDown(event: MouseEvent) {
		event.preventDefault();
		this.isDragging = true;
		const rect = this.canvas.getBoundingClientRect();
		this.dragStartX = (event.clientX - rect.left) / this.scale - this.selectionX;
		this.dragStartY = (event.clientY - rect.top) / this.scale - this.selectionY;

		const moveHandler = (e: MouseEvent) => this.handleMouseMove(e);
		const upHandler = () => {
			this.handleMouseUp();
			document.removeEventListener('mousemove', moveHandler);
			document.removeEventListener('mouseup', upHandler);
		};

		document.addEventListener('mousemove', moveHandler);
		document.addEventListener('mouseup', upHandler);
	}

	private handleMouseMove(event: MouseEvent) {
		if(!this.isDragging || !this.currentImage) return;

		const rect = this.canvas.getBoundingClientRect();
		let newX = (event.clientX - rect.left) / this.scale - this.dragStartX;
		let newY = (event.clientY - rect.top) / this.scale - this.dragStartY;

		newX = Math.max(0, Math.min(newX, this.currentImage.width - this.selectionSize));
		newY = Math.max(0, Math.min(newY, this.currentImage.height - this.selectionSize));

		this.selectionX = newX;
		this.selectionY = newY;
		this.updateSelectionBox();
	}

	private handleMouseUp() {
		this.isDragging = false;
	}

	private handleTouchStart(event: TouchEvent) {
		if(this.selectionBox.style.display === 'none') return;

		const touch = event.touches[0];
		const rect = this.canvas.getBoundingClientRect();
		const x = (touch.clientX - rect.left) / this.scale;
		const y = (touch.clientY - rect.top) / this.scale;

		if(
			x >= this.selectionX &&
			x <= this.selectionX + this.selectionSize &&
			y >= this.selectionY &&
			y <= this.selectionY + this.selectionSize
		) {
			event.preventDefault();
			this.isDragging = true;
			this.dragStartX = x - this.selectionX;
			this.dragStartY = y - this.selectionY;
		}
	}

	private handleTouchMove(event: TouchEvent) {
		if(!this.isDragging || !this.currentImage) return;

		event.preventDefault();
		const touch = event.touches[0];
		const rect = this.canvas.getBoundingClientRect();
		let newX = (touch.clientX - rect.left) / this.scale - this.dragStartX;
		let newY = (touch.clientY - rect.top) / this.scale - this.dragStartY;

		newX = Math.max(0, Math.min(newX, this.currentImage.width - this.selectionSize));
		newY = Math.max(0, Math.min(newY, this.currentImage.height - this.selectionSize));

		this.selectionX = newX;
		this.selectionY = newY;
		this.updateSelectionBox();
	}

	private handleSelectionTouchStart(event: TouchEvent) {
		event.preventDefault();
		this.isDragging = true;
		const touch = event.touches[0];
		const rect = this.canvas.getBoundingClientRect();
		this.dragStartX = (touch.clientX - rect.left) / this.scale - this.selectionX;
		this.dragStartY = (touch.clientY - rect.top) / this.scale - this.selectionY;

		const moveHandler = (e: TouchEvent) => this.handleTouchMove(e);
		const upHandler = () => {
			this.handleMouseUp();
			document.removeEventListener('touchmove', moveHandler);
			document.removeEventListener('touchend', upHandler);
		};

		document.addEventListener('touchmove', moveHandler, { passive: false });
		document.addEventListener('touchend', upHandler);
	}

	private async saveSelection() {
		if(!this.currentImage) return;

		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = this.selectionSize;
		tempCanvas.height = this.selectionSize;
		const tempCtx = tempCanvas.getContext('2d')!;

		tempCtx.drawImage(
			this.currentImage,
			this.selectionX,
			this.selectionY,
			this.selectionSize,
			this.selectionSize,
			0,
			0,
			this.selectionSize,
			this.selectionSize
		);

		tempCanvas.toBlob(async (blob) => {
			if(!blob) return;

			if('showSaveFilePicker' in window) {
				try {
					const handle = await (window as any).showSaveFilePicker({
						suggestedName: `cropped-${this.selectionSize}x${this.selectionSize}.png`,
						types: [
							{
								description: 'PNG Image',
								accept: { 'image/png': ['.png'] },
							},
						],
					});

					const writable = await handle.createWritable();
					await writable.write(blob);
					await writable.close();
				} catch(err) {
					if((err as Error).name !== 'AbortError') {
						console.error('Error saving file:', err);
						this.fallbackDownload(blob);
					}
				}
			} else {
				this.fallbackDownload(blob);
			}
		}, 'image/png');
	}

	private fallbackDownload(blob: Blob) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `cropped-${this.selectionSize}x${this.selectionSize}.png`;
		a.click();
		URL.revokeObjectURL(url);
	}
}

new ImageSlicer();
