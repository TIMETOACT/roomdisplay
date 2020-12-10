function procImg() {
    curPal = [[0, 0, 0], [255, 255, 255], [127, 0, 0]];
    var canvas = getElm('canvas');
    sW = srcImg.width;
    sH = srcImg.height;
    source = getElm('source');
    source.width = sW;
    source.height = sH;
    source.getContext('2d').drawImage(srcImg, 0, 0, sW, sH);
    dX = 0;
    dY = 0;
    dW = 640;
    dH = 384;
    canvas.width = dW;
    canvas.height = dH;
    var index = 0;
    var pSrc = source.getContext('2d').getImageData(0, 0, sW, sH);
    var pDst = canvas.getContext('2d').getImageData(0, 0, dW, dH);
    for (var j = 0; j < dH; j++) {
        var y = dY + j;
        if ((y < 0) || (y >= sH)) {
            for (var i = 0; i < dW; i++, index += 4) setVal(pDst, index, (i + j) % 2 == 0 ? 1 : 0);
            continue;
        }
        for (var i = 0; i < dW; i++) {
            var x = dX + i;
            if ((x < 0) || (x >= sW)) {
                setVal(pDst, index, (i + j) % 2 == 0 ? 1 : 0);
                index += 4;
                continue;
            }
            var pos = (y * sW + x) * 4;
            setVal(pDst, index, getNear(pSrc.data[pos], pSrc.data[pos + 1], pSrc.data[pos + 2]));
            index += 4;
        }
    }

    canvas.getContext('2d').putImageData(pDst, 0, 0);
    uploadImage();
}
