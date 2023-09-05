import easta from 'easta';
import emojiRegex from 'emoji-regex';

type KnownWidth = {
  type: 'KnownWidth';
  width: number;
};
type UnknownWidth = {
  type: 'UnknownWidth';
  hint: number;
};

export function width (str: string): KnownWidth | UnknownWidth {
  const segmenter = new Intl.Segmenter();
  const emoji = emojiRegex();
  let width = 0;
  let unknown = false;
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
        width += 2;
        break;
      case 'W':
        if (!unknown && emoji.test(seg)) {
          unknown = true;
        }
        width += 2;
        break;
      case 'Na':
        width += 1;
        break;
      case 'N':
        unknown = true;
        width += 1;
        break;
    }
  }
  if (unknown) {
    return {
      type: 'UnknownWidth',
      hint: width
    };
  } else {
    return {
      type: 'KnownWidth',
      width
    };
  }
}

export function widthOf (str: string): number {
  const segmenter = new Intl.Segmenter();
  let width = 0;
  for (const { segment: seg } of segmenter.segment(str)) {
    const code = easta(seg);
    switch (code) {
      case 'F':
      case 'W':
        width += 2;
        break;
      case 'H':
      case 'N':
      case 'Na':
        width += 1;
        break;
      case 'A':
        width += 2;
        break;
    }
  }
  return width;
}
