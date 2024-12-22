export const getNamePrice = (name: string, basePrice: number): number => {
  // Get length of name (without .voi)
  const length = name.length;

  // Price in USDC
  // switch (length) {
  //   case 1:
  //     return 160;
  //   case 2:
  //     return 80;
  //   case 3:
  //     return 40;
  //   case 4:
  //     return 20;
  //   case 5:
  //     return 10;
  //   case 6:
  //     return 5;
  //   default:
  //     return 5;
  // }
  switch (length) {
    case 1:
      return basePrice * 32;
    case 2:
      return basePrice * 16;
    case 3:
      return basePrice * 8;
    case 4:
      return basePrice * 4;
    case 5:
      return basePrice * 2;
    case 6:
      return basePrice;
    default:
      return basePrice;
  }
};
