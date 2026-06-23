import { useEffect, useState } from "react";
import InputText from "../components/InputText";
import {loginUserService} from "../services/authAPI";
import Spinner from "../components/Spinner";

import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useXHR from "../hooks/useXHR";

import LoginModuleCSS from "../styles/Login.module.css";
import InputTextModuleCSS from "../styles/InputText.module.css";
import ProgressBarModuleCSS from "../styles/ProgressBar.module.css";
import GlobalModuleCSS from "../styles/Global.module.css";

interface formFeildType {
  email: string;
  password: string;
}

function Login() {
  const [formField, setFormField] = useState<formFeildType>({
    email: "john@mail.com",
    password: "changeme",
  });
  const { loginUser, isLoggedIn } = useAuth();
  const { callApi } = useXHR();

  const [errors, setErrors] = useState<formFeildType>({
    email: "",
    password: "",
  });
  const [loginApiError, setloginApiError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    let hasError = false;
    const errorMessages: { email: string; password: string } = {
      email: "",
      password: "",
    };

    if (!formField.email.length) {
      errorMessages.email = "Email is required.";
      hasError = true;
    }
    if (!formField.password.length) {
      errorMessages.password = "Password is required.";
      hasError = true;
    }
    // Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formField.email.length && !emailRegex.test(formField.email)) {
      errorMessages.email = "Please enter a valid email address.";
      hasError = true;
    }

    setErrors(errorMessages);
    return hasError;
  };

  async function handleLoginUser(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setloginApiError("");

    if (validateForm()) {
      setIsLoading(false);
      setProgress(0);
      return;
    }
    function onProgress(value: number) {
      setProgress(value);
    }
    try {
      const credentials = {
        email: formField.email,
        password: formField.password,
      };
    
      const response = await loginUserService({
        callApi,
        credentials,
        onProgress,
      });
      const jwttoken = response.access_token;
      if (!jwttoken) {
        setloginApiError(response.message);
      }
      else{
        if (jwttoken.length) {
          loginUser();
        }
      }

      setIsLoading(false);
      setProgress(0);
    } catch (error: unknown) {
      console.error("Login failed:", error);
      setIsLoading(false);
      setProgress(0);
      setloginApiError(
        "An error occurred during login. Please try again later.",
      );
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormField((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/projects", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <div>
      {isLoading && (
        <>
          <Spinner />

          <div className={ProgressBarModuleCSS.progressBarContainer}>
            <div className={ProgressBarModuleCSS.progressBar}>
              <div
                className={ProgressBarModuleCSS.progress}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </>
      )}
      {loginApiError && <p className="error-message">{loginApiError}</p>}
      <div className={LoginModuleCSS.loginContainer}>
        <h1>Project Management</h1>
        <form method="post" action="" onSubmit={handleLoginUser}>
          <div className={InputTextModuleCSS.inputField}>
            <label htmlFor="email">Email</label>
            <InputText
              inputName="email"
              inputValue={formField.email}
              onInputChange={handleInputChange}
              errorMessage={errors.email}
            />
          </div>

          <div className={InputTextModuleCSS.inputField}>
            <label htmlFor="password">Password</label>
            <InputText
              inputName="password"
              inputValue={formField.password}
              onInputChange={handleInputChange}
              errorMessage={errors.password}
            />
          </div>
          <div className={LoginModuleCSS.loginBtn}>
            <button type="submit" className={GlobalModuleCSS.btn}>
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
