// import { useEffect, useState } from "react";
// import InputText from "../components/InputText";
// import { loginUserService } from "../services/authAPI";
// import Spinner from "../components/Spinner";
import LoginForm from "../components/LoginForm";

// import useAuth from "../hooks/useAuth";
// import { useNavigate } from "react-router-dom";
// import useXHR from "../hooks/useXHR";

// import LoginModuleCSS from "../styles/Login.module.css";
// import InputTextModuleCSS from "../styles/InputText.module.css";
// import ProgressBarModuleCSS from "../styles/ProgressBar.module.css";
// import GlobalModuleCSS from "../styles/Global.module.css";

function Login() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-white p-3 text-blue-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-blue-700"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-slate-100 p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700"
      >
        <div className="w-full max-w-md">
          <div className="rounded-xl bg-white p-8 shadow-xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-slate-800">
                DAM Platform
              </h1>
              <p className="mt-2 text-slate-600">Digital Asset Management</p>
            </div>

            <LoginForm />
          </div>
        </div>
      </main>
    </>
  );
}

export default Login;
