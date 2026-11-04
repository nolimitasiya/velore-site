export type FeedbackShopper =
  | {
      status: "AUTHENTICATED";
      email: string;
      name: string | null;
    }
  | {
      status: "GUEST";
    }
  | {
      status: "UNAVAILABLE";
    };

export async function getFeedbackShopper(): Promise<FeedbackShopper> {
  try {
    const response = await fetch("/api/account/auth/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (response.status === 401) {
      return { status: "GUEST" };
    }

    if (!response.ok) {
      return { status: "UNAVAILABLE" };
    }

    const data: unknown = await response.json();

    if (
      !data ||
      typeof data !== "object" ||
      !("shopper" in data)
    ) {
      return { status: "UNAVAILABLE" };
    }

    const shopper = data.shopper;

    if (
      !shopper ||
      typeof shopper !== "object" ||
      !("email" in shopper) ||
      typeof shopper.email !== "string" ||
      !shopper.email
    ) {
      return { status: "UNAVAILABLE" };
    }

    const firstName =
      "firstName" in shopper &&
      typeof shopper.firstName === "string"
        ? shopper.firstName
        : "";

    const lastName =
      "lastName" in shopper &&
      typeof shopper.lastName === "string"
        ? shopper.lastName
        : "";

    return {
      status: "AUTHENTICATED",
      email: shopper.email,
      name:
        [firstName, lastName].filter(Boolean).join(" ") || null,
    };
  } catch {
    return { status: "UNAVAILABLE" };
  }
}