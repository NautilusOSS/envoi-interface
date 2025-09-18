interface NavLink {
  label: string;
  href: string;
}

export const navlinks: NavLink[] = [
  {
    label: "Listings",
    href: "/listing",
  },
  {
    label: "Collections",
    href: "/collection",
  },
  {
    label: "Staking",
    href: "/staking",
  },
  {
    label: "Launchpad",
    href: "/create-arc200",
  },
  {
    label: "Community Chest",
    href: "/community-chest",
  },
];

export const linkLabels: any = {
  "/collection": "Collections",
  "/listing": "Buy",
  "/staking": "Staking",
  "/community-chest": "Community Chest",
};
