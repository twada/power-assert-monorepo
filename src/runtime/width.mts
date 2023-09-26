import easta from 'easta';
import emojiRegex from 'emoji-regex';

type KnownWidth = {
  type: 'KnownWidth';
  width: number;
};
type UnknownWidth = {
  type: 'UnknownWidth';
  emoji: number;
  ambiguous: number;
  neutral: number;
  hint: number;
};

export function widthOf (str: string): KnownWidth | UnknownWidth {
  const segmenter = new Intl.Segmenter();
  const emojiRe = emojiRegex();
  let width = 0;
  let unknown = false;
  let emoji = 0;
  let ambiguous = 0;
  let neutral = 0;
  for (const { segment: seg } of segmenter.segment(str)) {
    const code = easta(seg);
    switch (code) {
      case 'F':
        width += 2;
        break;
      case 'H':
        width += 1;
        break;
      case 'A':
        unknown = true;
        ambiguous += 1;
        width += 2;
        break;
      case 'W':
        if (emojiRe.test(seg)) {
          unknown = true;
          emoji += 1;
        }
        width += 2;
        break;
      case 'Na':
        width += 1;
        break;
      case 'N':
        unknown = true;
        neutral += 1;
        width += 1;
        break;
    }
  }
  if (unknown) {
    return {
      type: 'UnknownWidth',
      emoji,
      ambiguous,
      neutral,
      hint: width
    };
  } else {
    return {
      type: 'KnownWidth',
      width
    };
  }
}
