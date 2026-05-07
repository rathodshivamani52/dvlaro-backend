const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Razorpay Cash Register using your secret vault keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------------------------------------------------------
// ROUTE 1: THE MONEY BRIDGE (Frontend calls this to get exact price)
// ------------------------------------------------------------------
app.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body; 

    const options = {
      amount: amount * 100, // Multiplies the frontend price (e.g. 449) into paise for Razorpay
      currency: "INR",
      receipt: `receipt_order_${Math.floor(Math.random() * 1000)}`,
    };

    const order = await razorpay.orders.create(options);
    
    // Send the secure order ID back to the frontend
    res.json({ success: true, order });
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
  }
});

// ------------------------------------------------------------------
// ROUTE 2: THE FACTORY BRIDGE (Tells Qikink to print and ship)
// ------------------------------------------------------------------
app.post('/send-to-factory', async (req, res) => {
  try {
    const paymentData = req.body; 
    
    // STEP 1: The Handshake (Get Qikink VIP Pass)
    const authResponse = await fetch('https://api.qikink.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'ClientId': process.env.QIKINK_CLIENT_ID, // Sourced safely from Render Environment Variables
        'client_secret': process.env.QIKINK_SECRET // Sourced safely from Render Environment Variables
      })
    });
    
    const authData = await authResponse.json();
    const accessToken = authData.Accesstoken;

    // STEP 2: The Order Drop (Tell factory to print and ship)
    const orderPayload = {
      "order_number": paymentData.razorpay_order_id, // Links factory order to the Razorpay receipt
      "qikink_shipping": "1", // 1 = Qikink handles shipping automatically
      "gateway": "Prepaid",   // Tells Qikink you already collected the money
      "total_order_value": "449", // Placeholder, we can make this dynamic later
      "line_items": [
        {
          "sku": "YOUR_QIKINK_SKU_HERE", // ⚠️ Grab this exact text from your Qikink dashboard
          "quantity": "1",
          "price": "449"
        }
      ],
      "shipping_address": {
        // ⚠️ Placeholder: We will connect your frontend form to this later
        "first_name": "Dvlaro",
        "last_name": "Customer",
        "phone": "9999999999",
        "address1": "123 Launch Street",
        "city": "Hyderabad",
        "zip": "500001",
        "province": "TS",
        "country_code": "IN"
      }
    };

    const orderResponse = await fetch('https://api.qikink.com/api/order/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ClientId': process.env.QIKINK_CLIENT_ID,
        'Accesstoken': accessToken
      },
      body: JSON.stringify(orderPayload)
    });

    const orderResult = await orderResponse.json();
    console.log("🏭 Qikink Factory Response:", orderResult);

    res.json({ success: true, message: "Order pushed to Qikink!", factoryData: orderResult });

  } catch (error) {
    console.error("Factory Bridge Error:", error);
    res.status(500).json({ success: false, message: 'Failed to contact factory.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Dvlaro Live Checkout Server running on port ${PORT}`);
});