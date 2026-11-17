// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import MarketingPreferences from "./MarketingPreferences";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function response(
  data: unknown,
  status = 200
): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function preferences(
  marketingConsent: boolean,
  eligibleToOptIn = true
) {
  return {
    marketingConsent,
    eligibleToOptIn,
  };
}

function mockFetch(
  initialConsent: boolean,
  eligibleToOptIn = true
) {
  const fetchMock = vi.fn();

  fetchMock.mockResolvedValueOnce(
    response(
      preferences(initialConsent, eligibleToOptIn)
    )
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

async function getToggle() {
  return (await screen.findByRole("checkbox", {
    name: /marketing updates/i,
  })) as HTMLInputElement;
}

describe("MarketingPreferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads an adult shopper's existing preference", async () => {
    const fetchMock = mockFetch(true);

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    expect(toggle.checked).toBe(true);
    expect(toggle.disabled).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/marketing-preferences",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
    );
  });

  it("displays an unchecked toggle when consent is off", async () => {
    mockFetch(false);

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    expect(toggle.checked).toBe(false);
    expect(toggle.disabled).toBe(false);
  });

  it("prevents under-18 shoppers from opting in", async () => {
    const fetchMock = mockFetch(false, false);

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    expect(toggle.checked).toBe(false);
    expect(toggle.disabled).toBe(true);

    expect(
      screen.getByText(/aged 18 or over/i)
    ).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows an eligible adult to enable marketing", async () => {
    const fetchMock = mockFetch(false);

    fetchMock.mockResolvedValueOnce(
      response({
        ok: true,
        marketingConsent: true,
      })
    );

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.checked).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/account/marketing-preferences",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          marketingConsent: true,
        }),
      })
    );

    expect(
      screen.getByText(/preferences have been saved/i)
    ).toBeTruthy();
  });

  it("allows a shopper to withdraw consent", async () => {
    const fetchMock = mockFetch(true);

    fetchMock.mockResolvedValueOnce(
      response({
        ok: true,
        marketingConsent: false,
      })
    );

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.checked).toBe(false);
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/account/marketing-preferences",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          marketingConsent: false,
        }),
      })
    );

    expect(
      screen.getByText(/You've opted out of Veilora Club marketing updates/i)
    ).toBeTruthy();
  });

  it("prevents overlapping save requests", async () => {
    const fetchMock = mockFetch(false);

    let resolveSave!: (value: MockResponse) => void;

    const pendingSave = new Promise<MockResponse>(
      (resolve) => {
        resolveSave = resolve;
      }
    );

    fetchMock.mockReturnValueOnce(pendingSave);

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    fireEvent.click(toggle);

    expect(toggle.disabled).toBe(true);

    fireEvent.click(toggle);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSave(
        response({
          ok: true,
          marketingConsent: true,
        })
      );

      await pendingSave;
    });

    await waitFor(() => {
      expect(toggle.checked).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("locks the toggle after a network failure", async () => {
    const fetchMock = mockFetch(false);

    fetchMock.mockRejectedValueOnce(
      new Error("MOCK_NETWORK_FAILURE")
    );

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.disabled).toBe(true);
    });

    expect(toggle.checked).toBe(false);

    expect(
      screen.getByRole("alert").textContent
    ).toMatch(/couldn't confirm/i);

    expect(
      screen.queryByText(/preferences have been saved/i)
    ).toBeNull();

    fireEvent.click(toggle);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles HTTP 409 without claiming the preference was saved", async () => {
    const fetchMock = mockFetch(false);

    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: "Transaction conflict",
        },
        409
      )
    );

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.disabled).toBe(true);
    });

    expect(toggle.checked).toBe(false);

    expect(
      screen.getByRole("alert").textContent
    ).toMatch(/another update was in progress/i);

    expect(
      screen.queryByText(/preferences have been saved/i)
    ).toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an unexpected successful response", async () => {
    const fetchMock = mockFetch(false);

    fetchMock.mockResolvedValueOnce(
      response({
        ok: true,
        marketingConsent: false,
      })
    );

    render(<MarketingPreferences />);

    const toggle = await getToggle();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.disabled).toBe(true);
    });

    expect(toggle.checked).toBe(false);

    expect(
      screen.getByRole("alert").textContent
    ).toMatch(/couldn't confirm/i);

    expect(
      screen.queryByText(/preferences have been saved/i)
    ).toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});