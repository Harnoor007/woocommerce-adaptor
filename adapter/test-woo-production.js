const { sendOnSearchResponse } = require('./services/searchService');

// Test search request with production mode
const testProductionSearch = async () => {
  try {
    const context = {
      domain: "ONDC:RET10",
      country: "IND",
      city: "std:080",
      action: "search",
      core_version: "1.2.5",
      bap_id: "test-buyer-app.ondc.org",
      bap_uri: "https://test-buyer-app.ondc.org",
      transaction_id: "33333333-4444-5555-6666-777777777777",
      message_id: "cccccccc-dddd-eeee-ffff-gggggggggggg",
      timestamp: "2025-08-14T10:36:28.583Z"
    };

    const message = {
      intent: {
        category: { id: "Apparel" },
        fulfillment: {
          type: "Delivery",
          end: {
            location: {
              gps: "12.9716,77.5946",
              address: {
                area_code: "560001"
              }
            }
          }
        }
      }
    };

    console.log('Testing production search service with WooCommerce...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('WOO_BASE_URL:', process.env.WOO_BASE_URL);
    
    const response = await sendOnSearchResponse(context, message);
    
    console.log('\n=== PRODUCTION SEARCH RESPONSE ===');
    console.log('Items count:', response.message.catalog['bpp/providers'][0].items.length);
    
    if (response.message.catalog['bpp/providers'][0].items.length > 0) {
      console.log('✅ SUCCESS: WooCommerce products are being returned!');
      console.log('\nProducts found:');
      response.message.catalog['bpp/providers'][0].items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.descriptor.name} - ₹${item.price.value}`);
      });
    } else {
      console.log('❌ FAILED: No products returned from WooCommerce');
    }
    
    console.log('\nCategories:', response.message.catalog['bpp/providers'][0].categories.map(c => c.id));
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Run the test
testProductionSearch();
