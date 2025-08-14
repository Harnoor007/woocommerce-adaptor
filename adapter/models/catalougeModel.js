require("dotenv").config();

/** ===== ONDC Category Mapping (RET10 – Fashion/Apparel defaults) ===== */
const DEFAULT_CATEGORY = process.env.ONDC_DEFAULT_CATEGORY || "Apparel";

const ONDC_CATEGORY_MAP = {
  // Fashion first
  "Fashion": "Apparel",
  "Clothing": "Apparel",
  "Men": "Apparel",
  "Women": "Apparel",
  "Men's Clothing": "Apparel",
  "Women's Clothing": "Apparel",
  "T-Shirts": "Apparel",
  "Shirts": "Apparel",
  "Jeans": "Apparel",
  "Tops": "Apparel",
  "Dresses": "Apparel",
  "Footwear": "Footwear",
  "Shoes": "Footwear",
  "Sneakers": "Footwear",
  "Sandals": "Footwear",
  "Accessories": "Apparel",

  // Other verticals (kept for completeness; we still default to Apparel)
  "Groceries": "Grocery",
  "Grocery": "Grocery",
  "Fruits": "Grocery",
  "Vegetables": "Grocery",
  "Dairy": "Grocery",
  "Bakery": "Grocery",
  "Beverages": "Grocery",
  "Staples": "Grocery",
  "Snacks": "Grocery",
  "Packaged Food": "Grocery",
  "Personal Care": "FMCG",
  "Household Supplies": "FMCG",
  "Electronics": "Electronics",
  "Mobiles": "Electronics",
  "Laptops": "Electronics",
  "Books": "Books",
  "Home": "Home",
  "Beauty": "Beauty",
  "Stationery": "Stationery"
};

/** Helpers */
const getMeta = (product, key, defaultValue) => {
  const meta = product?.meta_data?.find(m => m?.key === key);
  return meta?.value ?? defaultValue;
};

const stripHTML = str => (str ? str.replace(/<\/?[^>]+(>|$)/g, "").trim() : "");

const normalizePhone = raw => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "0000000000";
  return digits.length <= 11 ? digits : digits.slice(-10);
};

/** ISO-3166-1 alpha-3 sanitizer */
const sanitizeAlpha3 = val => {
  const v = String(val || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(v) ? v : "IND";
};

/** Pick ONDC category safely for a Woo category name */
const mapWooCatToOndc = (name) => {
  if (!name) return DEFAULT_CATEGORY;
  return ONDC_CATEGORY_MAP[name] || DEFAULT_CATEGORY;
};

/** Build provider.categories from products (domain-safe) */
const extractCategories = (products) => {
  const found = new Map();
  (products || []).forEach(p => {
    const first = p?.categories?.[0]?.name;
    const id = mapWooCatToOndc(first);
    if (!found.has(id)) found.set(id, { id, descriptor: { name: id } });
  });

  if (found.size === 0) {
    found.set(DEFAULT_CATEGORY, { id: DEFAULT_CATEGORY, descriptor: { name: DEFAULT_CATEGORY } });
  }
  return Array.from(found.values());
};

/** Provider tags:
 * - serviceability: one tag per category, type=radius (val/unit)
 * - timing: Delivery, Self-Pickup, Order (day_from/day_to/time_from/time_to)
 */
const buildProviderTags = (categories, locationId) => {
  const serviceability = (categories || []).map(cat => ({
    code: "serviceability",
    list: [
      { code: "location", value: locationId },
      { code: "category", value: cat.id },
      { code: "type", value: "radius" }, // <-- FIX: not "Delivery"
      { code: "val", value: "10" },
      { code: "unit", value: "km" }
    ]
  }));

  const timing = [
    {
      code: "timing",
      list: [
        { code: "type", value: "Delivery" },
        { code: "day_from", value: "1" },
        { code: "day_to", value: "7" },
        { code: "time_from", value: "0900" },
        { code: "time_to", value: "2100" }
      ]
    },
    {
      code: "timing",
      list: [
        { code: "type", value: "Self-Pickup" }, // <-- present to satisfy validator
        { code: "day_from", value: "1" },
        { code: "day_to", value: "7" },
        { code: "time_from", value: "0900" },
        { code: "time_to", value: "2100" }
      ]
    },
    {
      code: "timing",
      list: [
        { code: "type", value: "Order" },
        { code: "day_from", value: "1" },
        { code: "day_to", value: "7" },
        { code: "time_from", value: "0000" },
        { code: "time_to", value: "2359" }
      ]
    }
  ];

  return [...serviceability, ...timing];
};

/** Main mapper */
const mapToONDC = (products) => {
  const locationId = "store-location";
  const categories = extractCategories(products);

  return {
    "bpp/descriptor": {
      name: process.env.STORE_NAME || "WIT's Fashion Hub",
      short_desc: process.env.STORE_SHORT_DESC || "Trendy clothing and lifestyle essentials",
      symbol: process.env.STORE_LOGO || "https://yourstore.com/wp-content/uploads/logo.png",
      images: [process.env.STORE_IMAGE || "https://yourstore.com/wp-content/uploads/storefront.jpg"].filter(Boolean)
    },
    "bpp/providers": [
      {
        id: process.env.STORE_ID || "WooCommerce_Store",
        descriptor: {
          name: process.env.STORE_NAME || "WIT's Fashion Hub",
          short_desc: process.env.STORE_SHORT_DESC || "Trendy clothing and lifestyle essentials",
          symbol: process.env.STORE_LOGO || "https://yourstore.com/wp-content/uploads/logo.png",
          long_desc: process.env.STORE_LONG_DESC || "We bring you the latest fashion, electronics, and daily needs from trusted brands.",
          images: [process.env.STORE_IMAGE || "https://yourstore.com/wp-content/uploads/storefront.jpg"].filter(Boolean)
        },
        tags: buildProviderTags(categories, locationId),
        categories,
        items: (products || []).map(product => {
          // 1) Category must exist in provider.categories
          let category_id = DEFAULT_CATEGORY;
          if (product?.categories?.length) {
            const mapped = mapWooCatToOndc(product.categories[0]?.name);
            // Ensure it exists in provider.categories; if not, fall back to DEFAULT_CATEGORY
            category_id = categories.find(c => c.id === mapped)?.id || DEFAULT_CATEGORY;
          } else {
            category_id = categories[0]?.id || DEFAULT_CATEGORY;
          }

          // 2) Rating
          const rating = product?.average_rating
            ? String(Math.max(1, Math.min(5, Math.round(Number(product.average_rating) || 5))))
            : "5";

          // 3) Quantity
          const stock = (typeof product?.stock_quantity === "number")
            ? String(product.stock_quantity)
            : (product?.stock_status === "outofstock" ? "0" : "99");

          const quantity = {
            available: { count: stock },
            unitized: {
              measure: {
                unit: getMeta(product, "ondc_unit", product?.unit || "unit"),
                value: getMeta(product, "ondc_unit_value", "1")
              }
            },
            maximum: { count: stock }
          };

          // 4) Images
          const images = Array.isArray(product?.images)
            ? product.images.map(img => img?.src).filter(Boolean)
            : [];

          // 5) Attributes
          const attributes = Array.isArray(product?.attributes)
            ? product.attributes
                .map(attr => ({
                  code: attr?.name || "",
                  value: Array.isArray(attr?.options) ? attr.options.join(", ") : (attr?.option || "")
                }))
                .filter(x => x.code)
            : [];

          // 6) Origin (to avoid ISO error, send only country in 'origin' tag)
          const originCountry = sanitizeAlpha3(getMeta(product, "ondc_origin_country", "IND"));

          // 7) Descriptor.code => 1:EAN (13 digits)
          let ean = product?.sku || "";
          ean = /^\d{13}$/.test(ean) ? ean : "0000000000000";
          const descriptorCode = `1:${ean}`;

          // 8) Non-empty descriptions
          const shortDesc = stripHTML(product?.short_description) || "No short description available";
          const longDesc = stripHTML(product?.description) || "No long description available";

          return {
            id: String(product?.id || ""),
            descriptor: {
              code: descriptorCode,
              name: product?.name || "",
              short_desc: shortDesc,
              long_desc: longDesc,
              images,
              symbol: images[0] || process.env.STORE_LOGO
            },
            price: {
              currency: product?.currency || getMeta(product, "ondc_currency", "INR"),
              value: String(product?.price || product?.regular_price || "0"),
              maximum_value: String(product?.regular_price || product?.price || "0")
            },
            category_id,                         // <-- Must match provider.categories[].id
            fulfillment_id: process.env.FULFILLMENT_ID || "standard-delivery", // "standard-delivery"
            location_id: locationId,

            "@ondc/org/returnable": !!getMeta(product, "ondc_returnable", true),
            "@ondc/org/cancellable": !!getMeta(product, "ondc_cancellable", true),
            "@ondc/org/available_on_cod": !!getMeta(product, "ondc_cod", true),
            "@ondc/org/time_to_ship": String(getMeta(product, "ondc_time_to_ship", "P1D")),
            "@ondc/org/seller_pickup_return": !!getMeta(product, "ondc_seller_pickup_return", false),
            "@ondc/org/return_window": String(getMeta(product, "ondc_return_window", "P7D")),
            "@ondc/org/contact_details_consumer_care": String(getMeta(product, "ondc_consumer_care", "support@fashionstore.com")),

            rating,
            time: { label: "enable", timestamp: new Date().toISOString() },
            quantity,

            // 9) Item tags
            tags: [
              { code: "type", list: [{ code: "type", value: product?.type || "simple" }] },
              { code: "attributes", list: attributes },
              {
                code: "origin",
                list: [
                  // Keep ONLY country here to satisfy strict ISO validator
                  { code: "country", value: originCountry }
                ]
              }
            ]
          };
        }),
        fulfillments: [
          {
            id: process.env.FULFILLMENT_ID || "standard-delivery",
            type: "Delivery",
            tracking: String(process.env.FULFILLMENT_TRACKING || "false") === "true",
            provider_name: process.env.FULFILLMENT_PROVIDER_NAME || "WooCommerce Store Delivery",
            rating: 5,
            contact: {
              phone: normalizePhone(process.env.FULFILLMENT_CONTACT_PHONE || "9876543210"),
              email: process.env.FULFILLMENT_CONTACT_EMAIL || "delivery@yourstore.com"
            }
          },
          {
            id: "self-pickup",
            type: "Self-Pickup",
            tracking: false,
            provider_name: process.env.FULFILLMENT_PROVIDER_NAME || "WooCommerce Store Delivery",
            rating: 5,
            contact: {
              phone: normalizePhone(process.env.FULFILLMENT_CONTACT_PHONE || "9876543210"),
              email: process.env.FULFILLMENT_CONTACT_EMAIL || "delivery@yourstore.com"
            }
          }
        ],
        locations: [
          {
            id: locationId,
            gps: process.env.STORE_GPS || "12.9716,77.5946",
            address: {
              street: process.env.STORE_STREET || "MG Road",
              city: process.env.STORE_CITY || "Bangalore",
              area_code: process.env.STORE_PIN || "560001",
              state: process.env.STORE_STATE || "Karnataka",
              locality: process.env.STORE_LOCALITY || "MG Road Area"
            },
            circle: {
              gps: process.env.STORE_GPS || "12.9716,77.5946",
              radius: { unit: "km", value: "10" }
            },
            time: {
              label: "open",
              timestamp: new Date().toISOString(),
              days: "1,2,3,4,5,6,7",
              schedule: {
                holidays: ["2025-08-15"],
                frequency: "PT24H",
                times: ["0000", "2359"]
              }
            }
          }
        ]
      }
    ],
    "bpp/fulfillments": [
      { id: process.env.FULFILLMENT_ID || "standard-delivery", type: "Delivery" },
      { id: "self-pickup", type: "Self-Pickup" }
    ],
    "exp": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
};

module.exports = { mapToONDC, getMeta };
