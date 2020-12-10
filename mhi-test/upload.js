var pxInd,
  stInd = 0;
var dispW, dispH;
var xhReq, dispX;
var rqPrf, rqMsg;
var prvPx, prvSt;

function ldPrv() {
  if (xhReq.status != 200) {
    pxInd = prvPx;
    stInd = prvSt;
  }
}

function svPrv() {
  prvPx = pxInd;
  prvSt = stInd;
}

function byteToStr(v) {
  return String.fromCharCode((v & 0xf) + 97, ((v >> 4) & 0xf) + 97);
}

function wordToStr(v) {
  return byteToStr(v & 0xff) + byteToStr((v >> 8) & 0xff);
}

function u_done() {
  setInn("logTag", "Complete!");
  xhReq.open("POST", rqPrf + "SHOW", true);
  xhReq.send("0"); //1e6 us are one second
  stInd++;
  return 0;
}

function u_load(a) {
  var x = "" + (100 * pxInd) / a.length;
  if (x.length > 5) x = x.substring(0, 5);
  setInn("logTag", "Progress: " + x + "%");
  xhReq.open("POST", rqPrf + "LOAD", false);
  xhReq.send(rqMsg + wordToStr(rqMsg.length) + "LOAD");
  if (pxInd >= a.length) {
    stInd++;
  }
  return 0;
}

function u_data(a) {
  rqMsg = "";
  svPrv();
  while (pxInd < a.length && rqMsg.length < 8000) {
    let v = 0;
    for (var i = 0; i < 16; i += 2) {
      if (pxInd < a.length) v |= a[pxInd] << i;
      pxInd++;
    }
    rqMsg += wordToStr(v);
  }
  return u_load(a);
}

function uploadImage() {
  var c = getElm("canvas");
  var w = (dispW = c.width);
  var h = (dispH = c.height);
  var pictureData = c.getContext("2d").getImageData(0, 0, w, h);
  var a = new Array(w * h);
  var i = 0;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++, i++) {
      a[i] = getVal(pictureData, i << 2);
    }
  }

  dispX = 0;
  pxInd = 0;
  xhReq = new XMLHttpRequest();
  rqPrf = "http://" + getElm("ip_addr").value + "/";
  xhReq.open("POST", rqPrf + "EPD", false);
  xhReq.send();
  test(a);
  return 0;
}

function test(a) {
  while (stInd < 2) {
    ldPrv();
    if (stInd == 0) u_data(a);
    if (stInd == 1) u_done();
  }
}
