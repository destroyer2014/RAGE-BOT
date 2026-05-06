// ═══════════════════════════════════════════
//       RAGE-BOT — src/commands/nsfw.js
//              v2.6.0
// ═══════════════════════════════════════════

import axios from "axios";

// ── Links hardcodeados (siempre disponibles) ─
const PACKS = {
  pack: [
    "https://telegra.ph/file/957fe4031132ef90b66ec.jpg",
    "https://telegra.ph/file/c4b85bd53030cb648382f.jpg",
    "https://telegra.ph/file/df56f8a76145df9c923ad.jpg",
    "https://telegra.ph/file/d5d1c2c710c4b5ee8bc6c.jpg",
    "https://telegra.ph/file/d0c0cd47e87535373ab68.jpg",
    "https://telegra.ph/file/651a5a9dc96c97c8ef8fc.jpg",
    "https://telegra.ph/file/f857ae461ceab18c38de2.jpg",
    "https://telegra.ph/file/5d2a2aeff5e6fbd229eff.jpg",
    "https://telegra.ph/file/b93573531f898ea875dd0.jpg",
    "https://telegra.ph/file/c798b3959f84d345b0f25.jpg",
    "https://telegra.ph/file/de820647f8cabce533557.jpg",
    "https://telegra.ph/file/e105097d5fadf3e522eb5.jpg",
    "https://telegra.ph/file/8592e352a9ee6c7244737.jpg",
    "https://telegra.ph/file/bb9c7d879b7dc1d86a2ce.jpg",
    "https://telegra.ph/file/83f108601e6105446ad1f.jpg",
    "https://telegra.ph/file/2a6bff14e53ed2533ad25.jpg",
    "https://telegra.ph/file/e37d74aeccc5bdfd6be3e.jpg",
    "https://telegra.ph/file/ca984650af06b951e961d.jpg",
    "https://telegra.ph/file/ebb3ac7f7498dd09f6afc.jpg",
    "https://telegra.ph/file/6192305a24ffb8fa30942.jpg",
    "https://telegra.ph/file/ee67c17d0043b98dc757e.jpg",
    "https://telegra.ph/file/6ae756b686cd2b5950721.jpg",
    "https://telegra.ph/file/b1e1da38d897d117c2aa9.jpg",
    "https://telegra.ph/file/6b759437dc8b863c2fa19.jpg",
    "https://telegra.ph/file/960d8c268aecb5eb117f0.jpg",
    "https://telegra.ph/file/d0dd518bdd147cb10b0b5.jpg",
    "https://telegra.ph/file/31f2d59b5cd68ec5acb21.jpg",
    "https://telegra.ph/file/14ab9bd02f24e0f1a1a03.jpg",
    "https://telegra.ph/file/e02bf6bc9227f7f8b7e2a.jpg",
    "https://telegra.ph/file/ab55fca1d6b602b1a69df.jpg",
    "https://telegra.ph/file/42105cac3666b37da3d1c.jpg",
  ],
  pack2: [
    "https://telegra.ph/file/c0da7289bee2d97048feb.jpg",
    "https://telegra.ph/file/b8564166f9cac4d843db3.jpg",
    "https://telegra.ph/file/fdefd621a17712be15e0e.jpg",
    "https://telegra.ph/file/6e1a6dcf1c91bf62d3945.jpg",
    "https://telegra.ph/file/0224c1ecf6b676dda3ac0.jpg",
    "https://telegra.ph/file/b71b8f04772f1b30355f1.jpg",
    "https://telegra.ph/file/6561840400444d2d27d0c.jpg",
    "https://telegra.ph/file/37e445df144e1dfcdb744.jpg",
    "https://telegra.ph/file/155b6ac6757bdd9cd05f9.jpg",
    "https://telegra.ph/file/2255a8a013540c2820a2b.jpg",
    "https://telegra.ph/file/450e901ac153765f095c5.jpg",
    "https://telegra.ph/file/f18e421a70810015be505.jpg",
    "https://telegra.ph/file/d3d190691ec399431434e.jpg",
    "https://telegra.ph/file/1fd2b897a1dbc3fdc2a70.jpg",
    "https://telegra.ph/file/607d54a909035bca7444f.jpg",
    "https://telegra.ph/file/818ba7c0ae82876b190b6.jpg",
    "https://telegra.ph/file/0f2bb426951b4a8fe1e5a.jpg",
    "https://telegra.ph/file/7e895b5b933226a07558a.jpg",
    "https://telegra.ph/file/f9d9f0da337512a1b1882.jpg",
    "https://telegra.ph/file/09ff5bfce02f1f78e3861.jpg",
    "https://telegra.ph/file/4ad840d401ab1f90444df.jpg",
    "https://telegra.ph/file/7b4bdcad3dde870355c94.jpg",
    "https://telegra.ph/file/f69a5beaca50fc52a4a71.jpg",
    "https://telegra.ph/file/411d7cdee24669e167adb.jpg",
    "https://telegra.ph/file/36a63288e27e88e2f8e10.jpg",
    "https://telegra.ph/file/1ac7657a5e7b354cd9991.jpg",
    "https://telegra.ph/file/14161eab0c1d919dc3218.jpg",
    "https://telegra.ph/file/810411b9128fe11dd639a.jpg",
    "https://telegra.ph/file/5fe7e98533754b007e7a1.jpg",
  ],
  pack3: [
    "https://telegra.ph/file/bf303b19b9834f90e9617.jpg",
    "https://telegra.ph/file/36ef2b807251dfccd17c2.jpg",
    "https://telegra.ph/file/bcc34403d16de829ea5d2.jpg",
    "https://telegra.ph/file/5c6b7615662fb53a39e53.jpg",
    "https://telegra.ph/file/1a8183eff48671ea265c2.jpg",
    "https://telegra.ph/file/f9745dcd22f67cbc62e08.jpg",
    "https://telegra.ph/file/02219f503317b0596e101.jpg",
    "https://telegra.ph/file/470c8ec30400a73d03207.jpg",
    "https://telegra.ph/file/c94fa8ed20f2c0cf16786.jpg",
    "https://telegra.ph/file/1b02a1ca6a39e741faec7.jpg",
    "https://telegra.ph/file/eea58bf7043fd697cdb43.jpg",
    "https://telegra.ph/file/ee3db7facdfe73c8df05a.jpg",
    "https://telegra.ph/file/d45b4e4af4f2139507f8c.jpg",
    "https://telegra.ph/file/d176e7fc8720f98f6b182.jpg",
    "https://telegra.ph/file/ce1e072829d1fa5d99f5f.jpg",
    "https://telegra.ph/file/a947933701be6d579c958.jpg",
    "https://telegra.ph/file/9027e5a464ec88e8ab5c1.jpg",
    "https://telegra.ph/file/049a8c611a838ea2f6daa.jpg",
    "https://telegra.ph/file/37b35fbc7e2ee73482ee1.jpg",
    "https://telegra.ph/file/9bcfade24ae85cd417f06.jpg",
    "https://telegra.ph/file/ac0c711585f4300c54355.jpg",
  ],
  videoxxx: [
    "https://telegra.ph/file/4a270d9945ac46f42d95c.mp4",
    "https://telegra.ph/file/958c11e84d271e783ea3f.mp4",
    "https://telegra.ph/file/f753759342337c4012b3f.mp4",
    "https://telegra.ph/file/379cee56c908dd536dd33.mp4",
    "https://telegra.ph/file/411d8f59a5cefc2a1d227.mp4",
    "https://telegra.ph/file/ee2cf1b359d6eef50d7b7.mp4",
    "https://telegra.ph/file/1e316b25c787f94a0f8fd.mp4",
    "https://telegra.ph/file/c229d33edce798cde0ca4.mp4",
    "https://telegra.ph/file/b44223e72dd7e80e415f2.mp4",
    "https://telegra.ph/file/61486d45a8a3ea95a7c86.mp4",
    "https://telegra.ph/file/76ba0dc2a07f491756377.mp4",
    "https://telegra.ph/file/831bb88f562bef3f1a15d.mp4",
    "https://telegra.ph/file/598857924f3a29ffd37ae.mp4",
    "https://telegra.ph/file/528caef6ea950ec45aeef.mp4",
  ],
  videoxxx2: ["https://l.top4top.io/m_22572kvnt0.mp4", "https://a.top4top.io/m_22741bntt0.mp4", "https://g.top4top.io/m_2274ss8270.mp4", "https://h.top4top.io/m_22746h8370.mp4", "https://c.top4top.io/m_2274k1olx1.mp4", "https://k.top4top.io/m_2274iu8ph1.mp4", "https://c.top4top.io/m_2274813w23.mp4", "https://g.top4top.io/m_2274qzr5b5.mp4", "https://k.top4top.io/m_2274znr525.mp4", "https://j.top4top.io/m_22744mccx0.mp4", "https://g.top4top.io/m_2274dkhny3.mp4", "https://i.top4top.io/m_2257a87ov0.mp4", "https://k.top4top.io/m_2257xoco60.mp4", "https://i.top4top.io/m_2257uqopw1.mp4", "https://b.top4top.io/m_2257p8fdg0.mp4", "https://c.top4top.io/m_2257ju33j0.mp4", "https://a.top4top.io/m_2257showp0.mp4", "https://b.top4top.io/m_22578syiy0.mp4", "https://a.top4top.io/m_22576ni620.mp4", "https://f.top4top.io/m_2257f9mcv1.mp4", "https://e.top4top.io/m_2257efy1t0.mp4", "https://b.top4top.io/m_2257kc2960.mp4", "https://b.top4top.io/m_2257oe6hv0.mp4", "https://h.top4top.io/m_2257zsfo91.mp4", "https://b.top4top.io/m_2257pugx00.mp4", "https://i.top4top.io/m_225756xso0.mp4", "https://h.top4top.io/m_22573rdw80.mp4", "https://f.top4top.io/m_2235sxi5y1.mp4", "https://f.top4top.io/m_2257ofv9s0.mp4", "https://e.top4top.io/m_2257scyvl1.mp4", "https://e.top4top.io/m_2257di15t0.mp4", "https://d.top4top.io/m_225754y5s0.mp4", "https://j.top4top.io/m_22573jxk20.mp4", "https://d.top4top.io/m_2257puxyo0.mp4", "https://e.top4top.io/m_2257bb1an0.mp4", "https://a.top4top.io/m_2257utyrp0.mp4", "https://b.top4top.io/m_22571xiss0.mp4", "https://a.top4top.io/m_2257tgfkz0.mp4", "https://a.top4top.io/m_2263r7okf0.mp4", "https://g.top4top.io/m_2263l67d60.mp4", "https://c.top4top.io/m_2263l4udc0.mp4", "https://c.top4top.io/m_2263ap0rg0.mp4", "https://a.top4top.io/m_2263lhkvu0.mp4", "https://l.top4top.io/m_2263hwu9e0.mp4", "https://g.top4top.io/m_22632ofax0.mp4", "https://e.top4top.io/m_22636mlov3.mp4", "https://l.top4top.io/m_22633xw4r0.mp4", "https://f.top4top.io/m_2263chaub0.mp4", "https://f.top4top.io/m_2263pljyx0.mp4", "https://h.top4top.io/m_2263u512n0.mp4", "https://k.top4top.io/m_22633kkj80.mp4", "https://e.top4top.io/m_226380tpe0.mp4", "https://g.top4top.io/m_2263bmdi20.mp4", "https://j.top4top.io/m_2263ry6570.mp4", "https://i.top4top.io/m_2263hkobr0.mp4"],
  gay: ["https://g.top4top.io/m_2257kulna0.mp4", "https://k.top4top.io/m_22748dfb90.mp4", "https://i.top4top.io/m_2274688ut3.mp4", "https://e.top4top.io/m_2274g8pb05.mp4", "https://k.top4top.io/m_2274lmhea5.mp4", "https://e.top4top.io/m_2274h6rw62.mp4", "https://g.top4top.io/m_2274mouou0.mp4", "https://l.top4top.io/m_22740lsb50.mp4", "https://h.top4top.io/m_2274wpa5s4.mp4", "https://d.top4top.io/m_2274feoh61.mp4", "https://a.top4top.io/m_2274h40n40.mp4", "https://b.top4top.io/m_2274twfxf0.mp4", "https://e.top4top.io/m_2274jjjnz6.mp4", "https://g.top4top.io/m_2274ibf4k8.mp4", "https://i.top4top.io/m_22740m5ov0.mp4", "https://j.top4top.io/m_2274qjlbt1.mp4", "https://k.top4top.io/m_2274jkgqf4.mp4", "https://f.top4top.io/m_2274cskme7.mp4", "https://e.top4top.io/m_2274zh7nx7.mp4", "https://b.top4top.io/m_2274lwduw0.mp4", "https://k.top4top.io/m_2274x95hi4.mp4", "https://j.top4top.io/m_2274smzui0.mp4", "https://b.top4top.io/m_2257l6p450.mp4", "https://h.top4top.io/m_2257pvfm60.mp4", "https://l.top4top.io/m_2257dwqiz4.mp4", "https://l.top4top.io/m_22570gq4r0.mp4", "https://e.top4top.io/m_22575tzit0.mp4", "https://j.top4top.io/m_2257pf8mh0.mp4", "https://b.top4top.io/m_22573zdwj3.mp4", "https://h.top4top.io/m_22572j8n84.mp4", "https://f.top4top.io/m_2257hturm2.mp4", "https://c.top4top.io/m_2257ler770.mp4", "https://l.top4top.io/m_2257p6e4y3.mp4", "https://d.top4top.io/m_2257j8tk80.mp4", "https://k.top4top.io/m_2257sam501.mp4", "https://a.top4top.io/m_2258fe4qh0.mp4", "https://g.top4top.io/m_2258jd95g0.mp4", "https://b.top4top.io/m_2258o58vk3.mp4", "https://f.top4top.io/m_2258ovrol3.mp4", "https://l.top4top.io/m_2258hiid23.mp4", "https://l.top4top.io/m_2258wcrfr4.mp4", "https://i.top4top.io/m_2258xvx9e3.mp4", "https://d.top4top.io/m_2258bhb2y3.mp4", "https://d.top4top.io/m_2258rmcgc2.mp4", "https://l.top4top.io/m_22586l94p5.mp4", "https://b.top4top.io/m_22581acoi3.mp4", "https://j.top4top.io/m_2258ktw1f2.mp4", "https://h.top4top.io/m_2258ltxke2.mp4", "https://f.top4top.io/m_2258gt7351.mp4", "https://k.top4top.io/m_2258w87zn5.mp4"],
  bisexual: ["https://k.top4top.io/m_2263d17nb0.mp4", "https://l.top4top.io/m_2263rs1410.mp4", "https://g.top4top.io/m_2263qat3w0.mp4", "https://e.top4top.io/m_2263reat85.mp4", "https://d.top4top.io/m_2263bdzwa0.mp4", "https://k.top4top.io/m_22636swzc0.mp4", "https://l.top4top.io/m_2263h1jc03.mp4", "https://k.top4top.io/m_2263mh8u04.mp4", "https://l.top4top.io/m_2263wonsx1.mp4", "https://f.top4top.io/m_22631d63o0.mp4", "https://e.top4top.io/m_22630da3s0.mp4", "https://j.top4top.io/m_2263e0tg90.mp4", "https://e.top4top.io/m_226338lts5.mp4", "https://e.top4top.io/m_226307zk80.mp4", "https://h.top4top.io/m_2263q60k60.mp4", "https://a.top4top.io/m_2263xdx270.mp4"],
  vidpornovid: ["https://l.top4top.io/m_2235dduf01.mp4", "https://a.top4top.io/m_2235268m61.mp4", "https://b.top4top.io/m_2235k7hze2.mp4", "https://c.top4top.io/m_2235lxohb3.mp4", "https://d.top4top.io/m_2235jwd2e4.mp4", "https://e.top4top.io/m_2235h5b1z5.mp4", "https://f.top4top.io/m_2235gihcu6.mp4", "https://l.top4top.io/m_2235dp7m41.mp4", "https://a.top4top.io/m_2235zxue82.mp4", "https://b.top4top.io/m_2235m3bhf3.mp4", "https://c.top4top.io/m_2235vjyio4.mp4", "https://d.top4top.io/m_2235m9tdu5.mp4", "https://e.top4top.io/m_2235y2kon6.mp4", "https://f.top4top.io/m_2235rhid57.mp4", "https://g.top4top.io/m_2235zgsqf8.mp4", "https://i.top4top.io/m_2235drxxg10.mp4", "https://d.top4top.io/m_2235fzynm1.mp4", "https://e.top4top.io/m_22354t3zk2.mp4", "https://f.top4top.io/m_2235gyxgh3.mp4", "https://g.top4top.io/m_22357cmft4.mp4", "https://i.top4top.io/m_2235mcizm6.mp4", "https://j.top4top.io/m_2235gwsn17.mp4", "https://k.top4top.io/m_2235gzzjc8.mp4", "https://a.top4top.io/m_2235l9y1310.mp4", "https://l.top4top.io/m_2235r1opz1.mp4", "https://a.top4top.io/m_22358cuuu2.mp4", "https://b.top4top.io/m_22350c9br3.mp4", "https://c.top4top.io/m_22355p2js4.mp4", "https://d.top4top.io/m_2235lv7415.mp4", "https://e.top4top.io/m_2235q8z3f6.mp4", "https://b.top4top.io/m_22358oas31.mp4", "https://c.top4top.io/m_2235xg7o62.mp4", "https://d.top4top.io/m_2235ut91p3.mp4", "https://e.top4top.io/m_22352ktoj4.mp4", "https://f.top4top.io/m_2235hcqj65.mp4", "https://g.top4top.io/m_2235j81s76.mp4"],
  vidrandom: ["https://k.top4top.io/m_2277tg6m70.mp4", "https://d.top4top.io/m_2277t2jeh0.mp4", "https://c.top4top.io/m_2277wxhle0.mp4", "https://g.top4top.io/m_22776umn92.mp4", "https://e.top4top.io/m_22776amjl4.mp4", "https://h.top4top.io/m_2277ksf281.mp4", "https://f.top4top.io/m_2277iliie1.mp4", "https://c.top4top.io/m_2277axzz01.mp4", "https://c.top4top.io/m_22777p6uz0.mp4", "https://e.top4top.io/m_22774k28n2.mp4", "https://l.top4top.io/m_2277dz2zw2.mp4", "https://b.top4top.io/m_2277uaciz3.mp4", "https://j.top4top.io/m_2277conhn3.mp4", "https://k.top4top.io/m_2277dgyml1.mp4", "https://k.top4top.io/m_2277on1gg2.mp4", "https://h.top4top.io/m_22774jf141.mp4", "https://b.top4top.io/m_22774wjs32.mp4", "https://f.top4top.io/m_2277k9gw00.mp4"],
  lesbi: ["https://l.top4top.io/m_2257y4pyl0.mp4", "https://c.top4top.io/m_2274woesg0.mp4", "https://k.top4top.io/m_2257pdwjy0.mp4", "https://a.top4top.io/m_2257qulmx0.mp4", "https://a.top4top.io/m_2257vxzr62.mp4", "https://b.top4top.io/m_2257wjmbh3.mp4", "https://b.top4top.io/m_2257sen2a1.mp4", "https://c.top4top.io/m_2257hpo9v3.mp4", "https://e.top4top.io/m_2257pye7u1.mp4", "https://c.top4top.io/m_2257p7xg14.mp4", "https://c.top4top.io/m_2257p4v9i3.mp4", "https://l.top4top.io/m_2257jvkrv3.mp4", "https://b.top4top.io/m_2257pl7wh1.mp4", "https://e.top4top.io/m_2257fiwnp2.mp4", "https://b.top4top.io/m_22578b1nk1.mp4", "https://k.top4top.io/m_22572gv7q1.mp4", "https://i.top4top.io/m_2257pu90l2.mp4", "https://d.top4top.io/m_2257vcwiw3.mp4", "https://j.top4top.io/m_2258joebc2.mp4", "https://g.top4top.io/m_2258kvnba4.mp4", "https://f.top4top.io/m_2258nm8pe1.mp4", "https://g.top4top.io/m_2258af7bc2.mp4", "https://l.top4top.io/m_2258f0ci92.mp4", "https://j.top4top.io/m_2258ehqpb2.mp4", "https://h.top4top.io/m_2258pckkf3.mp4", "https://e.top4top.io/m_225857rs20.mp4", "https://k.top4top.io/m_225863kpa0.mp4", "https://j.top4top.io/m_2258s6we62.mp4", "https://i.top4top.io/m_2258if6l13.mp4", "https://b.top4top.io/m_2258lmd2h1.mp4", "https://j.top4top.io/m_2258a9oah2.mp4", "https://i.top4top.io/m_22588w3xh0.mp4", "https://g.top4top.io/m_225885lm14.mp4", "https://e.top4top.io/m_2258buxc30.mp4", "https://e.top4top.io/m_2258fvra62.mp4", "https://l.top4top.io/m_22588mx7k4.mp4", "https://g.top4top.io/m_2258zhldg1.mp4"],
};

// ── APIs anime NSFW con fallback ─────────────
async function fromWaifuPics(type) {
  const res = await axios.get("https://api.waifu.pics/nsfw/" + type, { timeout: 10000 });
  return res.data?.url || null;
}
async function fromWaifuIm(tag) {
  const res = await axios.get("https://api.waifu.im/search?included_tags=" + tag + "&is_nsfw=true&gif=false", { timeout: 10000 });
  return res.data?.images?.[0]?.url || null;
}
async function fromNekosLife(type) {
  const res = await axios.get("https://nekos.life/api/v2/img/" + type, { timeout: 10000 });
  return res.data?.url || null;
}

const ANIME_NSFW = {
  waifu:   [() => fromWaifuPics("waifu"),   () => fromWaifuIm("waifu")],
  neko:    [() => fromWaifuPics("neko"),    () => fromWaifuIm("neko")],
  trap:    [() => fromWaifuPics("trap"),    () => fromWaifuIm("trap")],
  ahegao:  [() => fromWaifuPics("ahegao"), () => fromWaifuIm("ahegao")],
  uniform: [() => fromWaifuPics("uniform"), () => fromWaifuIm("uniform")],
  ass:     [() => fromWaifuIm("ass"),       () => fromWaifuPics("ass")],
  thighs:  [() => fromWaifuIm("thighs"),   () => fromWaifuPics("waifu")],
  hentai:  [() => fromWaifuPics("hentai"), () => fromWaifuIm("hentai"), () => fromNekosLife("hentai")],
  blowjob: [() => fromWaifuPics("blowjob"), () => fromNekosLife("blowjob")],
  milf:    [() => fromWaifuPics("milf"),   () => fromWaifuIm("milf")],
  oral:    [() => fromWaifuPics("oral"),   () => fromWaifuIm("oral")],
  paizuri: [() => fromWaifuPics("paizuri")],
  pussy:   [() => fromWaifuIm("pussy"),    () => fromNekosLife("pussy")],
  gif:     [() => fromWaifuPics("hentai"), () => fromNekosLife("hentai")],
};

async function getAnimeNSFW(type) {
  const fetchers = ANIME_NSFW[type] || ANIME_NSFW["hentai"];
  for (const fn of fetchers) {
    try {
      const url = await fn();
      if (url && url.startsWith("http")) return url;
    } catch { continue; }
  }
  return null;
}

// ── Enviar imagen/video desde URL directa ────
async function sendFromUrl(ctx, url, label, isVideo = false) {
  const { react, sock, from, msg } = ctx;
  await react("🔞");
  try {
    const caption = "🔞 *" + label + "*\n_Solo para usuarios Premium_ ⭐";
    if (isVideo) {
      await sock.sendMessage(from, {
        video: { url },
        caption,
        mimetype: "video/mp4",
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        image: { url },
        caption,
      }, { quoted: msg });
    }
    await react("✅");
  } catch (err) {
    console.error("[NSFW]", label, err.message);
    await ctx.reply("❌ Error al cargar. Intenta de nuevo.");
    await react("❌");
  }
}

// ── Enviar desde API anime ────────────────────
async function sendAnime(ctx, type, label) {
  const { react, reply } = ctx;
  await react("🔞");
  try {
    const url = await getAnimeNSFW(type);
    if (!url) return reply("❌ No se encontró imagen. Intenta de nuevo.");
    await sendFromUrl(ctx, url, label, url.endsWith(".gif"));
  } catch (err) {
    console.error("[NSFW]", type, err.message);
    await reply("❌ Error al cargar. Intenta de nuevo.");
    await react("❌");
  }
}

// ── Comando genérico para packs ───────────────
function packCmd(key, label, isVideo = false) {
  return async (ctx) => {
    const list = PACKS[key];
    const url = list[Math.floor(Math.random() * list.length)];
    await sendFromUrl(ctx, url, label, isVideo);
  };
}


// ── Nekobot API ──────────────────────────────
async function fetchNekobot(type) {
  const res = await axios.get("https://nekobot.xyz/api/image?type=" + type, { timeout: 15000 });
  return res.data?.message || null;
}

async function sendNekobot(ctx, type, label) {
  const { react, sock, from, msg } = ctx;
  await react("🔞");
  try {
    const url = await fetchNekobot(type);
    if (!url) return ctx.reply("❌ No se encontró imagen. Intenta de nuevo.");
    const caption = "🔞 *" + label + "*\n_Solo para usuarios Premium_ ⭐";
    const isGif = url.endsWith(".gif");
    if (isGif) {
      await sock.sendMessage(from, { video: { url }, caption, gifPlayback: true, mimetype: "video/mp4" }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { image: { url }, caption }, { quoted: msg });
    }
    await react("✅");
  } catch (err) {
    console.error("[NEKOBOT]", type, err.message);
    await ctx.reply("❌ Error al cargar. Intenta de nuevo.");
    await react("❌");
  }
}

const nsfwCommands = [
  // ── Packs reales ────────────────────────────
  { name: "pack",      alias: ["pack1"],                                    description: "Pack de fotos 🥵 [PREMIUM]",      category: "NSFW 🔞", premiumOnly: true, execute: packCmd("pack",     "Pack 🥵") },
  { name: "pack2",     alias: ["packgirl"],                                 description: "Pack chicas 🥵 [PREMIUM]",        category: "NSFW 🔞", premiumOnly: true, execute: packCmd("pack2",    "Pack Chicas 🥵") },
  { name: "pack3",     alias: ["packmen", "packh"],                         description: "Pack hombres 🥵 [PREMIUM]",       category: "NSFW 🔞", premiumOnly: true, execute: packCmd("pack3",    "Pack Hombres 🥵") },
  { name: "videoxxx",  alias: ["vxxx", "pornov", "videoporno"],             description: "Video XXX 🥵 [PREMIUM]",          category: "NSFW 🔞", premiumOnly: true, execute: packCmd("videoxxx", "Video XXX 🥵", true) },
  { name: "lesbi",     alias: ["videolesbi", "pornolesbivid", "pornolesv"], description: "Video lesbi 🥵 [PREMIUM]",        category: "NSFW 🔞", premiumOnly: true, execute: packCmd("lesbi",    "Video Lesbi 🥵", true) },

  { name: "pornovid",   alias: ["nsfwvid","vidporno"],         description: "Video porno [PREMIUM]",      category: "NSFW 🔞", premiumOnly: true, execute: packCmd("vidpornovid", "Video Porno 🥵", true) },
  { name: "pornovid2",  alias: ["nsfwvid2","vidporno2"],        description: "Video porno 2 [PREMIUM]",    category: "NSFW 🔞", premiumOnly: true, execute: packCmd("videoxxx2",   "Video Porno 2 🥵", true) },
  { name: "vidgay",     alias: ["pornovidgay","nsfwvidgay"],    description: "Video gay [PREMIUM]",        category: "NSFW 🔞", premiumOnly: true, execute: packCmd("gay",         "Video Gay 🥵", true) },
  { name: "vidbisexual",alias: ["pornovidbisexual","nsfwvidbisexual"], description: "Video bisexual [PREMIUM]", category: "NSFW 🔞", premiumOnly: true, execute: packCmd("bisexual", "Video Bisexual 🥵", true) },
  { name: "vidrandom",  alias: ["pornovidrandom","nsfwvidrandom"],     description: "Video porno random [PREMIUM]", category: "NSFW 🔞", premiumOnly: true, execute: packCmd("vidrandom", "Video Random 🥵", true) },

  // ── Anime NSFW ──────────────────────────────
  { name: "nwaifu",   alias: ["nsfwaifu"],      description: "Waifu NSFW [PREMIUM]",     category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "waifu",   "Waifu NSFW") },
  { name: "nneko",    alias: ["nsfwneko"],       description: "Neko NSFW [PREMIUM]",      category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "neko",    "Neko NSFW") },
  { name: "ntrap",    alias: ["nsfwtrap"],       description: "Trap NSFW [PREMIUM]",      category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "trap",    "Trap NSFW") },
  { name: "nahegao",  alias: ["nsfwahegao"],     description: "Ahegao NSFW [PREMIUM]",    category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "ahegao",  "Ahegao NSFW") },
  { name: "nuniform", alias: ["nsfwuniform"],    description: "Uniform NSFW [PREMIUM]",   category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "uniform", "Uniform NSFW") },
  { name: "nass",     alias: ["nsfwass"],        description: "Ass NSFW [PREMIUM]",       category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "ass",     "Ass NSFW") },
  { name: "nthighs",  alias: ["nsfwthighs"],     description: "Thighs NSFW [PREMIUM]",    category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendAnime(ctx, "thighs",  "Thighs NSFW") },
  { name: "hentai",   alias: ["hnt"],            description: "Hentai [PREMIUM]",         category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "hentai",  "Hentai") },
  { name: "hblowjob", alias: ["hbj"],            description: "Hentai BJ [PREMIUM]",      category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "blowjob", "Hentai BJ") },
  { name: "hmilf",    alias: ["hentaimil"],      description: "Hentai Milf [PREMIUM]",    category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "milf",    "Hentai Milf") },
  { name: "horal",    alias: ["hentaioral"],     description: "Hentai Oral [PREMIUM]",    category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "oral",    "Hentai Oral") },
  { name: "hpaizuri", alias: ["hentaipai"],      description: "Hentai Paizuri [PREMIUM]", category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "paizuri", "Hentai Paizuri") },
  { name: "hpussy",   alias: ["hentaipussy"],    description: "Hentai Pussy [PREMIUM]",   category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "pussy",   "Hentai Pussy") },
  { name: "hgif",     alias: ["hentaigif"],      description: "Hentai GIF [PREMIUM]",     category: "Hentai 🔞",    premiumOnly: true, execute: (ctx) => sendAnime(ctx, "gif",     "Hentai GIF") },
  {
    name: "nrandom", alias: ["nr"],
    description: "NSFW anime aleatorio [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true,
    execute: (ctx) => {
      const t = ["waifu","neko","trap","ahegao","ass","thighs","uniform"];
      return sendAnime(ctx, t[Math.floor(Math.random() * t.length)], "NSFW Aleatorio");
    },
  },
  {
    name: "hrandom", alias: ["hr"],
    description: "Hentai aleatorio [PREMIUM]", category: "Hentai 🔞", premiumOnly: true,
    execute: (ctx) => {
      const t = ["hentai","blowjob","milf","oral","paizuri","pussy","gif"];
      return sendAnime(ctx, t[Math.floor(Math.random() * t.length)], "Hentai Aleatorio");
    },
  },
  { name: "pornohentai3", alias: ["nsfwhentai3"], description: "Hentai 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "hentai", "Hentai 🔞") },
  { name: "pornoass2", alias: ["nsfwass2"], description: "Ass 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "ass", "Ass 🔞") },
  { name: "pornochica", alias: ["nsfwsgirl"], description: "Chica 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "thigh", "Chica 🔞") },
  { name: "pornoass3", alias: ["nsfwass3"], description: "Ass 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "hass", "Ass 🔞") },
  { name: "pornotetas2", alias: ["nsfwboobs2"], description: "Tetas 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "boobs", "Tetas 🔞") },
  { name: "pornotetas3", alias: ["nsfwboobs3"], description: "Tetas 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "hboobs", "Tetas 🔞") },
  { name: "pornopussy", alias: ["nsfwpussy"], description: "Pussy 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "pussy", "Pussy 🔞") },
  { name: "pornopaizuri", alias: ["nsfwpaizuri"], description: "Paizuri 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "paizuri", "Paizuri 🔞") },
  { name: "pornoneko", alias: ["nsfwneko"], description: "Neko 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "lewdneko", "Neko 🔞") },
  { name: "pornopies2", alias: ["nsfwfoot2"], description: "Pies 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "feet", "Pies 🔞") },
  { name: "pornomuslo", alias: ["nsfwhthigh"], description: "Muslo 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "hthigh", "Muslo 🔞") },
  { name: "pornoanal", alias: ["nsfwanal"], description: "Anal 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "anal", "Anal 🔞") },
  { name: "pornomamada", alias: ["nsfwblowjob"], description: "Mamada 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "blowjob", "Mamada 🔞") },
  { name: "porno4k", alias: ["porn4k"], description: "4k 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "4k", "4k 🔞") },
  { name: "pornoanal2", alias: ["nsfwanal2"], description: "Anal 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "hentai_anal", "Anal 🔞") },
  { name: "pornoanal3", alias: ["nsfwanal3"], description: "Anal 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/anal/gif", "Anal 🔞") },
  { name: "pornomamada2", alias: ["nsfwblowjob2"], description: "Mamada 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/blowjob/gif", "Mamada 🔞") },
  { name: "pornocum2", alias: ["nsfwcum2"], description: "Cum 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/cum/gif", "Cum 🔞") },
  { name: "pornofuck", alias: ["nsfwfuck"], description: "Fuck 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/fuck/gif", "Fuck 🔞") },
  { name: "pornoneko2", alias: ["nsfwneko2"], description: "Neko 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/neko/gif", "Neko 🔞") },
  { name: "pornopussy2", alias: ["nsfwpussy2"], description: "Pussy 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/pussylick/gif", "Pussy 🔞") },
  { name: "pornosolo", alias: ["nsfwsolo"], description: "Solo 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "nsfw/solo/gif", "Solo 🔞") },
  { name: "pornoyaoi3", alias: ["nsfwyaoi3"], description: "Yaoi 🔞 [PREMIUM]", category: "NSFW Anime 🔞", premiumOnly: true, execute: (ctx) => sendNekobot(ctx, "yaoi", "Yaoi 🔞") },
];

export default nsfwCommands;
