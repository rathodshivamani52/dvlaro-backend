require('dotenv').config();
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

// The Bridge: This is where your React frontend will send the cart total
app.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body; // Amount comes from the React cart

        const options = {
            amount: amount * 100, // Razorpay needs the amount in paise (multiply by 100)
            currency: "INR",
            receipt: `receipt_order_${Math.floor(Math.random() * 1000)}`,
        };

        const order = await razorpay.orders.create(options);
        
        // Send the secure order ID back to the frontend
        res.json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔥 Dvlaro Live Checkout Server running on port ${PORT}`);
});