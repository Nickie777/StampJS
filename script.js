document.getElementById('load-pdf').addEventListener('click', () => {
    document.getElementById('pdf-file-input').click();
});

document.getElementById('load-image').addEventListener('click', () => {
    document.getElementById('image-file-input').click();
});

const pdfFileInput = document.getElementById('pdf-file-input');
const imageFileInput = document.getElementById('image-file-input');
const pdfContainer = document.getElementById('pdf-container');
const checkboxContainer = document.getElementById('checkbox-container');
let pdfDoc = null;
let konvaLayers = []; // To store Konva layers for each page

pdfFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then((pdf) => {
                pdfDoc = pdf;
                renderAllPages().then(() => createCheckboxes(pdf.numPages));
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
});

async function renderAllPages() {
    konvaLayers = []; // Reset layers
    pdfContainer.innerHTML = ''; // Clear previous content

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const pdfPageDiv = document.createElement('div');
        pdfPageDiv.className = 'pdf-page';
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        pdfPageDiv.appendChild(canvas);
        pdfContainer.appendChild(pdfPageDiv);
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;
        setupKonvaStage(pdfPageDiv, canvas, pageNum);
    }
}

function setupKonvaStage(container, canvas, pageNum) {
    const stageContainer = document.createElement('div');
    stageContainer.style.position = 'absolute';
    stageContainer.style.top = '0';
    stageContainer.style.left = '0';
    stageContainer.style.width = '100%';
    stageContainer.style.height = '100%';
    container.appendChild(stageContainer);

    const stage = new Konva.Stage({
        container: stageContainer,
        width: canvas.width,
        height: canvas.height
    });

    stage.content.addEventListener('touchstart', () => {}, { passive: true });
    stage.content.addEventListener('touchmove', () => {}, { passive: true });
    stage.content.addEventListener('wheel', () => {}, { passive: true });

    const layer = new Konva.Layer();
    stage.add(layer);
    konvaLayers[pageNum - 1] = { stage, layer }; // Ensure correct indexing
}

function createCheckboxes(numPages) {
    checkboxContainer.innerHTML = ''; // Clear previous checkboxes
    for (let i = 1; i <= numPages; i++) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = i;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(`Page ${i}`));
        checkboxContainer.appendChild(label);
    }
}

imageFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file.type.startsWith('image/')) {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            const imageObj = new Image();
            imageObj.onload = function () {
                const selectedPages = getSelectedPages();
                selectedPages.forEach(pageNum => {
                    const layer = konvaLayers[pageNum - 1].layer;
                    const image = new Konva.Image({
                        x: 50,
                        y: 50,
                        image: imageObj,
                        draggable: true
                    });
                    layer.add(image);
                    layer.draw();

                    image.on('dblclick', () => {
                        const clone = image.clone({
                            x: image.x() + 20,
                            y: image.y() + 20
                        });
                        layer.add(clone);
                        layer.draw();
                    });

                    image.on('transform', () => {
                        image.setAttrs({
                            width: image.width() * image.scaleX(),
                            height: image.height() * image.scaleY(),
                            scaleX: 1,
                            scaleY: 1
                        });
                    });

                    const tr = new Konva.Transformer();
                    layer.add(tr);
                    tr.nodes([image]);
                    layer.draw();
                });
            };
            imageObj.src = this.result;
        };
        fileReader.readAsDataURL(file);
    }
});

function getSelectedPages() {
    const checkboxes = document.querySelectorAll('#checkbox-container input[type="checkbox"]');
    const selectedPages = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedPages.push(parseInt(checkbox.value, 10));
        }
    });
    return selectedPages;
}
