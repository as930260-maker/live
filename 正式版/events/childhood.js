// events/childhood.js
export const childhoodEvents = [
  {
    chance: 0.3,
    run(p, log) {
      p.sensibility += 1;
      log("🧸 你在公園玩了一整天，對世界充滿好奇。感性 +1");
    }
  },
  {
    chance: 0.2,
    run(p, log) {
      p.health += 2;
      log("👶 家人很細心照顧你，健康稍微提升。健康 +2");
    }
  }
];
