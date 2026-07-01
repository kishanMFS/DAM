import { useState } from "react";
import useAuth from "../hooks/useAuth";

export default function LoginForm() {
  const [email, setEmail] = useState("john@mail.com");
  const [password, setPassword] = useState("changeme");
  const [error, setError] = useState("");

  const { loginUser, loginMutation } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginUser(email, password);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-100">
      <div className="bg-white shadow-lg rounded-xl p-8 w-[100]">
        <h1 className="text-3xl font-bold mb-6 text-center">DAM Login</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          {(error || loginMutation.isError) && (
            <div className="bg-red-100 text-red-700 p-3 rounded">
              {error || "Login failed"}
            </div>
          )}

          <div>
            <label className="block mb-2 font-medium">Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3"
              placeholder="admin@dam.com"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3"
              placeholder="********"
            />
          </div>

          <button
            disabled={loginMutation.isPending}
            className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
          >
            {loginMutation.isPending ? "Signing In..." : "Login"}
          </button>

          {/* <div className="text-center">
            <a href="/auth/forgot-password" className="text-blue-600">
              Forgot Password?
            </a>
          </div> */}
        </form>
      </div>
    </div>
  );
}
