// events/adult.js
export const adultEvents = [
  {
    chance: 0.3,
    run(p, log) {
      const earn = Math.floor(Math.random() * 200) + 100;
      p.wealth += earn;
      log(`💼 接到臨時工作機會，收入 +${earn}`);
    }
  }
];
