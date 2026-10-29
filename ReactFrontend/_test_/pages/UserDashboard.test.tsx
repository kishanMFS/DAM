import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import "@testing-library/jest-dom";

jest.setTimeout(20000);

import authReducer from "../../src/reducers/authReducer";
import { ErrorContextProvider } from "../../src/context/ErrorContext";
import ErrorBoundaryWrapper from "../../src/components/ErrorBoundaryWrapper";
import UserDashboard from "../../src/pages/UserDashboard";
import Gallery from "../../src/components/Gallery";
import Layout from "../../src/components/Layout";

const createFetchResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

const uploadRequests: MockUploadRequest[] = [];

class MockUploadRequest {
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  status = 200;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open = jest.fn();
  setRequestHeader = jest.fn();
  send = jest.fn();

  constructor() {
    uploadRequests.push(this);
  }
}

const renderDashboard = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
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
    localStorage.removeItem("dam-theme");
    document.documentElement.classList.remove("dark");
    uploadRequests.length = 0;
    Object.defineProperty(globalThis, "fetch", {
      value: jest.fn(),
      writable: true,
    });
    Object.defineProperty(globalThis, "XMLHttpRequest", {
      value: jest.fn(() => new MockUploadRequest()),
      writable: true,
    });
    globalThis.URL.createObjectURL = jest.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = jest.fn();
  });

  test("persists dark mode preference and toggles the root theme class", async () => {
    localStorage.setItem("dam-theme", "dark");
    render(
      <MemoryRouter>
        <Provider store={configureStore({ reducer: { auth: authReducer } })}>
          <QueryClientProvider client={new QueryClient()}>
            <ErrorContextProvider>
              <Layout />
            </ErrorContextProvider>
          </QueryClientProvider>
        </Provider>
      </MemoryRouter>,
    );

    expect(document.documentElement).toHaveClass("dark");
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );
    expect(localStorage.getItem("dam-theme")).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    await waitFor(() => expect(localStorage.getItem("dam-theme")).toBe("dark"));
    expect(document.documentElement).toHaveClass("dark");
  });
  test("renders dashboard and initial gallery state", () => {
    renderDashboard();
    expect(
      screen.getByRole("heading", { name: /user dashboard/i }),
    ).toBeTruthy();
    expect(screen.getByText(/drag & drop files/i)).toBeTruthy();
    expect(screen.getByText(/gallery/i)).toBeTruthy();
  });

  test("uploads a file and displays live upload progress", async () => {
    let metadataStored = false;
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
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
      if (url.includes("/assets") && init?.method === "POST") {
        metadataStored = true;
        return Promise.resolve(createFetchResponse({ success: true }));
      }
      if (url.includes("sourceObjectNames=")) {
        return Promise.resolve(
          createFetchResponse({ success: true, data: [] }),
        );
      }
      return Promise.resolve(
        createFetchResponse({
          success: true,
          data: metadataStored
            ? [
                {
                  id: "source-1",
                  storage_key: "obj1",
                  original_name: "test.png",
                  downloadUrl: "https://cdn.example/test.png",
                  mime_type: "image/png",
                  file_size: 1,
                  status: "processing",
                },
              ]
            : [],
          pagination: { total: metadataStored ? 1 : 0, limit: 8, offset: 0 },
        }),
      );
    });

    const { container } = renderDashboard();
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["image"], "test.png", { type: "image/png" })],
      },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: /upload files/i }),
    );
    await waitFor(() => expect(uploadRequests).toHaveLength(1));

    act(() =>
      uploadRequests[0].upload.onprogress?.({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      } as ProgressEvent),
    );
    expect(
      await screen.findByRole("progressbar", { name: "Uploading test.png" }),
    ).toHaveAttribute("aria-valuenow", "50");

    await act(async () => {
      uploadRequests[0].onload?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(metadataStored).toBe(true));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("sourceObjectNames=%5B%22obj1%22%5D"),
        expect.anything(),
      ),
    );
  });

  test("resumes polling after reload when a source row is processing", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const source = {
      id: "source-after-reload",
      storage_key: "persisted-video-object",
      original_name: "persisted-video.mp4",
      downloadUrl: "https://cdn.example/persisted-video.mp4",
      mime_type: "video/mp4",
      file_size: 10,
      parentid: null,
      status: "processing" as const,
      tags: { dimensions: { height: 720 } },
    };
    const variants = [240, 480, 720].map((height) => ({
      id: `variant-${height}`,
      original_name: `persisted-video-${height}.mp4`,
      downloadUrl: `https://cdn.example/persisted-video-${height}.mp4`,
      mime_type: "video/mp4",
      file_size: 3,
      parentid: source.id,
      status: "complete" as const,
      progress: 100,
      tags: { dimensions: { height } },
    }));
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input) =>
      Promise.resolve(
        createFetchResponse({
          success: true,
          data: String(input).includes("sourceObjectNames=")
            ? [{ ...source, status: "complete" }, ...variants]
            : [source],
          pagination: { total: 1, limit: 8, offset: 0 },
        }),
      ),
    );
    queryClient.setQueryData(["getfiles", 0, ""], {
      success: true,
      data: [source],
      pagination: { total: 1, limit: 8, offset: 0 },
    });
    const onPollingStopped = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery onPollingStopped={onPollingStopped} />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "sourceObjectNames=%5B%22persisted-video-object%22%5D",
        ),
        expect.anything(),
      ),
    );
    await waitFor(() => expect(onPollingStopped).toHaveBeenCalledTimes(1));
  });

  test("shows complete converted variants while polling", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const source = {
      id: "src",
      storage_key: "object",
      original_name: "clip.mp4",
      downloadUrl: "https://cdn.example/clip.mp4",
      mime_type: "video/mp4",
      file_size: 10,
      parentid: null,
      status: "complete",
      tags: { dimensions: { height: 720 } },
    };
    const variants = [240, 480, 720].map((height) => ({
      id: `v${height}`,
      original_name: `clip-${height}.mp4`,
      downloadUrl: `https://cdn.example/${height}.mp4`,
      mime_type: "video/mp4",
      file_size: 3,
      parentid: source.id,
      status: "complete",
      progress: 100,
      tags: { dimensions: { height } },
    }));
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      createFetchResponse({ success: true, data: [source, ...variants] }),
    );
    queryClient.setQueryData(["getfiles", 0, ""], {
      success: true,
      data: [source],
    });
    const stopped = jest.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery
            shouldPoll
            sourceObjectNames={[source.storage_key]}
            onPollingStopped={stopped}
          />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("clip-240.mp4")).toBeInTheDocument();
    await waitFor(() => expect(stopped).toHaveBeenCalledTimes(1));
  });
});
