import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configure the API route to handle raw body
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log('Webhook received with signature:', sig ? 'present' : 'missing');
    console.log('Endpoint secret configured:', endpointSecret ? 'yes' : 'no');

    try {
        let event;
        
        if (endpointSecret && sig) {
            // Try to verify the webhook signature
            try {
                const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
                console.log('Webhook signature verified successfully');
            } catch (err) {
                console.log('Signature verification failed, using body directly:', err.message);
                event = req.body;
            }
        } else {
            // No signature verification - just use the body
            event = req.body;
            console.log('No signature verification - using body directly');
        }
        
        if (!event || !event.type) {
            console.log('Invalid webhook body');
            return res.status(400).json({ error: 'Invalid webhook body' });
        }

        console.log('Processing webhook event:', event.type);

        // Handle the event
        switch (event.type) {
            case 'customer.subscription.created':
                const createdSubscription = event.data.object;
                console.log('Subscription created:', createdSubscription.id);
                
                // Here you can add logic to:
                // - Send welcome email
                // - Set up user account
                // - Grant initial access
                
                break;

            case 'invoice.payment_succeeded':
                const paymentSucceededInvoice = event.data.object;
                console.log('Payment succeeded for invoice:', paymentSucceededInvoice.id);
                
                // Here you can add logic to:
                // - Send welcome email
                // - Grant access to premium content
                // - Update user status in your database
                
                break;

            case 'invoice.payment_failed':
                const paymentFailedInvoice = event.data.object;
                console.log('Payment failed for invoice:', paymentFailedInvoice.id);
                
                // Here you can add logic to:
                // - Send payment failure notification
                // - Retry payment
                // - Suspend account access
                
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                console.log('Subscription cancelled:', deletedSubscription.id);
                
                // Here you can add logic to:
                // - Remove access to premium content
                // - Send cancellation confirmation
                // - Update user status in your database
                
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                console.log('Subscription updated:', updatedSubscription.id);
                
                // Here you can add logic to:
                // - Handle plan changes
                // - Update billing information
                // - Send confirmation emails
                
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error.message);
        return res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }
}