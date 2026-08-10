/**
 * Razorpay Checkout helper.
 *
 * Loads Razorpay Checkout v1 from the official CDN and opens
 * the checkout modal for a server-created Razorpay order.
 */

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number; // paise
  currency?: string;
  order_id: string;

  name?: string;
  description?: string;

  notes?: Record<string, string>;

  theme?: {
    color?: string;
  };

  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };

  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
  };

  handler?: (response: RazorpayResponse) => void | Promise<void>;
};

type RazorpayInstance = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Razorpay checkout is only available in the browser.")
    );
  }

  // Already loaded
  if (window.Razorpay) {
    return Promise.resolve();
  }

  // Loading already in progress
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.Razorpay) {
          resolve();
        } else {
          reject(
            new Error(
              "Razorpay script loaded but window.Razorpay is unavailable."
            )
          );
        }
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load Razorpay checkout script."));
      });

      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(
          new Error(
            "Razorpay checkout script loaded but window.Razorpay is unavailable."
          )
        );
      }
    };

    script.onerror = () => {
      reject(new Error("Failed to load Razorpay checkout script."));
    };

    document.body.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Opens Razorpay Checkout for a server-created order.
 *
 * IMPORTANT:
 * The order must be created by the backend.
 * The frontend must never create the Razorpay order itself.
 */
export async function openRazorpayCheckout(
  options: RazorpayOptions
): Promise<void> {
  if (!options.key) {
    throw new Error("Razorpay key is missing.");
  }

  if (!options.order_id) {
    throw new Error("Razorpay order ID is missing.");
  }

  if (!options.amount || options.amount <= 0) {
    throw new Error("Invalid Razorpay amount.");
  }

  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay is not available in this browser.");
  }

  const razorpay = new window.Razorpay({
    key: options.key,
    amount: options.amount,
    currency: options.currency || "INR",
    order_id: options.order_id,

    name: options.name || "InternArea",
    description: options.description || "Payment",

    notes: options.notes,

    theme: options.theme || {
      color: "#2563eb",
    },

    prefill: options.prefill,

    modal: options.modal,

    handler: options.handler,
  });

  razorpay.open();
}
