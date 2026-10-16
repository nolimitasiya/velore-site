// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { ensureSessionMock } = vi.hoisted(() => ({
  ensureSessionMock: vi.fn(),
}));

vi.mock("@/lib/analytics/clientSession", () => ({
  ensureAnalyticsSession: ensureSessionMock,
}));

import ProductImpressionTracker from "./ProductImpressionTracker";

type ObserverCallback = IntersectionObserverCallback;

let observerCallback: ObserverCallback;
const disconnectMock = vi.fn();
const observeMock = vi.fn();

function makeVisible(ratio = 0.5) {
  act(() => {
    observerCallback(
      [
        {
          isIntersecting: true,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ProductImpressionTracker", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    ensureSessionMock.mockResolvedValue(true);

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: ObserverCallback) {
          observerCallback = callback;
        }

        observe = observeMock;
        disconnect = disconnectMock;
      },
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("records one impression when a card is 50% visible", async () => {
    render(
      <ProductImpressionTracker productId="product-1">
        <div>Dress</div>
      </ProductImpressionTracker>,
    );

    makeVisible();

    await flushPromises();

    expect(ensureSessionMock).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();

    makeVisible();

    await flushPromises();

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("retries session initialization once after two seconds", async () => {
    vi.useFakeTimers();

    ensureSessionMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    render(
      <ProductImpressionTracker productId="product-1">
        <div>Dress</div>
      </ProductImpressionTracker>,
    );

    makeVisible();

    await flushPromises();

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(ensureSessionMock).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not retry after unmounting", async () => {
    vi.useFakeTimers();

    ensureSessionMock.mockResolvedValue(false);

    const view = render(
      <ProductImpressionTracker productId="product-1">
        <div>Dress</div>
      </ProductImpressionTracker>,
    );

    makeVisible();

    await flushPromises();

    view.unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(ensureSessionMock).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not record a card below 50% visibility", async () => {
    render(
      <ProductImpressionTracker productId="product-1">
        <div>Dress</div>
      </ProductImpressionTracker>,
    );

    makeVisible(0.49);

    await flushPromises();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("records a different product when productId changes", async () => {
    const view = render(
      <ProductImpressionTracker productId="product-1">
        <div>Dress One</div>
      </ProductImpressionTracker>,
    );

    makeVisible();
    await flushPromises();

    expect(fetch).toHaveBeenCalledOnce();

    view.rerender(
      <ProductImpressionTracker productId="product-2">
        <div>Dress Two</div>
      </ProductImpressionTracker>,
    );

    makeVisible();
    await flushPromises();

    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not duplicate an impression when tracking metadata changes", async () => {
  const view = render(
    <ProductImpressionTracker
      productId="product-1"
      sectionKey="shop-trendy"
    >
      <div>Dress</div>
    </ProductImpressionTracker>,
  );

  makeVisible();
  await flushPromises();

  expect(fetch).toHaveBeenCalledOnce();

  view.rerender(
    <ProductImpressionTracker
      productId="product-1"
      sectionKey="featured-products"
    >
      <div>Dress</div>
    </ProductImpressionTracker>,
  );

  makeVisible();
  await flushPromises();

  expect(fetch).toHaveBeenCalledOnce();
});
it("records four separate visible product cards", async () => {
  const callbacks: IntersectionObserverCallback[] = [];

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }

      observe = observeMock;
      disconnect = disconnectMock;
    },
  );

  render(
    <>
      {["product-1", "product-2", "product-3", "product-4"].map(
        (productId) => (
          <ProductImpressionTracker
            key={productId}
            productId={productId}
            sectionKey="shop-trendy"
          >
            <div>{productId}</div>
          </ProductImpressionTracker>
        ),
      )}
    </>,
  );

  expect(callbacks).toHaveLength(4);

  act(() => {
    for (const callback of callbacks) {
      callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 0.5,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    }
  });

  await flushPromises();

  expect(fetch).toHaveBeenCalledTimes(4);

  const recordedProductIds = vi
    .mocked(fetch)
    .mock.calls.map(([, options]) => {
      const body = JSON.parse(String(options?.body));
      return body.productId;
    });

  expect(recordedProductIds.sort()).toEqual([
    "product-1",
    "product-2",
    "product-3",
    "product-4",
  ]);
});

it("does not duplicate an impression while metadata changes during a pending request", async () => {
  let resolveRequest!: (value: {
    ok: boolean;
    json: () => Promise<{ ok: boolean }>;
  }) => void;

  const pendingRequest = new Promise<{
    ok: boolean;
    json: () => Promise<{ ok: boolean }>;
  }>((resolve) => {
    resolveRequest = resolve;
  });

  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValue(pendingRequest),
  );

  const view = render(
    <ProductImpressionTracker
      productId="product-1"
      sectionKey="shop-trendy"
    >
      <div>Dress</div>
    </ProductImpressionTracker>,
  );

  makeVisible();
  await flushPromises();

  expect(fetch).toHaveBeenCalledOnce();

  view.rerender(
    <ProductImpressionTracker
      productId="product-1"
      sectionKey="featured-products"
    >
      <div>Dress</div>
    </ProductImpressionTracker>,
  );

  makeVisible();
  await flushPromises();

  resolveRequest({
    ok: true,
    json: async () => ({ ok: true }),
  });

  await flushPromises();

  expect(fetch).toHaveBeenCalledOnce();
});
it("does not lose an impression when metadata changes during session initialization", async () => {
  let resolveSession!: (ready: boolean) => void;

  const pendingSession = new Promise<boolean>((resolve) => {
    resolveSession = resolve;
  });

  ensureSessionMock.mockReturnValueOnce(pendingSession);

  const view = render(
    <ProductImpressionTracker
      productId="product-1"
      sectionKey="shop-trendy"
    >
      <div>Dress</div>
    </ProductImpressionTracker>,
  );

  makeVisible();

  expect(ensureSessionMock).toHaveBeenCalledOnce();

  view.rerender(
    <ProductImpressionTracker
      productId="product-1"
      sectionKey="featured-products"
    >
      <div>Dress</div>
    </ProductImpressionTracker>,
  );

  makeVisible();

  resolveSession(true);

  await flushPromises();

  expect(fetch).toHaveBeenCalledOnce();
});
});
