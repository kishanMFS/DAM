import { useLocation, useNavigate, useRouteError } from "react-router-dom";
import GlobalModuleCSS from "../styles/Global.module.css";
import { isProd } from "../components/helper";

function RenderError() {
  const location = useLocation();
  const navigate = useNavigate();

  const renderError = JSON.stringify(location.state?.error);
  const routeError = JSON.stringify(useRouteError()) || "";

  function handleButtonClick() {
    navigate("/projects");
  }
  return (
    <div className={GlobalModuleCSS.globalErrorPageContainer}>
      <h3>Something went wrong</h3>
      {!isProd ? <p>{renderError || "unexpected error occured"}</p> : ""}
      {!isProd ? <p>{routeError || "unexpected error occured"}</p> : ""}
      <button className={GlobalModuleCSS.btn} onClick={handleButtonClick}>
        Go Home
      </button>
    </div>
  );
}

export default RenderError;
