const superagent = require("superagent");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const Canvas = require("@napi-rs/canvas");
const shuffleSeed = require("shuffle-seed");
const {
  writeFile,
  writeFileSync,
  readdir,
  mkdir,
  mkdirSync,
  existsSync,
} = require("fs");
const PIECE_SIZE_WIDTH = 108;
const PIECE_SIZE_HEIGHT = 151;
const memo = {};

const allChar =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const getData = async (cid) => {
  const key = getK(cid);
  const dmytime = new Date().getTime().toString();
  const response = await fetch(
    `https://viewer.ynjn.jp/sws/apis/bibGetCntntInfo.php?cid=${cid}&dmytime=${dmytime}&k=${key}`,
    {
      credentials: "omit",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
      referrer: "https://ynjn.jp/",
      method: "GET",
      mode: "cors",
    }
  );
  const allKey = await response.json();
  const ctbl = toStringArray(dechiffrer(cid, key, allKey.items[0].ctbl));
  const ptbl = toStringArray(dechiffrer(cid, key, allKey.items[0].ptbl));
  const stbl = toNumberArray(dechiffrer(cid, key, allKey.items[0].stbl));
  const ttbl = toNumberArray(dechiffrer(cid, key, allKey.items[0].ttbl));
  return {
    ptbl: ptbl,
    ctbl: ctbl,
    ttbl: ttbl,
    stbl: stbl,
    key: key,
  };
};

const toStringArray = (array) => {
  if (!Array.isArray(array)) throw TypeError();
  if (
    array.some(function (value) {
      return "string" != typeof value;
    })
  )
    throw TypeError();
  return array;
};

const toNumberArray = (array) => {
  if (!Array.isArray(array)) throw TypeError();
  if (
    array.some(function (value) {
      return "number" != typeof value;
    })
  )
    throw TypeError();
  return array;
};

const getK = (cid) => {
  var n = getRandomString(16),
    i = Array(Math.ceil(16 / cid.length) + 1).join(cid),
    r = i.substr(0, 16),
    e = i.substr(-16, 16),
    s = 0,
    h = 0,
    u = 0;
  return n
    .split("")
    .map(function (t, i) {
      return (
        (s ^= n.charCodeAt(i)),
        (h ^= r.charCodeAt(i)),
        (u ^= e.charCodeAt(i)),
        t +
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[
            (s + h + u) & 63
          ]
      );
    })
    .join("");
};

const getRandomString = (taille, characters) => {
  for (
    var n =
        characters ||
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      r = n.length,
      e = "",
      s = 0;
    s < taille;
    s++
  )
    e += n.charAt(Math.floor(Math.random() * r));
  return e;
};

const dechiffrer = (cid, key, chaine) => {
  let char = 0;
  let ident = `${cid}:${key}`;
  for (let i = 0; i < ident.length; i++) char += ident.charCodeAt(i) << i % 16;
  0 == (char &= 2147483647) && (char = 305419896);
  let res = "";
  let u = char;
  for (let i = 0; i < chaine.length; i++) {
    u = (u >>> 1) ^ (1210056708 & -(1 & u));
    let charCode = ((chaine.charCodeAt(i) - 32 + u) % 94) + 32;
    res += String.fromCharCode(charCode);
  }
  try {
    return JSON.parse(res);
  } catch (e) {}
  return null;
};

const getAllImageLink = async (cid) => {
  const result = await superagent.get(
    `https://viewer.ynjn.jp/books/${cid}/2/content`
  );
  const DOM = new JSDOM(result.body.ttx);
  const chapitre = Array.from(
    DOM.window.document.querySelectorAll(`t-img`)
  ).map(
    (e) =>
      `https://viewer.ynjn.jp/books/${cid}/2/img/${
        e.attributes.getNamedItem("src").textContent
      }`
  );
  return chapitre;
};

function e(cbtl, ptbl) {
  let jt = null;
  let St = null;
  let n = Et(cbtl),
    r = Et(ptbl);
  n && r && n.ndx === r.ndx && n.ndy === r.ndy && ((jt = n), (St = r));
}

const Et = (t, T, j) => {
  var i,
    n = [],
    r = [],
    e = [];
  for (i = 0; i < T; i++) n.push(Dt[t.charCodeAt(i)]);
  for (i = 0; i < j; i++) r.push(Dt[t.charCodeAt(T + i)]);
  for (i = 0; i < T * j; i++) e.push(Dt[t.charCodeAt(T + j + i)]);
  return {
    t: n,
    n: r,
    p: e,
  };
};

const dt = (V) => {
  return null !== V.xt;
};

const Mt = (t, V) => {
  var i = 2 * V.T * V.Tt,
    n = 2 * V.j * V.Tt;
  return (
    t.width >= 64 + i &&
    t.height >= 64 + n &&
    t.width * t.height >= (320 + i) * (320 + n)
  );
};

const bt = (t, V) => {
  if (!dt(V)) return null;
  if (!Mt(t, V))
    return [
      {
        xsrc: 0,
        ysrc: 0,
        width: t.width,
        height: t.height,
        xdest: 0,
        ydest: 0,
      },
    ];
  for (
    var i = t.width - 2 * V.T * V.Tt,
      n = t.height - 2 * V.j * V.Tt,
      r = Math.floor((i + V.T - 1) / V.T),
      e = i - (V.T - 1) * r,
      s = Math.floor((n + V.j - 1) / V.j),
      h = n - (V.j - 1) * s,
      u = [],
      o = 0;
    o < V.T * V.j;
    ++o
  ) {
    var a = o % V.T,
      f = Math.floor(o / V.T),
      c = V.Tt + a * (r + 2 * V.Tt) + (V.Pt[f] < a ? e - r : 0),
      l = V.Tt + f * (s + 2 * V.Tt) + (V.Ct[a] < f ? h - s : 0),
      v = V.xt[o] % V.T,
      d = Math.floor(V.xt[o] / V.T),
      g = v * r + (V.At[d] < v ? e - r : 0),
      b = d * s + (V.kt[v] < d ? h - s : 0),
      p = V.Pt[f] === a ? e : r,
      m = V.Ct[a] === f ? h : s;
    0 < i &&
      0 < n &&
      u.push({
        xsrc: c,
        ysrc: l,
        width: p,
        height: m,
        xdest: g,
        ydest: b,
      });
  }
  return u;
};

const gt = (t, V) => {
  return Mt(t, V)
    ? {
        width: t.width - 2 * V.T * V.Tt,
        height: t.height - 2 * V.j * V.Tt,
      }
    : t;
};

const Dt = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
  46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1,
];

const main = async () => {
  const data = await getData("196276");
  //const images = await getAllImageLink("196276");
  const result = await superagent.get(
    `https://viewer.ynjn.jp/books/196276/2/content`
  );
  const DOM = new JSDOM(result.body.ttx);
  const chapitre = Array.from(
    DOM.window.document.querySelectorAll(`t-img`)
  ).map((e) => e.attributes.getNamedItem("src").textContent);
  const imageUnscramble = await unscramble(data, "196276", chapitre[0]);
  if (!existsSync("./output")) mkdirSync("output");
  writeFileSync("./output/test.png", imageUnscramble);
  //   // writeFileSync("./test.jpeg",await unscramble("https://viewer.ynjn.jp/books/196276/2/img/images/fs7bbBIx.jpg"))
};

const unscramble = async (data, cid, img) => {
  const url = `https://viewer.ynjn.jp/books/${cid}/2/img/${img}?q=1`;
  const image = await Canvas.loadImage(url);
  const size = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  const test = demelanger(size, img, data);
  console.log(test);
  const final = new Canvas.Canvas(test[0].width, test[0].height * 3);
  const context = final.getContext("2d");
  test.forEach((e, i) => {
    e.transfers[0].coords.forEach((el) => {
      context.drawImage(
        image,
        el.xsrc,
        el.ysrc,
        el.width,
        el.height,
        el.xdest,
        el.ydest + e.height * i,
        el.width,
        el.height
      );
    });
  });
  return final.toBuffer("image/png");
};

const getValues = (h, s) => {
  const values = h.match(/^=([0-9]+)-([0-9]+)([-+])([0-9]+)-([-_0-9A-Za-z]+)$/);
  const values2 = s.match(
    /^=([0-9]+)-([0-9]+)([-+])([0-9]+)-([-_0-9A-Za-z]+)$/
  );
  const nbPiecesRow = parseInt(values[1], 10);
  const Tt = parseInt(values[4], 10);
  const j = parseInt(values[2], 10);
  const e = nbPiecesRow + j + nbPiecesRow * j;
  var At, kt, Pt, Ct, xt;
  if (values[5].length === e && values2[5].length === e) {
    var p = Et(values[5], nbPiecesRow, j),
      m = Et(values2[5], nbPiecesRow, j);
    (At = p.n), (kt = p.t), (Pt = m.n), (Ct = m.t), (xt = []);
    for (var u = 0; u < nbPiecesRow * j; u++) xt.push(p.p[m.p[u]]);
  }
  return {
    xt: xt,
    T: nbPiecesRow,
    Tt: Tt,
    j: j,
    At: At,
    kt: kt,
    Pt: Pt,
    Ct: Ct,
  };
};

const vt = (url, data) => {
  const index = [0, 0];
  if (url) {
    const lastCharIndexUrl = url.lastIndexOf("/") + 1;
    const idImgLength = url.length - lastCharIndexUrl;
    for (let i = 0; i < idImgLength; i++)
      index[i % 2] += url.charCodeAt(i + lastCharIndexUrl);
    (index[0] %= 8), (index[1] %= 8);
  }
  const s = data.ptbl[index[0]];
  const h = data.ctbl[index[1]];
  return getValues(h, s);
};

const demelanger = (t, image, data) => {
  var i = t,
    n = Gs(i, image, data);
  function r(t) {
    var r = Us(t, un),
      e = [];
    console.log(r);
    s.forEach(function (t) {
      var i = Rectangle(t.xdest, t.ydest, t.width, t.height),
        n = intersect(r, i);
      null !== n &&
        e.push({
          xsrc: t.xsrc + (n.left - t.xdest),
          ysrc: t.ysrc + (n.top - t.ydest),
          width: n.width,
          height: n.height,
          xdest: n.left - r.left,
          ydest: n.top - r.top,
        });
    });
    var i = {
      index: 0,
      coords: e,
    };
    h.push({
      width: r.width,
      height: r.height,
      transfers: [i],
    });
  }
  const un = {
    width: n.width,
    height: n.height,
  };
  for (var s = n.transfers[0].coords, h = [], e = 0; e < 3; e++) r(e);
  return h;
};

const Gs = (t, i, data) => {
  return getImageDescrambleCoords(i, t.width, t.height, data);
};

const getImageDescrambleCoords = (t, i, n, data) => {
  var r = vt(t, data);
  if (!r || !dt(r)) return null;
  var e = gt(
    {
      width: i,
      height: n,
    },
    r
  );
  return {
    width: e.width,
    height: e.height,
    transfers: [
      {
        index: 0,
        coords: bt(
          {
            width: i,
            height: n,
          },
          r
        ),
      },
    ],
  };
};

const Us = (t, un) => {
  var i = un.height,
    n = Math.ceil((i + 4 * (3 - 1)) / 8),
    r = Math.ceil((t * n) / 3) * 8,
    e = Math.ceil(((t + 1) * n) / 3) * 8,
    s = n * 8,
    h = (r * i) / s,
    u = (e * i) / s,
    o = e - r,
    a = 1 === 3 ? 0 : Math.round(h + ((u - h - o) * t) / (3 - 1));
  return Rectangle(0, a, un.width, o);
};

const Rectangle = (t, i, n, r) => {
  void 0 === t && (t = 0),
    void 0 === i && (i = 0),
    void 0 === n && (n = 0),
    void 0 === r && (r = 0);
  let left = t,
    top = i,
    width = n,
    height = r;
  return {
    left: left,
    top: top,
    width: width,
    height: height,
  };
};

intersect = function (t, i) {
  var n = t.left,
    r = t.left + t.width,
    e = t.top,
    s = t.top + t.height,
    h = i.left,
    u = i.left + i.width,
    o = i.top,
    a = i.top + i.height;
  if (n < u && h < r && e < a && o < s) {
    var f = Math.max(n, h),
      c = Math.max(e, o);
    return Rectangle(f, c, Math.min(r, u) - f, Math.min(s, a) - c);
  }
  return null;
};

main();

const unscramble2 = async (imageSrc, iteration) => {
  const image = await Canvas.loadImage(imageSrc);
  const height = image.height;
  const width = image.width;
  const final = new Canvas.Canvas(width, height);
  const context = final.getContext("2d");
  const pieces = [];
  for (let y = 0; y < height; y += PIECE_SIZE_HEIGHT) {
    for (let x = 0; x < width; x += PIECE_SIZE_WIDTH) {
      const w = Math.min(PIECE_SIZE_WIDTH, width - x);
      const h = Math.min(PIECE_SIZE_HEIGHT, height - y);
      pieces.push({
        x: x,
        y: y,
        w: w,
        h: h,
      });
    }
  }
  const groups = pieces.reduce((accumulator, current) => {
    if (accumulator[(current.w << 16) | current.h]) {
      accumulator[(current.w << 16) | current.h].push(current);
    } else {
      accumulator[(current.w << 16) | current.h] = [];
      accumulator[(current.w << 16) | current.h].push(current);
    }
    return accumulator;
  }, {});
  for (const [_, group] of Object.entries(groups)) {
    const size = group.length;
    if (!memo[size]) {
      const indices = [];
      for (i = 0; i < size; i++) {
        indices[i] = i;
      }
      memo[size] = shuffleSeed.unshuffle(indices, key);
    }
    let permutation = memo[size];
    permutation.forEach((i, original) => {
      const src = group[i];
      const dst = group[original];
      context.drawImage(
        image,
        src.x,
        src.y,
        src.w,
        src.h,
        dst.x,
        dst.y,
        dst.w,
        dst.h
      );
    });
  }
  return final.toBuffer("image/jpeg");
};
