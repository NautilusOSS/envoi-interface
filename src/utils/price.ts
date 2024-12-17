export const getNamePrice = (name: string): number => {
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
      return 64_000;
    case 2:
      return 32_000;
    case 3:
      return 16_000;
    case 4:
      return 8_000;
    case 5:
      return 4_000;
    case 6:
      return 2_000;
    default:
      return 2_000;
  }
};
