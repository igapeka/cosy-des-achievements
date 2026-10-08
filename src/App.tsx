import { RouterProvider } from "@tanstack/react-router";
import type { createAppRouter } from "./router/router";

type AppProps = {
  router: ReturnType<typeof createAppRouter>;
};

function App({ router }: AppProps) {
  return <RouterProvider router={router} />;
}

export default App;
