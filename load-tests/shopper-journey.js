import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
const BASE_URL = "https://www.veiloraclub.com";
const SECRET = __ENV.LOAD_TEST_SECRET;

if (!SECRET) {
  throw new Error(
    "LOAD_TEST_SECRET is missing. Refusing to run against production."
  );
}

const journeyDuration = new Trend("shopper_journey_duration", true);
const journeyFailures = new Rate("shopper_journey_failed");

const homepageDuration = new Trend("route_homepage_duration", true);
const clothingDuration = new Trend("route_clothing_duration", true);
const newInDuration = new Trend("route_new_in_duration", true);
const saleDuration = new Trend("route_sale_duration", true);
const pdpDuration = new Trend("route_pdp_duration", true);
const shopAtDuration = new Trend("route_shop_at_duration", true);

const routeTrends = {
  homepage: homepageDuration,
  clothing: clothingDuration,
  new_in: newInDuration,
  sale: saleDuration,
  pdp: pdpDuration,
};


const VUS = Number(__ENV.VUS || 1);
const DURATION = __ENV.DURATION || "1m";
if (VUS > 50 && __ENV.ALLOW_HIGH_LOAD !== "yes") {
  throw new Error(
    "Refusing to run more than 50 VUs against production. Set ALLOW_HIGH_LOAD=yes explicitly if this is intentional."
  );
}

export const options = {
  scenarios: {
    shopper_journey: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
      gracefulStop: "30s",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    shopper_journey_failed: ["rate<0.01"],
  },
};
const params = {
  headers: {
    "x-veilora-load-test": SECRET,
  },
};

function getPage(name, path) {
  const response = http.get(`${BASE_URL}${path}`, {
    ...params,
    tags: {
      name,
      type: "shopper_page",
    },
  });

  routeTrends[name].add(response.timings.duration);

  if (response.status !== 200) {
  console.error(
    `[FAIL] ${name} status=${response.status}`
  );
}

  const passed = check(response, {
    [`${name}: HTTP 200`]: (r) => r.status === 200,
  });

  return passed;
}

export default function () {
  const startedAt = Date.now();
  let passed = true;

  passed = getPage("homepage", "/") && passed;
  sleep(1);

  passed =
    getPage(
      "clothing",
      "/categories/clothing"
    ) && passed;
  sleep(1);

  passed =
    getPage(
      "new_in",
      "/new-in"
    ) && passed;
  sleep(1);

  passed =
    getPage(
      "sale",
      "/sale"
    ) && passed;
  sleep(1);

  passed =
    getPage(
      "pdp",
      "/b/veiled/p/asymmetric_textured_top_pomelo_veiled"
    ) && passed;
  sleep(1);

  const outResponse = http.post(
    `${BASE_URL}/api/out/07ab78e9-ac44-44f7-99dc-b72efee893cf?src=PRODUCT&pos=1`,
    null,
    {
      ...params,
      tags: {
        name: "shop_at",
        type: "shopper_action",
      },
    }
  );

  shopAtDuration.add(outResponse.timings.duration);

  if (outResponse.status !== 200) {
  console.error(
    `[FAIL] shop_at status=${outResponse.status}`
  );
}

  const outPassed = check(outResponse, {
    "shop_at: HTTP 200": (r) => r.status === 200,
    "shop_at: destination returned": (r) => {
      try {
        return Boolean(r.json("destinationUrl"));
      } catch {
        return false;
      }
    },
  });

  passed = outPassed && passed;

  journeyDuration.add(Date.now() - startedAt);
  journeyFailures.add(!passed);
}