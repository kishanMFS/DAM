import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import "@testing-library/jest-dom";

// Allow longer time for network/polling in these integration-style tests
jest.setTimeout(20000);

import authReducer from "../../src/reducers/authReducer";
import { ErrorContextProvider } from "../../src/context/ErrorContext";
import ErrorBoundaryWrapper from "../../src/components/ErrorBoundaryWrapper";
import UserDashboard from "../../src/pages/UserDashboard";
import Gallery from "../../src/components/Gallery";

const createFetchResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as unknown as Response;

const renderDashboard = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={["/user/dashboard"]}>
      <Provider store={store}>
        <ErrorBoundaryWrapper>
          <QueryClientProvider client={queryClient}>
            <ErrorContextProvider>
              <Routes>
                <Route path="/user/dashboard" element={<UserDashboard />} />
              </Routes>
            </ErrorContextProvider>
          </QueryClientProvider>
        </ErrorBoundaryWrapper>
      </Provider>
    </MemoryRouter>,
  );
};

describe("UserDashboard test cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(globalThis, "fetch", {
      value: jest.fn(),
      writable: true,
    });

    globalThis.URL.createObjectURL = jest.fn(() => "blob:mock");

    globalThis.URL.revokeObjectURL = jest.fn();
  });

  test("renders dashboard and initial gallery state", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", { name: /user dashboard/i }),
    ).toBeTruthy();
    expect(screen.getByText(/drag & drop files/i)).toBeTruthy();
    expect(screen.getByText(/gallery/i)).toBeTruthy();
    // expect(screen.getByText(/no uploaded files yet/i)).toBeTruthy();
  });

  test("selects a file and shows selected files + upload button", async () => {
    const { container } = renderDashboard();

    const file = new File(["hello"], "test.png", { type: "image/png" });

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("Selected Files")).toBeTruthy();
    expect(screen.getByText("test.png")).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload files/i })).toBeTruthy();
  });

  test("uploads a file (presigned flow) and verifies API interactions", async () => {
    let uploadCompleted = false;

    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        // presigned url request
        if (url.includes("/assets/presigned-url")) {
          return Promise.resolve(
            createFetchResponse({
              data: [
                {
                  objectName: "obj1",
                  presignedUrl: "https://upload.example/test.png",
                },
              ],
            }),
          );
        }

        // PUT to presigned url
        if (url.startsWith("https://upload.example")) {
          return Promise.resolve(createFetchResponse({}, true, 200));
        }

        // store metadata
        if (url.includes("/assets") && init?.method === "POST") {
          uploadCompleted = true;
          return Promise.resolve(createFetchResponse({ success: true }));
        }

        // gallery fetch (GET /assets)
        if (url.includes("/assets") && (!init || init.method === "GET")) {
          if (uploadCompleted) {
            return Promise.resolve(
              createFetchResponse({
                files: [
                  {
                    id: "1",
                    original_name: "test.png",
                    downloadUrl: "https://cdn.example/test.png",
                    mime_type: "image/png",
                    file_size: 1.23,
                    status: "complete",
                  },
                ],
              }),
            );
          }

          return Promise.resolve(createFetchResponse({ files: [] }));
        }

        return Promise.resolve(createFetchResponse({}));
      },
    );

    const { container } = renderDashboard();

    const file = new File(["imgcontent"], "test.png", { type: "image/png" });
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // click upload
    fireEvent.click(
      await screen.findByRole("button", { name: /upload files/i }),
    );

    // expect presigned url requested and upload to presigned url and metadata stored
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/assets/presigned-url"),
        expect.anything(),
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://upload.example/test.png",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/assets"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    // verify the upload-related API interactions occurred (gallery polling covered elsewhere)
    expect(fetchMock).toHaveBeenCalled();
  });

  test("renders video progress bar from gallery file progress", async () => {
    // const Gallery = Gallery;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // seed the query cache used by Gallery so it renders deterministically
    queryClient.setQueryData(["getfiles"], {
      data: [
        {
          id: "2",
          original_name: "video.mp4",
          downloadUrl: "https://cdn.example/video.mp4",
          mime_type: "video/mp4",
          file_size: 12.34,
          status: "processing",
          progress: 45,
        },
      ],
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    // await waitFor(() => expect(screen.getByText("video.mp4")).toBeTruthy());
    expect(await screen.findByText("video.mp4")).toBeTruthy();

    const progressInner = container.querySelector(
      "div.h-full.bg-blue-500",
    ) as HTMLElement | null;
    expect(progressInner).toBeTruthy();
    if (progressInner)
      expect(progressInner.getAttribute("style") || "").toContain("width: 45%");
  });
});
