import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check if products already exist
        const existingProducts = await stripe.products.list({ limit: 10 });
        const existingNames = existingProducts.data.map(p => p.name);

        const products = [];

        // Create Early Access product if it doesn't exist
        if (!existingNames.includes('Early Access')) {
            const basicProduct = await stripe.products.create({
                name: 'Early Access',
                description: 'First to know about new collections, exclusive previews, member-only events',
                type: 'service',
            });

            const basicPrice = await stripe.prices.create({
                product: basicProduct.id,
                unit_amount: 999, // $9.99 in cents
                currency: 'usd',
                recurring: { interval: 'month' },
                nickname: 'early-access-monthly'
            });

            products.push({
                name: 'Early Access',
                productId: basicProduct.id,
                priceId: basicPrice.id,
                price: '$9.99/month'
            });
        }

        // Create VIP Access product if it doesn't exist
        if (!existingNames.includes('VIP Access')) {
            const premiumProduct = await stripe.products.create({
                name: 'VIP Access',
                description: 'Everything in Early Access + Personal styling sessions, free shipping & returns, limited edition items',
                type: 'service',
            });

            const premiumPrice = await stripe.prices.create({
                product: premiumProduct.id,
                unit_amount: 1999, // $19.99 in cents
                currency: 'usd',
                recurring: { interval: 'month' },
                nickname: 'vip-access-monthly'
            });

            products.push({
                name: 'VIP Access',
                productId: premiumProduct.id,
                priceId: premiumPrice.id,
                price: '$19.99/month'
            });
        }

        // Create Ultimate product if it doesn't exist
        if (!existingNames.includes('Ultimate')) {
            const ultimateProduct = await stripe.products.create({
                name: 'Ultimate',
                description: 'Everything in VIP Access + Quarterly style box, priority customer service, invitation-only fashion shows',
                type: 'service',
            });

            const ultimatePrice = await stripe.prices.create({
                product: ultimateProduct.id,
                unit_amount: 3999, // $39.99 in cents
                currency: 'usd',
                recurring: { interval: 'month' },
                nickname: 'ultimate-monthly'
            });

            products.push({
                name: 'Ultimate',
                productId: ultimateProduct.id,
                priceId: ultimatePrice.id,
                price: '$39.99/month'
            });
        }

        // Get all current prices for existing products
        const allPrices = await stripe.prices.list({ limit: 20 });
        const currentPrices = {};

        // Find prices for our products
        for (const price of allPrices.data) {
            const product = await stripe.products.retrieve(price.product);
            if (['Early Access', 'VIP Access', 'Ultimate'].includes(product.name)) {
                currentPrices[product.name] = {
                    productId: product.id,
                    priceId: price.id,
                    amount: price.unit_amount / 100,
                    currency: price.currency.toUpperCase()
                };
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Stripe products setup completed',
            newProducts: products,
            allProducts: currentPrices,
            instructions: {
                message: 'Update your frontend code with these Price IDs:',
                priceIds: {
                    basic: currentPrices['Early Access']?.priceId || 'Not found',
                    premium: currentPrices['VIP Access']?.priceId || 'Not found',
                    ultimate: currentPrices['Ultimate']?.priceId || 'Not found'
                }
            }
        });

    } catch (error) {
        console.error('Error setting up Stripe products:', error);
        return res.status(500).json({
            error: 'Failed to setup Stripe products',
            details: error.message
        });
    }
}