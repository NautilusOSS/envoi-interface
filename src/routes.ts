import SearchName from "./pages/SearchName";
import RegisterName from "./pages/RegisterName";
import MyNames from "./pages/MyNames";
import RSVP from "./pages/RSVP";

interface Route {
  path: string;
  Component: React.ComponentType;
}

export const routes: Route[] = [
  {
    path: "/",
    Component: SearchName,
  },
  {
    path: "/search",
    Component: SearchName,
  },
  {
    path: "/register",
    Component: RegisterName,
  },
  {
    path: "/my-names",
    Component: MyNames,
  },
  {
    path: "/rsvp/:name",
    Component: RSVP,
  }
];
