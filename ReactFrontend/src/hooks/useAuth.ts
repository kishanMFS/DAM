import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store/authStore";
import { setAuthState } from "../reducers/authReducer";
import { loginUser, logoutUser } from "../reducers/authReducer";
import authService from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { isLoggedIn, user, role } = useSelector(
    (state: RootState) => state.auth,
  );

  const verifyTokenQuery = useQuery({
    queryKey: ["verifyToken"],
    queryFn: () => authService.verifyToken(),
    staleTime: Infinity, // Don't consider it stale
    gcTime: 0, // Don't cache in garbage collector
    retry: 1,
    enabled: !isLoggedIn, // Only run if not already logged in
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      authService.login(credentials),
    onSuccess: (response) => {
      if (response.success) {
        dispatch(
          loginUser({
            user: response.user.email,
            role: response.user.role as "ADMIN" | "USER",
          }),
        );
        localStorage.setItem("role", response.user.role);
        if (response.user.role === "ADMIN") {
          navigate("/admin/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      }
    },
    onError: (error) => {
      if (error instanceof Error) {
        console.error("Login error:", error);
      }
    },
  });

  const handleLoginUser = (email: string, password: string) => {
    loginMutation.mutate({ email, password });
  };

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      dispatch(logoutUser());
      navigate("/login");
    },
    onError: (error) => {
      console.error("Error logging out:", error);
      dispatch(logoutUser());
      navigate("/login");
    },
  });

  const handleLogoutUser = async () => {
    logoutMutation.mutate();
  };

  // Handle verify token query results
  useEffect(() => {
    if (verifyTokenQuery.isSuccess && verifyTokenQuery.data && !isLoggedIn) {
      const userInfo = verifyTokenQuery.data;
      dispatch(
        setAuthState({
          isLoggedIn: true,
          user: userInfo.email,
          role: userInfo.role,
        }),
      );
    } else if (verifyTokenQuery.isError && !isLoggedIn) {
      dispatch(
        setAuthState({
          isLoggedIn: false,
          user: null,
          role: null,
        }),
      );
    }
  }, [
    verifyTokenQuery.isSuccess,
    verifyTokenQuery.isError,
    verifyTokenQuery.data,
    isLoggedIn,
    dispatch,
  ]);

  return {
    isLoggedIn,
    user,
    role,
    loginUser: handleLoginUser,
    logoutUser: handleLogoutUser,
    loginMutation,
    logoutMutation,
    isVerifying: verifyTokenQuery.isLoading || verifyTokenQuery.isPending,
    tokenVerificationFailed: verifyTokenQuery.isError,
  };
}

export default useAuth;
