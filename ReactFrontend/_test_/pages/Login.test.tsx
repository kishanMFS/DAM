import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";

import authReducer from "../../src/reducers/authReducer";
import { ErrorContextProvider } from "../../src/context/ErrorContext";
import ErrorBoundaryWrapper from "../../src/components/ErrorBoundaryWrapper";
import Login from "../../src/pages/Login";

const createFetchResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as Response;

const renderLogin = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Provider store={store}>
        <ErrorBoundaryWrapper>
          <QueryClientProvider client={queryClient}>
            <ErrorContextProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/user/dashboard"
                  element={<div>User dashboard</div>}
                />
                <Route
                  path="/admin/dashboard"
                  element={<div>Admin dashboard</div>}
                />
              </Routes>
            </ErrorContextProvider>
          </QueryClientProvider>
        </ErrorBoundaryWrapper>
      </Provider>
    </MemoryRouter>,
  );
};

describe("Login page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(globalThis, "fetch", {
      value: jest.fn(),
      writable: true,
    });
  });

  test("renders the login page with the expected default values", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: /dam platform/i })).toBeTruthy();
    expect(
      screen.getByPlaceholderText("admin@dam.com").getAttribute("value"),
    ).toBe("john@mail.com");
    expect(screen.getByPlaceholderText("********").getAttribute("value")).toBe(
      "changeme",
    );
    expect(screen.getByRole("button", { name: /login/i })).toBeTruthy();
  });

  test("submits user@mail.com/changeme and navigates to the user dashboard", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/auth/login")) {
          const body = JSON.parse(init?.body as string);

          if (body.email === "user@mail.com" && body.password === "changeme") {
            return Promise.resolve(
              createFetchResponse({
                success: true,
                role: "USER",
                user: {
                  id: "1",
                  email: "user@mail.com",
                  role: "USER",
                },
              }),
            );
          }

          return Promise.resolve(
            createFetchResponse(
              {
                success: false,
                message: "Invalid credentials",
              },
              false,
              401,
            ),
          );
        }

        if (url.includes("/auth/verify")) {
          return Promise.resolve(
            createFetchResponse({
              email: "user@mail.com",
              role: "USER",
            }),
          );
        }

        return Promise.resolve(
          createFetchResponse({ message: "ok" }, false, 500),
        );
      },
    );

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("admin@dam.com"), {
      target: { value: "user@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "changeme" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "user@mail.com",
            password: "changeme",
          }),
        }),
      );
    });

    expect(await screen.findByText("User dashboard")).toBeTruthy();
  });

  test("shows a login failure message when authentication fails", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/auth/login")) {
        return Promise.reject(new Error("Invalid credentials"));
      }

      if (url.includes("/auth/verify")) {
        return Promise.resolve(
          createFetchResponse({
            email: "user@mail.com",
            role: "USER",
          }),
        );
      }

      return Promise.resolve(
        createFetchResponse({ message: "ok" }, false, 500),
      );
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("admin@dam.com"), {
      target: { value: "john@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "changeme" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText(/login failed/i)).toBeTruthy();
  });
});
