import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Simple approach: just handle the webhook events
        const event = req.body;
        
        if (!event || !event.type) {
            console.log('Invalid webhook body');
            return res.status(400).json({ error: 'Invalid webhook body' });
        }

        console.log('Webhook received:', event.type);

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