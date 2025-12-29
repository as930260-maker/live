// events/student.js
export const studentEvents = [
  {
    chance: 0.35,
    run(p, log) {
      p.intelligence += 1;
      log("🎒 老師稱讚你的表現，智力 +1");
    }
  },
  {
    chance: 0.2,
    run(p, log) {
      p.familyFavor -= 2;
      log("📚 你因為課業忙碌，較少陪家人。爸媽好感 -2");
    }
  }
];
