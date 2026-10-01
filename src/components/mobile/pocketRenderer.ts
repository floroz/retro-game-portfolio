import { CYCLE_SECONDS, coffeeLift, vesselAt } from "./pocketTimeline";
import type { PocketImages } from "./pocketAssets";

type Point = [number, number];
const smooth = (n: number) => {
  const v = Math.max(0, Math.min(1, n));
  return v * v * (3 - 2 * v);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The approved painting uses 1024 × 1536 coordinates throughout. */
export function createPocketScene(root: HTMLElement, images: PocketImages) {
  function layer<T extends HTMLElement>(name: string): T {
    const element = root.querySelector<T>(`[data-layer="${name}"]`);
    if (!element) throw new Error(`Missing pocket scene layer: ${name}`);
    return element;
  }
  const canvas = layer<HTMLCanvasElement>("motion");
  const ctx = canvas.getContext("2d")!;
  const nightLayer = layer("night");
  const gold = layer("gold"),
    dawn = layer("dawn"),
    skyColor = layer("sky-color");
  const sun = layer("sun"),
    moon = layer("moon"),
    reflection = layer("reflection");
  const moonReflection = layer("moon-reflection"),
    phaseLabel = layer("phase");
  const {
    day: dayPainting,
    night: nightPainting,
    raisedNight: moonSource,
    raisedDay: armSource,
    restDay: restSource,
    restNight: restNightSource,
    ferry: ferrySource,
    boat: boatSource,
  } = images;
  const vessel = document.createElement("canvas");
  vessel.width = 160;
  vessel.height = 64;
  const vesselCtx = vessel.getContext("2d")!;
  let elapsed = 0,
    ambientTime = 0,
    manualTime: number | null = null,
    lastLabel = "";
  let active = false,
    playing = true,
    previous = 0,
    frame = 0,
    disposed = false;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const phaseForCoffee = () => (elapsed % CYCLE_SECONDS) / CYCLE_SECONDS;
  const forearm: Point[] = [
    [170, 798],
    [197, 802.5],
    [210, 808],
    [225, 803],
    [238.5, 794],
    [243, 796],
    [272, 758],
    [296, 770],
    [288.5, 782.5],
    [280, 802.5],
    [274.5, 820],
    [267.5, 835.5],
    [260, 852.5],
    [245, 871.5],
    [234, 883.5],
    [222.5, 885.5],
    [206, 880.5],
    [190.5, 867.5],
    [176, 854.5],
  ];
  const hand: Point[] = [
    [272, 758],
    [291, 731.5],
    [300, 722],
    [307, 718],
    [323, 718],
    [331.5, 721.5],
    [330, 713],
    [340, 711],
    [351, 711.5],
    [360, 713.5],
    [360.5, 727],
    [355.5, 741],
    [341.5, 743],
    [335, 741.5],
    [330.5, 749.5],
    [320, 758],
    [311, 765],
    [296, 770],
    [285, 778],
  ];
  const water: Point[] = [
    [359, 537],
    [763, 537],
    [763, 621],
    [716, 641],
    [680, 665],
    [650, 685],
    [610, 709],
    [582, 691],
    [548, 659],
    [509, 636],
    [470, 615],
    [430, 599],
    [390, 581],
    [359, 572],
  ];
  function polygon(points: Point[]) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  function paintedPiece(points: Point[], night: number) {
    ctx.save();
    polygon(points);
    ctx.clip();
    ctx.drawImage(armSource, 0, 0, 1024, 1536);
    ctx.globalAlpha = night;
    ctx.drawImage(moonSource, 0, 0, 1024, 1536);
    ctx.restore();
  }
  const restForearm: Point[] = [
    [149, 838],
    [172, 843],
    [192, 850],
    [211, 851],
    [227, 854],
    [232, 858],
    [270, 854],
    [270, 890],
    [261, 891],
    [249, 892],
    [236, 893],
    [226, 895],
    [216, 898],
    [199, 901],
    [182, 902],
    [167, 903],
    [152, 898],
    [144, 887],
    [141, 865],
  ];
  const restHand: Point[] = [
    [270, 854],
    [289, 849],
    [299, 848],
    [305, 850],
    [314, 852],
    [326, 858],
    [326, 850],
    [337, 848],
    [350, 849],
    [359, 852],
    [357, 866],
    [352, 877],
    [339, 879],
    [330, 875],
    [323, 878],
    [311, 887],
    [297, 890],
    [270, 890],
    [255, 890],
  ];
  const cross = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  function triangulate(shapes: Point[][]) {
    const remaining = shapes[0].map((_, i) => i),
      triangles: number[][] = [];
    while (remaining.length > 3) {
      let best = -1,
        area = -1;
      for (let j = 0; j < remaining.length; j++) {
        const ids = [
          remaining[(j + remaining.length - 1) % remaining.length],
          remaining[j],
          remaining[(j + 1) % remaining.length],
        ];
        let score = Infinity;
        const valid = shapes.every((points) => {
          const [a, b, c] = ids.map((i) => points[i]),
            size = cross(a, b, c);
          score = Math.min(score, size);
          if (size <= 0.001) return false;
          return !remaining.some(
            (i) =>
              !ids.includes(i) &&
              cross(a, b, points[i]) >= 0 &&
              cross(b, c, points[i]) >= 0 &&
              cross(c, a, points[i]) >= 0,
          );
        });
        if (valid && score > area) {
          best = j;
          area = score;
        }
      }
      if (best < 0) throw Error("Rest pose needs compatible triangulation");
      triangles.push([
        remaining[(best + remaining.length - 1) % remaining.length],
        remaining[best],
        remaining[(best + 1) % remaining.length],
      ]);
      remaining.splice(best, 1);
    }
    triangles.push(remaining);
    return triangles;
  }
  const forearmTriangles = triangulate([forearm, restForearm]);
  const handTriangles = triangulate([hand, restHand]);
  // Only the source forearms are blended, not two full-room textures per frame.
  const armTextures = [
    document.createElement("canvas"),
    document.createElement("canvas"),
  ];
  armTextures.forEach((c) => {
    c.width = 280;
    c.height = 230;
  });
  let textureNight = -1;
  function updateArmTextures(night: number) {
    night = Math.round(night * 60) / 60;
    if (textureNight === night) return;
    textureNight = night;
    [
      [armSource, moonSource],
      [restSource, restNightSource],
    ].forEach(([day, moon], i) => {
      const paint = armTextures[i].getContext("2d")!;
      paint.globalAlpha = 1;
      paint.clearRect(0, 0, 280, 230);
      paint.drawImage(day, 120, 690, 280, 230, 0, 0, 280, 230);
      paint.globalAlpha = night;
      paint.drawImage(moon, 120, 690, 280, 230, 0, 0, 280, 230);
    });
  }
  function paintedTriangle(
    source: Point[],
    target: Point[],
    texture: HTMLCanvasElement,
    opacity = 1,
  ) {
    const [p, q, r] = source,
      [a, b, c] = target;
    const ux = q[0] - p[0],
      uy = q[1] - p[1],
      vx = r[0] - p[0],
      vy = r[1] - p[1],
      det = ux * vy - uy * vx;
    const m0 = ((b[0] - a[0]) * vy - (c[0] - a[0]) * uy) / det,
      m1 = ((b[1] - a[1]) * vy - (c[1] - a[1]) * uy) / det;
    const m2 = ((c[0] - a[0]) * ux - (b[0] - a[0]) * vx) / det,
      m3 = ((c[1] - a[1]) * ux - (b[1] - a[1]) * vx) / det;
    ctx.save();
    polygon(target);
    ctx.clip();
    ctx.globalAlpha = opacity;
    ctx.transform(
      m0,
      m1,
      m2,
      m3,
      a[0] - m0 * p[0] - m2 * p[1],
      a[1] - m1 * p[0] - m3 * p[1],
    );
    ctx.drawImage(texture, 120, 690);
    ctx.restore();
  }
  function drawCoffee(night: number) {
    const lift = coffeeLift(elapsed, manualTime);
    canvas.dataset.cupPose =
      lift === 0 ? "table" : lift === 1 ? "mouth" : "moving";
    canvas.dataset.sip = String(Math.floor((phaseForCoffee() % 0.25) * 8) + 1);
    if (lift === 0) {
      // Rest is the painted pose in its original proportions: no mesh or scaling.
      ctx.save();
      ctx.beginPath();
      ctx.rect(108, 790, 280, 128);
      ctx.clip();
      ctx.drawImage(restSource, 0, 0, 1024, 1536);
      ctx.globalAlpha = night;
      ctx.drawImage(restNightSource, 0, 0, 1024, 1536);
      ctx.restore();
      return;
    }
    const dx = mix(-5, -16, lift),
      dy = mix(126, -36, lift),
      tilt = ((-9 * Math.PI) / 180) * smooth((lift - 0.7) / 0.3);
    const pivot: Point = [330, 713],
      elbow: Point = [222.5, 875.5],
      wrist: Point = [283.5, 764];
    const handPoint = (p: Point): Point => [
      pivot[0] +
        dx +
        (p[0] - pivot[0]) * Math.cos(tilt) -
        (p[1] - pivot[1]) * Math.sin(tilt),
      pivot[1] +
        dy +
        (p[0] - pivot[0]) * Math.sin(tilt) +
        (p[1] - pivot[1]) * Math.cos(tilt),
    ];
    const target = handPoint(wrist),
      sourceAngle = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
    const angle = Math.atan2(target[1] - elbow[1], target[0] - elbow[0]),
      scale =
        Math.hypot(target[0] - elbow[0], target[1] - elbow[1]) /
        Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1]);
    paintedPiece(
      [
        [259, 860],
        [265, 850],
        [270, 840],
        [285, 837],
        [295, 834],
        [304, 831],
        [313, 836],
        [317, 842],
        [321, 850],
        [321, 859],
        [310, 862],
        [280, 864],
        [257, 865],
      ],
      night,
    );
    if (lift >= 0.5) {
      ctx.save();
      ctx.translate(...elbow);
      ctx.rotate(angle);
      ctx.scale(scale, 1);
      ctx.rotate(-sourceAngle);
      ctx.translate(-elbow[0], -elbow[1]);
      paintedPiece(forearm, night);
      ctx.restore();
      ctx.save();
      ctx.translate(pivot[0] + dx, pivot[1] + dy);
      ctx.rotate(tilt);
      ctx.translate(-pivot[0], -pivot[1]);
      paintedPiece(hand, night);
      ctx.restore();
      return;
    }
    const forearmPoint = (p: Point): Point => {
      const x = p[0] - elbow[0],
        y = p[1] - elbow[1],
        u = (x * Math.cos(sourceAngle) + y * Math.sin(sourceAngle)) * scale,
        v = -x * Math.sin(sourceAngle) + y * Math.cos(sourceAngle);
      return [
        elbow[0] + u * Math.cos(angle) - v * Math.sin(angle),
        elbow[1] + u * Math.sin(angle) + v * Math.cos(angle),
      ];
    };
    const progress = smooth(lift / 0.5),
      material = smooth((lift - 0.22) / 0.28);
    const handTarget: Point[] = hand.map(
      (p, i) =>
        handPoint(p).map((v, j) => mix(restHand[i][j], v, progress)) as Point,
    );
    const forearmTarget: Point[] = forearm.map(
      (p, i) =>
        forearmPoint(p).map((v, j) =>
          mix(restForearm[i][j], v, progress),
        ) as Point,
    );
    const join = 1 - smooth((lift - 0.35) / 0.15);
    for (const [a, b] of [
      [6, 0],
      [7, 17],
    ])
      forearmTarget[a] = forearmTarget[a].map((v, j) =>
        mix(v, handTarget[b][j], join),
      ) as Point;
    updateArmTextures(night);
    for (const [raised, rest, targetPoints, triangles] of [
      [forearm, restForearm, forearmTarget, forearmTriangles],
      [hand, restHand, handTarget, handTriangles],
    ] as [Point[], Point[], Point[], number[][]][]) {
      for (const indices of triangles) {
        const targetTriangle = indices.map((i) => targetPoints[i]);
        paintedTriangle(
          indices.map((i) => rest[i]),
          targetTriangle,
          armTextures[1],
        );
        if (material > 0)
          paintedTriangle(
            indices.map((i) => raised[i]),
            targetTriangle,
            armTextures[0],
            material,
          );
      }
    }
  }
  function drawBreeze(night: number) {
    // Texture-strip deformation keeps foliage registered with the painted scene.
    for (const [x, y, w, h, offset] of [
      [340, 576, 237, 143, 0],
      [331, 487, 38, 108, 1.7],
    ]) {
      for (let yy = 0; yy < h; yy += 3) {
        const shift =
          Math.sin(ambientTime * 1.35 + yy * 0.017 + offset) *
          2.4 *
          Math.sin((yy / h) * Math.PI);
        const sy = y + yy,
          sh = Math.min(3, h - yy);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        for (const [image, alpha] of [
          [dayPainting, 1],
          [nightPainting, night],
        ] as [HTMLImageElement, number][]) {
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            image,
            (x / 1024) * image.naturalWidth,
            (sy / 1536) * image.naturalHeight,
            (w / 1024) * image.naturalWidth,
            (sh / 1536) * image.naturalHeight,
            x + shift,
            sy,
            w,
            sh + 0.5,
          );
        }
        ctx.restore();
      }
    }
  }
  function drawSteam(night: number) {
    ctx.save();
    ctx.lineCap = "round";
    for (let plume = 0; plume < 4; plume++) {
      const age = (ambientTime * 0.3 + plume / 4) % 1;
      ctx.strokeStyle = night > 0.5 ? "#c5e1ff" : "#f4ede1";
      ctx.globalAlpha = Math.sin(age * Math.PI) * 0.29;
      ctx.lineWidth = 2.4 + age * 4.5;
      ctx.beginPath();
      for (let j = 0; j <= 20; j++) {
        const height = age * 46 + (j / 20) * 26;
        const x =
          940 +
          Math.sin(height * 0.1 - ambientTime * 2 + plume) *
            (2 + height * 0.085);
        const y = 703 - height;
        if (j) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawVessel(night: number, warmth: number, sourceX: number) {
    const boat = vesselAt(ambientTime);
    canvas.dataset.vessel = boat.kind;
    if (boat.kind === "gap") return;
    const isFerry = boat.kind === "ferry",
      x = boat.x;
    const width = isFerry ? 65 : 49,
      height = isFerry ? 25.3 : 16.4;
    const y = (isFerry ? 572 : 616) + Math.sin(ambientTime * 2.1) * 0.65;
    const source = isFerry ? ferrySource : boatSource;
    const crop = isFerry ? [718, 398, 357, 143] : [70, 173, 1650, 559];
    const sx = source.naturalWidth / 1774,
      sy = source.naturalHeight / 887;
    vesselCtx.clearRect(0, 0, 160, 64);
    vesselCtx.globalCompositeOperation = "source-over";
    vesselCtx.drawImage(
      source,
      crop[0] * sx,
      crop[1] * sy,
      crop[2] * sx,
      crop[3] * sy,
      0,
      0,
      160,
      64,
    );
    vesselCtx.globalCompositeOperation = "source-atop";
    vesselCtx.fillStyle = `rgba(67,119,207,${night * 0.48})`;
    vesselCtx.fillRect(0, 0, 160, 64);
    const gradient = vesselCtx.createLinearGradient(
      sourceX < x ? 0 : 160,
      0,
      sourceX < x ? 160 : 0,
      64,
    );
    gradient.addColorStop(
      0,
      night > 0.5
        ? "rgba(201,228,255,0.48)"
        : `rgba(255,221,146,${0.13 + warmth * 0.25})`,
    );
    gradient.addColorStop(1, "rgba(22,38,74,0.2)");
    vesselCtx.fillStyle = gradient;
    vesselCtx.fillRect(0, 0, 160, 64);
    vesselCtx.globalCompositeOperation = "source-over";
    ctx.save();
    polygon(water);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#0a2a54";
    ctx.beginPath();
    ctx.ellipse(
      x + (x - sourceX) * 0.02,
      y + 3,
      width * 0.58,
      2.3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = night > 0.5 ? 0.25 : 0.15;
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, -0.3);
    ctx.drawImage(vessel, -width / 2, -height, width, height);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.drawImage(vessel, x - width / 2, y - height, width, height);
    if (isFerry && night > 0) {
      ctx.fillStyle = "#ffdea0";
      ctx.globalAlpha = night * 0.8;
      for (let i = 0; i < 5; i++)
        ctx.fillRect(
          x - width * 0.27 + i * width * 0.12,
          y - height * 0.4,
          1.6,
          1.1,
        );
    }
    ctx.globalAlpha = night > 0.5 ? 0.42 : 0.55;
    ctx.strokeStyle =
      night > 0.5 ? "#9bbde6" : warmth > 0.3 ? "#eed39c" : "#c7e8df";
    ctx.lineWidth = 0.9;
    const direction = isFerry ? -1 : 1;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(x + direction * width * 0.3, y + 1 + j * 1.8);
      ctx.lineTo(
        x +
          direction *
            (width * 0.7 + 9 + j * 6 + Math.sin(ambientTime * 3 + j) * 3),
        y + 1 + j * 1.8,
      );
      ctx.stroke();
    }
    ctx.restore();
    canvas.dataset.vesselX = x.toFixed(1);
  }
  function draw() {
    const phase = (elapsed % CYCLE_SECONDS) / CYCLE_SECONDS;
    const stage = Math.min(3, Math.floor(phase * 4)),
      t = phase * 4 - stage;
    let night = 0,
      warmth = 0,
      sunrise = 0,
      disk = 0,
      sunX = 59,
      sunY = 12,
      reflected = 0;
    if (stage === 1) {
      night = smooth((t - 0.6) / 0.4);
      warmth = Math.sin(t * Math.PI) * 0.85;
      disk = 1 - smooth((t - 0.75) / 0.25);
      const angle = ((-90 + t * 90) * Math.PI) / 180;
      sunX = 52 + 18 * Math.cos(angle);
      sunY = 35 + 21 * Math.sin(angle);
      reflected = Math.sin(Math.min(t / 0.76, 1) * Math.PI) * 0.8;
    } else if (stage === 2) night = 1;
    else if (stage === 3) {
      night = 1 - smooth(t);
      sunrise = Math.sin(t * Math.PI) * 0.8;
    }
    const moonTime = (phase - 0.5) / 0.44;
    const moonAngle =
      ((-180 + Math.max(0, Math.min(1, moonTime)) * 180) * Math.PI) / 180;
    const moonX = 52 + 18 * Math.cos(moonAngle),
      moonY = 35 + 16 * Math.sin(moonAngle);
    const strength =
      moonTime >= 0 && moonTime <= 1
        ? night *
          smooth(moonTime / 0.06) *
          (1 - smooth((moonTime - 0.93) / 0.07))
        : 0;
    nightLayer.style.opacity = String(night);
    gold.style.opacity = String(warmth);
    skyColor.style.opacity = String(Math.min(1, warmth * 1.5));
    dawn.style.opacity = String(sunrise);
    sun.style.left = sunX - 2 + "%";
    sun.style.top = sunY + "%";
    sun.style.opacity = String(disk);
    reflection.style.left = sunX - 2 + "%";
    reflection.style.opacity = String(reflected);
    moon.style.left = moonX + "%";
    moon.style.top = moonY + "%";
    moon.style.opacity = String(strength);
    moonReflection.style.left = moonX + "%";
    moonReflection.style.opacity = String(
      strength * (0.93 + 0.07 * Math.sin(ambientTime * 3)),
    );
    {
      ctx.clearRect(0, 0, 1024, 1536);
      drawBreeze(night);
      drawVessel(night, warmth, (night > 0.5 ? moonX : sunX) * 10.24);
      drawSteam(night);
      drawCoffee(night);
    }
    canvas.dataset.stage = String(stage);
    canvas.dataset.night = night.toFixed(3);
    const label = [
      "Day",
      "Sunset · Ischia",
      "Night",
      "Dawn · light from the east",
    ][stage];
    if (label !== lastLabel) {
      lastLabel = label;
      phaseLabel.textContent = label;
    }
  }

  function running() {
    return (
      active &&
      !document.hidden &&
      !motion.matches &&
      (playing || manualTime !== null)
    );
  }
  function tick(now: number) {
    frame = 0;
    canvas.dataset.running = String(running());
    if (disposed || !running()) return;
    // 30 fps is ample for these slow movements and halves canvas work on phones.
    if (previous && now - previous < 1000 / 30) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = previous ? Math.min(now - previous, 100) / 1000 : 0;
    previous = now;
    if (playing) {
      elapsed += dt;
      ambientTime += dt;
    }
    if (manualTime !== null) {
      manualTime += dt;
      if (manualTime >= 2.8) manualTime = null;
    }
    draw();
    canvas.dataset.running = String(running());
    if (running()) frame = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (disposed) return;
    canvas.dataset.running = String(running());
    if (active) draw();
    if (running()) frame = requestAnimationFrame(tick);
  }
  function reduceMotion() {
    manualTime = null;
    restart();
  }
  document.addEventListener("visibilitychange", restart);
  motion.addEventListener("change", reduceMotion);
  draw();
  canvas.dataset.ready = "true";
  return {
    setState(next: { active: boolean; playing: boolean }) {
      active = next.active;
      playing = next.playing;
      restart();
    },
    sip() {
      if (!motion.matches && active) {
        manualTime = 0;
        restart();
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", restart);
      motion.removeEventListener("change", reduceMotion);
    },
  };
}
