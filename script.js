// Canvas and context
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Drawing state
let isDrawing = false;
let mirrorCount = document.getElementById('mirrorCount').value;
let dotSize = document.getElementById('brushSize').value;
let mirrorCenterX = document.getElementById('centerX').value;
let mirrorCenterY = document.getElementById('centerY').value;
let brushShape = document.getElementById('brushShape').value;
let brushColor = document.getElementById('brushColor').value;
let brushPattern = null;

// Undo/redo stack and index
const undoStack = [];
const redoStack = [];
let undoIndex = -1;

// Update display values
function updateMirrorCountDisplay(value) {
    document.getElementById('mirrorCountDisplay').innerText = value;
}

function updateDotSizeDisplay(value) {
    document.getElementById('brushSizeDisplay').innerText = value;
}

function updateCenterXDisplay(value) {
    document.getElementById('centerXDisplay').innerText = value;
}

function updateCenterYDisplay(value) {
    document.getElementById('centerYDisplay').innerText = value;
}

// Event listeners for controls
document.getElementById('mirrorCount').addEventListener('input', function(e) {
    mirrorCount = e.target.value;
    updateMirrorCountDisplay(mirrorCount);
});

document.getElementById('brushSize').addEventListener('change', function(e) {
    dotSize = e.target.value;
    updateDotSizeDisplay(dotSize);
    drawPreviewDot();
});

const brushSizeSlider = document.getElementById('brushSizeSlider');
brushSizeSlider.addEventListener('input', function(e) {
    dotSize = e.target.value;
    document.getElementById('brushSize').value = dotSize;
    updateDotSizeDisplay(dotSize);
    drawPreviewDot();
});

document.getElementById('centerX').addEventListener('input', function(e) {
    mirrorCenterX = e.target.value;
    updateCenterXDisplay(mirrorCenterX);
});

document.getElementById('centerY').addEventListener('input', function(e) {
    mirrorCenterY = e.target.value;
    updateCenterYDisplay(mirrorCenterY);
});

document.getElementById('brushShape').addEventListener('change', function(e) {
    brushShape = e.target.value;
});

document.getElementById('brushColor').addEventListener('input', function(e) {
    brushColor = e.target.value;
});

document.getElementById('backgroundLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

document.getElementById('imageLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = canvas.width;
            patternCanvas.height = canvas.height;
            const patternCtx = patternCanvas.getContext('2d');
            patternCtx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
            brushPattern = ctx.createPattern(patternCanvas, 'no-repeat');
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

document.getElementById('undoButton').addEventListener('click', undoAction);
document.getElementById('redoButton').addEventListener('click', redoAction);

document.getElementById('saveButton').addEventListener('click', function() {
    const dataURL = canvas.toDataURL('image/png');
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const filename = 'drawing_' + timestamp + '.png';
    downloadImage(dataURL, filename);
});

// Draw function with brush shape logic
function drawDot(x, y) {
    if (!isDrawing) return;

    const size = parseInt(dotSize);
    const angleIncrement = (Math.PI * 2) / mirrorCount;
    ctx.save();
    ctx.translate(mirrorCenterX, mirrorCenterY);

    for (let i = 0; i < mirrorCount; i++) {
        ctx.rotate(angleIncrement);

        if (brushShape === 'circle') {
            ctx.beginPath();
            ctx.arc(x - mirrorCenterX, y - mirrorCenterY, size, 0, Math.PI * 2);
        } else if (brushShape === 'square') {
            ctx.beginPath();
            ctx.rect(x - mirrorCenterX - size/2, y - mirrorCenterY - size/2, size, size);
        } else if (brushShape === 'oval') {
            ctx.beginPath();
            ctx.ellipse(x - mirrorCenterX, y - mirrorCenterY, size, size / 2, 0, 0, Math.PI * 2);
        } else if (brushShape === 'rectangle') {
            ctx.beginPath();
            ctx.rect(x - mirrorCenterX - size, y - mirrorCenterY - size / 2, size * 2, size);
        } else if (brushShape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(x - mirrorCenterX, y - mirrorCenterY - size);
            ctx.lineTo(x - mirrorCenterX + size, y - mirrorCenterY + size);
            ctx.lineTo(x - mirrorCenterX - size, y - mirrorCenterY + size);
            ctx.closePath();
        }

        ctx.fillStyle = brushPattern ? brushPattern : brushColor;
        ctx.fill();
    }

    ctx.restore();
}

// Draw preview dot
function drawPreviewDot() {
    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    const size = parseInt(dotSize);
    const centerX = previewCanvas.width / 2;
    const centerY = previewCanvas.height / 2;

    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.beginPath();
    previewCtx.arc(centerX, centerY, size, 0, Math.PI * 2);
    previewCtx.fill();
}

// Initialize preview
drawPreviewDot();

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    drawDot(e.offsetX, e.offsetY);
    saveState();
    disableUndoRedoButtons(false);
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        drawDot(e.offsetX, e.offsetY);
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

canvas.addEventListener('touchstart', (e) => {
    const touch = getTouchPos(canvas, e);
    isDrawing = true;
    drawDot(touch.x, touch.y);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (isDrawing) {
        const touch = getTouchPos(canvas, e);
        drawDot(touch.x, touch.y);
        e.preventDefault();
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isDrawing = false;
});

document.body.addEventListener('touchstart', (e) => {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchend', (e) => {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Save canvas state
function saveState() {
    const canvasData = canvas.toDataURL();
    undoStack.push(canvasData);
    redoStack = [];
    undoIndex++;
    disableUndoRedoButtons();
}

// Undo action
function undoAction() {
    if (undoIndex > 0) {
        const canvasData = undoStack[--undoIndex];
        const image = new Image();
        image.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
        };
        image.src = canvasData;
        redoStack.push(undoStack.pop());
        disableUndoRedoButtons();
    }
}

// Redo action
function redoAction() {
    if (redoStack.length > 0) {
        const canvasData = redoStack.pop();
        const image = new Image();
        image.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
        };
        image.src = canvasData;
        undoStack.push(canvasData);
        disableUndoRedoButtons();
    }
}

// Enable/disable undo and redo buttons
function disableUndoRedoButtons(enable = true) {
    document.getElementById('undoButton').disabled = !enable || undoIndex === 0;
    document.getElementById('redoButton').disabled = !enable || redoStack.length === 0;
}

// Download image
function downloadImage(dataURL, filename) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Get touch position
function getTouchPos(canvasDom, touchEvent) {
    var rect = canvasDom.getBoundingClientRect();
    return {
        x: touchEvent.touches[0].clientX - rect.left,
        y: touchEvent.touches[0].clientY - rect.top
    };
}

// Responsive canvas resizing
function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    const maxWidth = container.clientWidth;
    const maxHeight = window.innerHeight;
    const aspectRatio = canvas.width / canvas.height;

    let newWidth = maxWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
    }

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
