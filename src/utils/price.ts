export const getNamePrice = (name: string): number => {
  // Get length of name (without .voi)
  const length = name.length;

  // Price in VOI
  switch (length) {
    case 1:
      return 50000;
    case 2:
      return 30000;
    case 3:
      return 20000;
    case 4:
      return 10000;
    case 5:
      return 5000;
    case 6:
      return 2000;
    default:
      return 1000;
  }
}; 