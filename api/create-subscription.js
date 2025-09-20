import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map of plan names to pricing
const PLAN_CONFIG = {
    'price_basic': { amount: 999, name: 'Early Access' },
    'price_premium': { amount: 1999, name: 'VIP Access' },
    'price_ultimate': { amount: 3999, name: 'Ultimate' }
};

async function getOrCreatePrice(planId) {
    const config = PLAN_CONFIG[planId];
    if (!config) {
        throw new Error(`Invalid plan ID: ${planId}`);
    }

    try {
        // Try to find existing price first
        const existingPrices = await stripe.prices.list({ 
            limit: 100,
            expand: ['data.product']
        });

        for (const price of existingPrices.data) {
            if (price.product.name === config.name && 
                price.unit_amount === config.amount &&
                price.recurring?.interval === 'month') {
                return price.id;
            }
        }

        // If not found, create new product and price
        const product = await stripe.products.create({
            name: config.name,
            description: `${config.name} subscription plan`,
        });

        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: config.amount,
            currency: 'usd',
            recurring: { interval: 'month' },
        });

        return price.id;
    } catch (error) {
        console.error(`Error getting/creating price for ${planId}:`, error);
        throw error;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { paymentMethodId, priceId, email } = req.body;

        if (!paymentMethodId || !priceId || !email) {
            return res.status(400).json({ 
                error: 'Missing required fields: paymentMethodId, priceId, or email' 
            });
        }

        // Create or retrieve customer
        let customer;
        const existingCustomers = await stripe.customers.list({
            email: email,
            limit: 1
        });

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
            
            // Update payment method
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customer.id,
            });
            
            await stripe.customers.update(customer.id, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        } else {
            // Create new customer
            customer = await stripe.customers.create({
                email: email,
                payment_method: paymentMethodId,
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        }

        // Get or create the real price ID
        const realPriceId = await getOrCreatePrice(priceId);

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                price: realPriceId,
            }],
            expand: ['latest_invoice.payment_intent'],
            payment_behavior: 'default_incomplete',
        });

        const invoice = subscription.latest_invoice;
        const paymentIntent = invoice.payment_intent;

        if (paymentIntent.status === 'requires_action') {
            return res.status(200).json({
                status: 'requires_action',
                client_secret: paymentIntent.client_secret,
                subscription_id: subscription.id,
            });
        } else if (paymentIntent.status === 'succeeded') {
            return res.status(200).json({
                status: 'succeeded',
                subscription_id: subscription.id,
                customer_id: customer.id,
            });
        } else {
            console.error('Payment intent status:', paymentIntent.status);
            return res.status(400).json({
                error: 'Payment failed. Please try again.',
                details: `Payment status: ${paymentIntent.status}`,
            });
        }

    } catch (error) {
        console.error('Subscription creation error:', error);
        
        // Provide more detailed error information
        const errorDetails = {
            message: error.message || 'An error occurred while creating the subscription.',
            type: error.type || 'unknown_error',
            code: error.code || 'unknown_code'
        };
        
        return res.status(500).json({
            error: errorDetails.message,
            details: errorDetails,
        });
    }
}