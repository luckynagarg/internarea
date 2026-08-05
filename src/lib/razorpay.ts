/**
 * Razorpay checkout helper.
 *
 * Loads the Razorpay checkout script (v1) from the official CDN and provides
 * a promise-based wrapper around `window.Razorpay`.
 *
 * Usage:
 *   import { openRazorpayCheckout } from "@/lib/razorpay";
 *   await openRazorpayCheckout({
 *     key: "rzp_test_...",
 *     amount,            // in paise
 *     currency,          // "INR"
 *     order_id,          // razorpay order id
 *     name,              // merchant name
 *     description,
 *     prefill: { name, email },
 *     handler,           // async (response) => void
 *   });
 */

type RazorpayOptions = {
  key: string;
  amount: number; // paise
  currency?: string;
  order_id: string;
  name?: string;
  description?: string;
  notes?: Record<string, string>;
  theme?: { color?: string };
  prefill?: { name?: string; email?: string; contact?: string };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
  };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout is only available in the browser."));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(new Error("Razorpay checkout script loaded but window.Razorpay is not available."));
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
 * Opens the Razorpay checkout modal for a given order.
 * Resolves when the payment is authorized (signature returned via handler).
 */
export async function openRazorpayCheckout(options: RazorpayOptions): Promise<void> {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay is not available in this browser.");
  }

  const rzp = new window.Razorpay({
    key: options.key,
    amount: options.amount,
    currency: options.currency || "INR",
    order_id: options.order_id,
    name: options.name || "InternArea",
    description: options.description || "Subscription",
    notes: options.notes,
    theme: options.theme || { color: "#2563eb" },
    prefill: options.prefill,
    modal: options.modal,
    handler: options.handler,
  });

  rzp.open();
}
