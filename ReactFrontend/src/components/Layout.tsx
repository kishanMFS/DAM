import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import useErrorContext from "../hooks/useError";
import Error from "./Error";
import LayoutModuleCSS from "../styles/Layout.module.css";

function NavBar() {
  const { logoutUser } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState<string>(
    new Date().toLocaleString(),
  );
  const [currentDateTimeRunning, setCurrentDateTimeRunning] =
    useState<boolean>(true);
  const { errorMessage, closeError } = useErrorContext();

  const handleLogout = () => {
    logoutUser();
  };

  useEffect(() => {
    if (!currentDateTimeRunning) {
      return;
    }

    const currentDatetimeIntervalId = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString());
    }, 900);
    return () => clearInterval(currentDatetimeIntervalId);
  }, [currentDateTimeRunning]);

  function handleStartStopCurrentDateTime(hoverState: boolean) {
    setCurrentDateTimeRunning(hoverState);
  }

  return (
    <div className={LayoutModuleCSS.root}>
      <nav className={LayoutModuleCSS.navBar}>
        <div className={LayoutModuleCSS.navLinkList}>
          <NavLink to="/projects" className={LayoutModuleCSS.navItem}>
            Project
          </NavLink>
          <NavLink
            to=""
            className={LayoutModuleCSS.navItem}
            onClick={handleLogout}
          >
            Sign Out
          </NavLink>
        </div>
        <div
          className={LayoutModuleCSS.currentDateTime}
          onMouseEnter={() => handleStartStopCurrentDateTime(false)}
          onMouseLeave={() => handleStartStopCurrentDateTime(true)}
        >
          {currentDateTime}
        </div>
      </nav>
      <div>
        <div>
          <Error message={errorMessage} onClose={closeError} />
        </div>

        <Outlet />
      </div>
    </div>
  );
}

export default NavBar;
