export const getNamePrice = (name: string): number => {
  // Get length of name (without .voi)
  const length = name.length;

  // Price in VOI
  switch (length) {
    case 1:
      return 160;
    case 2:
      return 80;
    case 3:
      return 40;
    case 4:
      return 20;
    case 5:
      return 10;
    case 6:
      return 5;
    default:
      return 5;
  }
};
