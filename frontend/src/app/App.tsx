import { useRoutes } from "react-router-dom";
import { routes } from "./router";

export function App() {
  return useRoutes(routes);
}
