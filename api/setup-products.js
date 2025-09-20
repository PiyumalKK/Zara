import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    try {
        // Create the products if they don't exist
        const products = [];

        // Early Access Product
        const basicProduct = await stripe.products.create({
            name: 'Early Access',
            description: 'First to know about new collections, exclusive previews, member-only events',
        });

        const basicPrice = await stripe.prices.create({
            product: basicProduct.id,
            unit_amount: 999, // $9.99
            currency: 'usd',
            recurring: { interval: 'month' },
        });

        // VIP Access Product  
        const premiumProduct = await stripe.products.create({
            name: 'VIP Access',
            description: 'Personal styling sessions, free shipping & returns, limited edition items',
        });

        const premiumPrice = await stripe.prices.create({
            product: premiumProduct.id,
            unit_amount: 1999, // $19.99
            currency: 'usd',
            recurring: { interval: 'month' },
        });

        // Ultimate Product
        const ultimateProduct = await stripe.products.create({
            name: 'Ultimate', 
            description: 'Quarterly style box, priority customer service, invitation-only fashion shows',
        });

        const ultimatePrice = await stripe.prices.create({
            product: ultimateProduct.id,
            unit_amount: 3999, // $39.99
            currency: 'usd',
            recurring: { interval: 'month' },
        });

        return res.status(200).json({
            success: true,
            priceIds: {
                basic: basicPrice.id,
                premium: premiumPrice.id,
                ultimate: ultimatePrice.id
            }
        });

    } catch (error) {
        console.error('Error creating products:', error);
        return res.status(500).json({ 
            error: error.message 
        });
    }
}