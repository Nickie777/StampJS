document.addEventListener('DOMContentLoaded', () => {
    const pdfPath = document.getElementById('pdf-path').value;
    const imagePath = document.getElementById('image-path').value;

    console.log('PDF Path:', pdfPath);
    console.log('Image Path:', imagePath);

    if (pdfPath) {
        loadPDF(pdfPath);
    }

    document.getElementById('overlay-image').addEventListener('click', () => {
        if (imagePath) {
            overlayImage(imagePath);
        }
    });

    // Добавляем обработчик прокрутки
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer.addEventListener('scroll', onScroll);
});

const pdfContainer = document.getElementById('pdf-container');
const checkboxContainer = document.getElementById('checkbox-container');
let pdfDoc = null;
let konvaLayers = [];

function loadPDF(pdfPath) {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    loadingTask.promise.then((pdf) => {
        console.log('PDF loaded');
        pdfDoc = pdf;
        renderAllPages().then(() => createCheckboxes(pdf.numPages));
    }).catch(error => {
        console.error('Error loading PDF:', error);
    });
}

async function renderAllPages() {
    konvaLayers = [];
    pdfContainer.innerHTML = '';

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
    konvaLayers[pageNum - 1] = { stage, layer };
}

function createCheckboxes(numPages) {
    checkboxContainer.innerHTML = '';
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

function overlayImage(imagePath) {
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
    imageObj.src = imagePath;
}

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

function onScroll() {
    const pdfPages = document.querySelectorAll('.pdf-page');
    let currentPage = 1;
    let smallestOffset = Infinity;

    pdfPages.forEach((pageDiv, index) => {
        const rect = pageDiv.getBoundingClientRect();
        const offset = Math.abs(rect.top);

        if (offset < smallestOffset) {
            smallestOffset = offset;
            currentPage = index + 1;
        }
    });

    document.getElementById('page-number').textContent = currentPage;
}
