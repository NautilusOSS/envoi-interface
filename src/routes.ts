import SearchName from "./pages/SearchName";
import RegisterName from "./pages/RegisterName";
import MyNames from "./pages/MyNames";
import RSVP from "./pages/RSVP";
import SandboxPage from "./pages/SandboxPage";

interface Route {
  path: string;
  Component: React.ComponentType;
  name?: string;
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
    path: "/register/:name",
    Component: RegisterName,
  },
  {
    path: "/my-names",
    Component: MyNames,
  },
  {
    path: "/rsvp/:name",
    Component: RSVP,
  },
  {
    path: "/sandbox",
    Component: SandboxPage,
    name: "Sandbox",
  },
];
