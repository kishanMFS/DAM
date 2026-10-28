import { useState } from "react";
import useAuth from "../hooks/useAuth";

export default function LoginForm() {
  const [email, setEmail] = useState("john@mail.com");
  const [password, setPassword] = useState("changeme");

  const { loginUser, loginMutation } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser(email, password);
  };

  return (
    <section aria-labelledby="login-heading">
      <div className="w-full rounded-xl bg-white p-8 shadow-lg">
        <h2 id="login-heading" className="mb-6 text-center text-3xl font-bold">
          DAM Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {loginMutation.isError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded bg-red-100 p-3 text-red-800"
            >
              Login failed. Check your email and password and try again.
            </div>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block font-medium text-slate-900"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-400 p-3 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="admin@dam.com"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block font-medium text-slate-900"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-400 p-3 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-blue-700 py-3 text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginMutation.isPending ? "Signing In..." : "Login"}
          </button>
        </form>
      </div>
    </section>
  );
}
