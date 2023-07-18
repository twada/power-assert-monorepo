import easta from 'easta';

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
