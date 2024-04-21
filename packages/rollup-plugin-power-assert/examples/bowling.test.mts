import { describe, it, assert } from 'vitest';

type Rolls = number[];
type Frame = number[];
type Frames = Frame[];

const isStrike = (rolls: Rolls, index: number) => (rolls[index] === 10);
const isSpare = (rolls: Rolls, index: number) => (rolls[index] + rolls[index + 1]) === 10;
const strikeBonus = (rolls: Rolls, index: number) => rolls[index + 1] + rolls[index + 2];
const spareBonus = (rolls: Rolls, index: number) => rolls[index + 2];
const twoBallsInFrame = (rolls: Rolls, index: number) => rolls[index] + rolls[index + 1];

// rolls -> score
function scoreOf (rolls: Rolls) {
  let score = 0;
  for (let frame = 0, index = 0; frame < 10; frame +=1) {
    if (isStrike(rolls, index)) {
      score += 10 + strikeBonus(rolls, index);
      index += 1;
    } else if (isSpare(rolls, index)) {
      score += 10 + spareBonus(rolls, index);
      index += 2;
    } else {
      score += twoBallsInFrame(rolls, index);
      index += 2;
    }
  }
  return score;
}

// rolls -> frames
function framesOf(rolls: Rolls): Frames {
  const frames: Frames = [];
  rolls.reduce((currentFrame: Frame, roll: number) => {
    currentFrame.push(roll);
    if (frames.length === 9) { // prepare for the last frame
      frames.push(currentFrame);
    }
    if ((currentFrame.length === 2 || roll === 10) && frames.length !== 10) {
      frames.push(currentFrame);
      const nextFrame: Frame = [];
      return nextFrame;
    }
    return currentFrame;
  }, []);
  return frames;
}

// frames -> rolls
function rollsOf(frames: Frames): Rolls {
  return frames.flat();
  // return frames.reduce((acc, frame) => acc.concat(frame), []);
}

// frames -> new frames
function roll (frames: Frames, pins: number): Frames {
  const newFrames = structuredClone(frames);
  const currentFrame = newFrames[frames.length - 1];
  if (frames.length === 10) { // 10th frame
    if (currentFrame.length == 2) {
      const frameScore = currentFrame.reduce((acc, pins) => acc + pins, 0);
      if (frameScore < 10) {
        throw new Error('最終フレームが10点に満たない場合は3投目は投げられません');
      } else {
        currentFrame.push(pins);
      }
    } else {
      currentFrame.push(pins);
    }
  } else if (currentFrame.length == 2) {
    newFrames.push([pins]);
  } else if (currentFrame.length == 1 && currentFrame[0] === 10) { // strike
    newFrames.push([pins]);
  } else {
    currentFrame.push(pins);
  }
  return newFrames;
}


describe('Bowling Game', () => {

  describe('scoreOf(rollsOf(frames))', () => {
    it('score of perfect game frames', () => {
      const perfectFrames = [
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10, 10, 10]
      ];
      assert(scoreOf(rollsOf(perfectFrames)) === 300);
    });

    it('real example', () => {
      const frames = [
        [1, 4],
        [4, 5],
        [6, 4], // spare
        [5, 5], // spare
        [10], // strike
        [0, 1],
        [7, 3], // spare
        [6, 4], // spare
        [10], // strike
        [2, 8, 6]
      ];
      assert(scoreOf(rollsOf(frames)) === 133);
      // assert(scoreOf(rollsOf(frames)) === 132);
      // assert(scoreOf(rollsOf(frames))
      //        ===
      //        132);
      // assert.equal(scoreOf(rollsOf(frames)), 132);
    });
  });

  describe('roll', () => {
    it('the first roll', () => {
      const frames = roll([[]], 0);
      assert.deepEqual(frames, [[0]]);
    });
    it('gutter at the first frame', () => {
      const frames = roll([[0]], 0);
      assert.deepEqual(frames, [[0, 0]]);
    });
    it('next frame', () => {
      const frames = roll([[0, 0]], 0);
      assert.deepEqual(frames, [[0, 0], [0]]);
    });
    it('next frame is also a gutter game', () => {
      const frames = roll([[0, 0], [0]], 0);
      assert.deepEqual(frames, [[0, 0], [0, 0]]);
    });
    it('more frames', () => {
      const frames = roll([[0, 0], [0]], 0);
      assert.deepEqual(frames, [[0, 0], [0, 0]]);
    });
    it('frame next strike game', () => {
      const frames = roll([[10]], 0);
      assert.deepEqual(frames, [[10], [0]]);
    });
    it('strike chain', () => {
      const frames = roll([[10],[10]], 10);
      assert.deepEqual(frames, [[10], [10], [10]]);
    });
    it('最終フレームの1投目がストライクの状態で2投目もストライクの場合', () => {
      const frame10th = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [10],
      ];
      const expected = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [10, 10],
      ];
      const frames = roll(frame10th, 10);
      assert.deepEqual(frames, expected);
    });
    it('最終フレームの1,2投目がストライクの状態で3投目もストライクの場合', () => {
      const frame10th = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [10, 9],
      ];
      const expected = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        // [10, 10, 10],
        [10, 9, 10],
      ];
      const frames = roll(frame10th, 10);
      assert.deepEqual(frames, expected);
    });
    it('最終フレームの1,2投目でスペアの状態で3投目', () => {
      const frame10th = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [3, 7],
      ];
      const expected = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [3, 7, 4],
      ];
      const frames = roll(frame10th, 4);
      assert.deepEqual(frames, expected);
    });
    it('最終フレームはスペアやストライクでないと3投目は投げられない(例外が出る)', () => {
      const frame10th = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [3, 6],
      ];
      assert.throws(() => {
        roll(frame10th, 5);
      });
    });
  });

  describe('scoreOf', () => {
    it('gutter game', () => {
      const rolls = rollMany(20, 0);
      assert(scoreOf(rolls) === 0);
    });

    it('all ones', () => {
      const rolls = rollMany(20, 1);
      assert(scoreOf(rolls) === 20);
    });

    it('one spare', () => {
      let rolls = rollSpare();
      rolls.push(7);
      rolls = rollMany(17, 0, rolls);
      assert(scoreOf(rolls) === 24);
    });

    it('one strike', () => {
      let rolls = rollStrike();
      rolls.push(2);
      rolls.push(3);
      rolls = rollMany(16, 0, rolls);
      assert(scoreOf(rolls) === 20);
    });

    it('perfect game', () => {
      const rolls = rollMany(12, 10);
      assert(scoreOf(rolls) === 300);
    });

    it('real example', () => {
      const rolls = [
        1, 4,
        4, 5,
        6, 4, // spare
        5, 5, // spare
        10, // strike
        0, 1,
        7, 3, // spare
        6, 4, // spare
        10, // strike
        2, 8, 6
      ];
      // assert(scoreOf(rolls) === 133);
      assert(scoreOf(rolls) === 123);
    });
  });

  describe('framesOf', () => {
    it('gutter game', () => {
      const rolls = rollMany(20, 0);
      assert.deepEqual(framesOf(rolls), [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]);
    });

    it('one spare', () => {
      let rolls = rollSpare();
      rolls.push(7);
      rolls = rollMany(17, 0, rolls);
      assert.deepEqual(framesOf(rolls), [
        [5, 5],
        [7, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]);
    });

    it('one strike', () => {
      let rolls = rollStrike();
      rolls.push(2);
      rolls.push(3);
      rolls = rollMany(16, 0, rolls);
      assert.deepEqual(framesOf(rolls), [
        [10],
        [2, 3],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]);
    });

    it('perfect game', () => {
      const rolls = rollMany(12, 10);
      assert.deepEqual(framesOf(rolls), [
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10],
        [10, 10, 10]
      ]);
    });

    it('real example', () => {
      const rolls = [
        1, 4,
        4, 5,
        6, 4, // spare
        5, 5, // spare
        10, // strike
        0, 1,
        7, 3, // spare
        6, 4, // spare
        10, // strike
        2, 8, 6
      ];
      assert.deepEqual(framesOf(rolls), [
        [1, 4],
        [4, 5],
        [6, 4], // spare
        [5, 5], // spare
        [10], // strike
        [0, 1],
        [7, 3], // spare
        [6, 4], // spare
        [10], // strike
        [2, 8, 6]
      ]);
    });
  });

  const rollMany = (n: number, pins: number, acc: number[] = []) => {
    const rolls = ([] as number[]).concat(acc);
    for (let i = 0; i < n; i += 1) {
      rolls.push(pins);
    }
    return rolls;
  };
  const rollSpare = (acc = []) => rollMany(2, 5, acc);
  const rollStrike = (acc = []) => rollMany(1, 10, acc);
});
