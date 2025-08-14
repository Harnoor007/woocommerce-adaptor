# ONDC WooCommerce Adapter Setup Guide

## Overview
This adapter maps WooCommerce products to ONDC (Open Network for Digital Commerce) format for the search and on_search APIs.

## Environment Configuration

Create a `.env` file in the adapter directory with the following variables:

### Server Configuration
```
PORT=3000
NODE_ENV=development  # Set to 'production' for live WooCommerce API
```

### WooCommerce API Configuration
```
WOO_BASE_URL=https://your-woocommerce-store.com
WOO_CONSUMER_KEY=your_consumer_key_here
WOO_CONSUMER_SECRET=your_consumer_secret_here
WOO_API_VERSION=wc/v3
WOO_API_TIMEOUT=30000
```

### ONDC Configuration
```
ONDC_DOMAIN=ONDC:RET10
ONDC_COUNTRY=IND
ONDC_CITY=std:080
ONDC_TYPE=BPP
BPP_ID=woocommerce-adaptor.example.com
BPP_URI=https://woocommerce-adaptor.example.com
```

### Store Information
```
STORE_NAME=WIT's Fashion Hub
STORE_SHORT_DESC=Trendy clothing and lifestyle essentials
STORE_LONG_DESC=We bring you the latest fashion, electronics, and daily needs from trusted brands.
STORE_LOGO=https://yourstore.com/wp-content/uploads/logo.png
STORE_IMAGE=https://yourstore.com/wp-content/uploads/storefront.jpg
STORE_ID=WooCommerce_Store
```

### Store Location
```
STORE_GPS=12.9716,77.5946
STORE_STREET=MG Road
STORE_CITY=Bangalore
STORE_PIN=560001
STORE_STATE=Karnataka
STORE_LOCALITY=MG Road Area
```

### Fulfillment Configuration
```
FULFILLMENT_ID=standard-delivery
FULFILLMENT_TRACKING=false
FULFILLMENT_PROVIDER_NAME=WooCommerce Store Delivery
FULFILLMENT_CONTACT_PHONE=9876543210
FULFILLMENT_CONTACT_EMAIL=delivery@yourstore.com
```

### ONDC Category Mapping
```
ONDC_DEFAULT_CATEGORY=Apparel
```

### Support Information
```
SUPPORT_EMAIL=support@fashionstore.com
```

## Development vs Production Mode

### Development Mode (NODE_ENV=development)
- Uses sample data from `Data/search.json`
- No actual WooCommerce API calls
- Perfect for testing and development

### Production Mode (NODE_ENV=production)
- Fetches real products from WooCommerce API
- Requires valid WooCommerce credentials
- Processes live product data

## Product Mapping

The adapter automatically maps WooCommerce products to ONDC format:

1. **Categories**: Maps WooCommerce categories to ONDC categories (defaults to "Apparel")
2. **Pricing**: Uses WooCommerce price and regular_price fields
3. **Inventory**: Maps stock_quantity to ONDC quantity structure
4. **Images**: Extracts product images from WooCommerce
5. **Attributes**: Converts WooCommerce attributes to ONDC tags
6. **Metadata**: Maps ONDC-specific metadata (returnable, cancellable, etc.)

## ONDC Metadata Fields

Add these custom fields to your WooCommerce products for ONDC compliance:

- `ondc_returnable`: true/false
- `ondc_cancellable`: true/false
- `ondc_cod`: true/false (Cash on Delivery)
- `ondc_time_to_ship`: P1D (ISO 8601 duration)
- `ondc_return_window`: P7D
- `ondc_seller_pickup_return`: true/false
- `ondc_consumer_care`: support@email.com
- `ondc_origin_country`: IND
- `ondc_unit`: piece/kg/liter
- `ondc_unit_value`: 1

## Testing

1. Set `NODE_ENV=development` for testing with sample data
2. The adapter will return 3 sample fashion products
3. All products are mapped to the "Apparel" category
4. Response includes proper ONDC structure with items array populated

## API Endpoints

- `POST /search` - Receives search requests from BAP
- `POST /on_search` - Sends catalog responses (currently logged to console)

## Troubleshooting

### Empty Items Array
- Check if `NODE_ENV` is set correctly
- Verify sample data file exists at `Data/search.json`
- Ensure WooCommerce credentials are valid (production mode)

### Category Mapping Issues
- Verify product categories in WooCommerce
- Check `ONDC_DEFAULT_CATEGORY` setting
- Review category mapping in `models/catalougeModel.js`

### Fulfillment Issues
- Ensure `FULFILLMENT_ID` matches in all configurations
- Verify contact information is properly formatted
- Check location coordinates and address details
