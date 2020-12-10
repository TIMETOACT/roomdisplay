var srcBox, srcImg;
var curPal;

function getElm(n) {
    return document.getElementById(n);
}

function setInn(n, i) {
    document.getElementById(n).innerHTML = i;
}

function processFiles(files) {
    var file = files[0];
    var reader = new FileReader();
    srcImg = new Image();
    reader.onload = function (e) {
        srcImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drop(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files;
    processFiles(files);
}

function ignoreDrag(e) {
    e.stopPropagation();
    e.preventDefault();
}

window.onload = function () {
    srcBox = getElm('srcBox');
    srcBox.ondragenter = ignoreDrag;
    srcBox.ondragover = ignoreDrag;
    srcBox.ondrop = drop;
    srcImg = 0;
};
