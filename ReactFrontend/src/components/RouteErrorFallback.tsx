import { useRouteError } from "react-router-dom";
import { isProd } from "./helper";

function RouteErrorFallback() {
  const error = useRouteError();
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      {!isProd && <p>{message}</p>}
      <a className="underline" href="/">
        Return home
      </a>
    </main>
  );
}

export default RouteErrorFallback;
