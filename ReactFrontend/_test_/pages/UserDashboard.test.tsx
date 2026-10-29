import {
  act,
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
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

  test("renders dashboard and initial gallery state", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", { name: /user dashboard/i }),
    ).toBeTruthy();
    expect(screen.getByText(/drag & drop files/i)).toBeTruthy();
    expect(screen.getByText(/gallery/i)).toBeTruthy();
    // expect(screen.getByText(/no uploaded files yet/i)).toBeTruthy();
  });

  test("requests fixed-size pages and sends tag search through the assets API", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      createFetchResponse({
        success: true,
        data: [],
        pagination: { total: 20, limit: 8, offset: 0 },
      }),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/assets\?limit=8&offset=0/),
        expect.anything(),
      ),
    );
    expect(await screen.findByText("Showing 1-8 of 20")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next gallery page" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/assets\?limit=8&offset=8/),
        expect.anything(),
      ),
    );

    fireEvent.change(screen.getByPlaceholderText("Search files by tags..."), {
      target: { value: "project tag" },
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/assets\?limit=8&offset=0&search=project\+tag/),
        expect.anything(),
      ),
    );
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

        // store metadata
        if (url.includes("/assets") && init?.method === "POST") {
          uploadCompleted = true;
          return Promise.resolve(createFetchResponse({ success: true }));
        }

        // gallery fetch (GET /assets)
        if (url.includes("/assets") && (!init || init.method === "GET")) {
          if (url.includes("sourceObjectNames=")) {
            return Promise.resolve(
              createFetchResponse({
                success: true,
                data: [
                  {
                    id: "1",
                    storage_key: "obj1",
                    original_name: "test.png",
                    downloadUrl: "https://cdn.example/test.png",
                    mime_type: "image/png",
                    file_size: 1.23,
                    status: "processing",
                  },
                ],
              }),
            );
          }

          if (uploadCompleted) {
            return Promise.resolve(
              createFetchResponse({
                success: true,
                data: [
                  {
                    id: "1",
                    storage_key: "obj1",
                    original_name: "test.png",
                    downloadUrl: "https://cdn.example/test.png",
                    mime_type: "image/png",
                    file_size: 1.23,
                    status: "processing",
                  },
                ],
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
      expect(uploadRequests).toHaveLength(1);
    });
    act(() => {
      uploadRequests[0].upload.onprogress?.({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      } as ProgressEvent);
    });
    await waitFor(() => {
      expect(
        screen.getByRole("progressbar", { name: "Uploading test.png" }),
      ).toHaveAttribute("aria-valuenow", "50");
    });
    const selectedFiles = screen.getByText("Selected Files").parentElement;
    expect(selectedFiles?.querySelector('[role="progressbar"]')).toBeNull();

    expect(uploadRequests[0].open).toHaveBeenCalledWith(
      "PUT",
      "https://upload.example/test.png",
    );
    await act(async () => {
      uploadRequests[0].upload.onprogress?.({
        lengthComputable: true,
        loaded: 100,
        total: 100,
      } as ProgressEvent);
      uploadRequests[0].onload?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/assets"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(
      () => {
        const processingRequests = fetchMock.mock.calls.filter(([input]) =>
          String(input).includes("sourceObjectNames="),
        );
        expect(processingRequests.length).toBeGreaterThanOrEqual(2);
        expect(processingRequests[0][0]).toContain(
          "sourceObjectNames=%5B%22obj1%22%5D",
        );
      },
      { timeout: 5000 },
    );
  });

  test("keeps upload progress visible while its processing row is polled", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input) =>
      Promise.resolve(
        createFetchResponse({
          success: true,
          data: String(input).includes("sourceObjectNames=")
            ? [
                {
                  id: "source-1",
                  storage_key: "video-object",
                  original_name: "video.mp4",
                  downloadUrl: "blob:video",
                  mime_type: "video/mp4",
                  file_size: 12,
                  status: "processing",
                },
              ]
            : [],
        }),
      ),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery
            shouldPoll
            sourceObjectNames={["video-object"]}
            activeUploads={[
              {
                id: "upload-1",
                objectName: "video-object",
                originalName: "video.mp4",
                preview: "blob:video",
                mimeType: "video/mp4",
                size: 12,
                progress: 50,
                uploaded: true,
              },
            ]}
          />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Upload progress")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Uploading video.mp4" }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(
      screen.queryByText(/processing video|upload complete/i),
    ).not.toBeInTheDocument();
  });

  test("renders video progress bar from gallery file progress", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // seed the query cache used by Gallery so it renders deterministically
    queryClient.setQueryData(["getfiles", 0, ""], {
      data: [
        {
          id: "2",
          original_name: "video.mp4",
          downloadUrl: "https://cdn.example/video.mp4",
          file_size: 0,
          parentid: "source-asset-id",
          status: "processing",
          progress: 45,
          tags: { fileSizeMB: 4.56, mimeType: "video/mp4" },
          mime_type: undefined,
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
      '[role="progressbar"]',
    ) as HTMLElement | null;
    expect(progressInner).toBeTruthy();
    expect(progressInner).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("4.56 MB")).toBeInTheDocument();
    expect(screen.getByText("video/mp4")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete video\.mp4/i }),
    ).not.toBeInTheDocument();
  });

  test("updates video variant progress from polling responses without source processing UI", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });
    const source = {
      id: "video-source",
      storage_key: "video-object",
      original_name: "video.mp4",
      downloadUrl: "https://cdn.example/video.mp4",
      mime_type: "video/mp4",
      file_size: 12,
      parentid: null,
      status: "processing" as const,
    };
    const variant = {
      id: "video-variant",
      parentid: source.id,
      original_name: "video - 240.mp4",
      downloadUrl: "https://cdn.example/video-240.mp4",
      mime_type: "video/mp4",
      file_size: 4,
      status: "processing" as const,
      progress: 20,
    };
    let pollCount = 0;
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input) => {
      if (String(input).includes("sourceObjectNames=")) {
        pollCount += 1;
        return Promise.resolve(
          createFetchResponse({
            success: true,
            data: [source, { ...variant, progress: pollCount === 1 ? 40 : 65 }],
          }),
        );
      }

      return Promise.resolve(createFetchResponse({ success: true, data: [] }));
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery shouldPoll sourceObjectNames={[source.storage_key]} />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    await waitFor(
      () =>
        expect(
          screen.getByRole("progressbar", {
            name: "Processing video - 240.mp4",
          }),
        ).toHaveAttribute("aria-valuenow", "65"),
      { timeout: 5000 },
    );
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "Processing video.mp4" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Processing video")).not.toBeInTheDocument();
  });

  test("shows newly polled processing assets before the current gallery page", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });
    const existingFiles = Array.from({ length: 8 }, (_, index) => ({
      id: `existing-${index}`,
      original_name: `existing-${index}.png`,
      downloadUrl: `https://cdn.example/existing-${index}.png`,
      mime_type: "image/png",
      file_size: 1,
      status: "complete" as const,
    }));
    queryClient.setQueryData(["getfiles", 0, ""], {
      data: existingFiles,
      pagination: { total: 8, limit: 8, offset: 0 },
    });

    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes("sourceObjectNames=")) {
        return Promise.resolve(
          createFetchResponse({
            success: true,
            data: [
              {
                id: "new-source",
                storage_key: "new-object",
                original_name: "new-image.png",
                downloadUrl: "https://cdn.example/new-image.png",
                mime_type: "image/png",
                file_size: 1,
                status: "processing",
              },
              {
                id: "new-variant",
                parentid: "new-source",
                original_name: "new-thumbnail.jpg",
                downloadUrl: "https://cdn.example/new-thumbnail.jpg",
                mime_type: "image/jpeg",
                file_size: 1,
                status: "processing",
                progress: 45,
              },
            ],
          }),
        );
      }

      return Promise.resolve(createFetchResponse({ success: true, data: [] }));
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery shouldPoll sourceObjectNames={["new-object"]} />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    const progressBar = await screen.findByRole("progressbar", {
      name: "Processing new-thumbnail.jpg",
    });
    const cards = Array.from(container.querySelectorAll("article"));
    expect(cards.indexOf(progressBar.closest("article")!)).toBeLessThan(8);
    expect(progressBar).toHaveAttribute("aria-valuenow", "45");
  });

  test("opens an accessible image preview modal and restores focus on Escape", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      createFetchResponse({
        success: true,
        data: [
          {
            id: "image-preview",
            original_name: "preview.png",
            downloadUrl: "https://cdn.example/preview.png",
            mime_type: "image/png",
            file_size: 1,
            status: "complete",
          },
        ],
        pagination: { total: 1, limit: 8, offset: 0 },
      }),
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ErrorContextProvider>
          <Gallery />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    const previewButton = await screen.findByRole("button", {
      name: "Preview preview.png",
    });
    previewButton.focus();
    fireEvent.click(previewButton);

    const dialog = screen.getByRole("dialog", { name: "preview.png" });
    expect(
      within(dialog).getByRole("img", { name: "preview.png" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(previewButton).toHaveFocus();
    });
  });

  test("keeps polling while any child asset is processing", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const source = {
      id: "source-id",
      storage_key: "source-object",
      original_name: "video.mp4",
      downloadUrl: "https://cdn.example/video.mp4",
      mime_type: "video/mp4",
      file_size: 12.34,
      parentid: null,
      status: "processing" as const,
      tags: { dimensions: { height: 72 } },
    };
    const processingChild = {
      id: "child-id",
      parentid: source.id,
      original_name: "video - 240.mp4",
      downloadUrl: "https://cdn.example/video-240.mp4",
      mime_type: "video/mp4",
      status: "processing" as const,
      progress: 50,
    };
    let pollCount = 0;
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input) => {
      if (String(input).includes("sourceObjectNames=")) {
        pollCount += 1;
        const responseSource =
          pollCount === 1 ? source : { ...source, status: "complete" as const };
        return Promise.resolve(
          createFetchResponse({
            success: true,
            data: [
              responseSource,
              ...(pollCount === 1
                ? [processingChild]
                : [240, 480, 720].map((height) => ({
                    ...processingChild,
                    id: `child-${height}`,
                    status: "complete" as const,
                    progress: 100,
                    tags: { dimensions: { height } },
                  }))),
            ],
          }),
        );
      }

      return Promise.resolve(createFetchResponse({ success: true, data: [] }));
    });
    queryClient.setQueryData(["getfiles", 0, ""], { data: [source] });
    const onPollingStopped = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery
            shouldPoll
            sourceObjectNames={[source.storage_key]}
            onPollingStopped={onPollingStopped}
          />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(pollCount).toBeGreaterThanOrEqual(2), {
      timeout: 5000,
    });
    await waitFor(() => expect(onPollingStopped).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const processingRequests = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes("sourceObjectNames="),
    );
    expect(processingRequests).toHaveLength(2);
  });

  test("stops polling after successful variants clear their status", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const source = {
      id: "source-id",
      storage_key: "source-object",
      original_name: "video.mp4",
      downloadUrl: "https://cdn.example/video.mp4",
      mime_type: "video/mp4",
      file_size: 12.34,
      parentid: null,
      status: null,
    };
    const variants = [240, 480, 720].map((height) => ({
      id: `variant-${height}`,
      original_name: `video - ${height}.mp4`,
      downloadUrl: `https://cdn.example/video-${height}.mp4`,
      mime_type: "video/mp4",
      file_size: 4.56,
      parentid: source.id,
      status: null,
      tags: { dimensions: { width: height * 2, height } },
    }));
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue(
      createFetchResponse({
        success: true,
        data: [source, ...variants],
      }),
    );
    queryClient.setQueryData(["getfiles", 0, ""], { data: [source] });
    const onPollingStopped = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery
            shouldPoll
            sourceObjectNames={[source.storage_key]}
            onPollingStopped={onPollingStopped}
          />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("video - 240.mp4")).toBeInTheDocument();
    expect(screen.getByText("video - 480.mp4")).toBeInTheDocument();
    expect(screen.getByText("video - 720.mp4")).toBeInTheDocument();
    await waitFor(() => expect(onPollingStopped).toHaveBeenCalledTimes(1));

    await new Promise((resolve) => setTimeout(resolve, 900));
    const processingRequests = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes("sourceObjectNames="),
    );
    expect(processingRequests).toHaveLength(1);
  });

  test("adds newly created processing variants to the gallery while polling", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });
    const source = {
      id: "image-source",
      storage_key: "image-object",
      original_name: "image.png",
      downloadUrl: "https://cdn.example/image.png",
      mime_type: "image/png",
      file_size: 1.2,
      parentid: null,
      status: "processing" as const,
    };
    const variant = {
      id: "image-thumbnail",
      original_name: "image-thumbnail.jpg",
      downloadUrl: "https://cdn.example/image-thumbnail.jpg",
      mime_type: "image/jpeg",
      file_size: 0.1,
      parentid: source.id,
      status: "processing" as const,
      progress: 35,
    };
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((input) => {
      if (String(input).includes("sourceObjectNames=")) {
        return Promise.resolve(
          createFetchResponse({ success: true, data: [source, variant] }),
        );
      }

      return Promise.resolve(
        createFetchResponse({
          success: true,
          data: [source],
          pagination: { total: 1, limit: 8, offset: 0 },
        }),
      );
    });
    queryClient.setQueryData(["getfiles", 0, ""], {
      success: true,
      data: [source],
      pagination: { total: 1, limit: 8, offset: 0 },
    });

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery shouldPoll sourceObjectNames={[source.storage_key]} />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("image-thumbnail.jpg")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Processing image-thumbnail.jpg",
      }),
    ).toHaveAttribute("aria-valuenow", "35");
    unmount();
  });

  test.each([
    ["null parent id", null, "processing"],
    ["completed processing", "source-asset-id", "complete"],
  ])(
    "hides processing progress for %s",
    async (_description, parentid, status) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      queryClient.setQueryData(["getfiles", 0, ""], {
        data: [
          {
            id: "3",
            original_name: "processed.png",
            downloadUrl: "https://cdn.example/processed.png",
            mime_type: "image/png",
            file_size: 1.23,
            parentid,
            status,
            progress: 100,
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

      expect(await screen.findByText("processed.png")).toBeInTheDocument();
      expect(container.querySelector('[role="progressbar"]')).toBeNull();
    },
  );

  test("renders video upload progress in its gallery card", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData(["getfiles", 0, ""], { data: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery
            activeUploads={[
              {
                id: "upload-1",
                objectName: "video-object",
                originalName: "video.mp4",
                preview: "blob:video",
                mimeType: "video/mp4",
                size: 12.34,
                progress: 50,
                uploaded: false,
              },
            ]}
          />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("video.mp4")).toBeInTheDocument();
    expect(screen.getByText("Upload progress")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Uploading video.mp4" }),
    ).toHaveAttribute("aria-valuenow", "50");
  });

  test("admin can confirm deletion and gallery refreshes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const file = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      original_name: "video.mp4",
      downloadUrl: "https://cdn.example/video.mp4",
      mime_type: "video/mp4",
      file_size: 12.34,
      parentid: null,
    };
    queryClient.setQueryData(["getfiles", 0, ""], { data: [file] });
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        createFetchResponse(
          init?.method === "DELETE"
            ? {
                success: true,
                message: "Asset and generated variants deleted successfully",
                data: { deletedCount: 4 },
              }
            : { success: true, data: [] },
        ),
      ),
    );
    const confirmMock = jest.fn(() => true);
    Object.defineProperty(globalThis, "confirm", {
      value: confirmMock,
      writable: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorContextProvider>
          <Gallery isAdmin />
        </ErrorContextProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete video.mp4" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/assets/${file.id}`),
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(screen.queryByText("video.mp4")).not.toBeInTheDocument();
    });
    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("generated variants"),
    );
  });
});
