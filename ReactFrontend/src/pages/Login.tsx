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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">DAM Platform</h1>

            <p className="text-slate-500 mt-2">Digital Asset Management</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

export default Login;
