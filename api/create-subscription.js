import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                price: priceId,
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
            return res.status(400).json({
                error: 'Payment failed. Please try again.',
            });
        }

    } catch (error) {
        console.error('Subscription creation error:', error);
        
        return res.status(500).json({
            error: error.message || 'An error occurred while creating the subscription.',
        });
    }
}